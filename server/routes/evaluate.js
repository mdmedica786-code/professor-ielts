const express = require("express");
const openaiService = require("../services/openaiService");
const { scorePronunciation } = require("../services/pronunciationService");
const { getMimeType } = require("../utils/audioUtils");

const router = express.Router();

// Audio upload + validation are handled upstream in index.js
// (upload.single("audio") -> validateAudio) before this router runs.

// Acoustic pronunciation scoring is DISABLED. The local GOP scorer was
// unreliable — it used approximate (even-split) phone alignment and an
// ARPAbet/IPA mismatch, which flagged clean, native-accent audio as almost
// entirely mispronounced. While disabled, pronunciation is shown as an
// estimate and excluded from the overall band so it cannot distort results.
// Re-enable (set true) once a real pronunciation API (Azure/Speechace) is wired.
const ACOUSTIC_PRONUNCIATION_ENABLED = false;

/**
 * POST /api/evaluate
 * Full IELTS evaluation pipeline (OpenAI only):
 *   1. Audio → OpenAI Whisper verbatim transcription (keeps fillers/disfluencies)
 *   2. Word timestamps → pause detection (gaps ≥ 0.6s)
 *   3. Verbatim transcript → gpt-4o-mini disfluency analysis (fillers, repetitions, false starts)
 *   4. Audio + transcript → Python pronunciation scoring (non-fatal)
 *   5. Transcript → OpenAI gpt-4o-mini FC/LR/GRA evaluation
 *   6. Merge all data → overall IELTS band + fluency diagnostics
 */
router.post("/", async (req, res, next) => {
  try {
    const startTime = Date.now();
    const questionText = req.body.questionText || "General speaking question";
    const questionPart = parseInt(req.body.questionPart) || 1;
    const studentName = req.body.studentName || "Student";

    let transcript = req.body.transcript || "";
    let transcriptWords = [];
    let audioDuration = 0;
    let pronunciationData = null;
    let pronunciationSource = "none";
    let pauseData = { count: 0, totalPauseDuration: 0, pauses: [] };
    let disfluencyData = null;
    let intelligibilityPron = null;

    // === Branch 1: Audio provided — run full pipeline ===
    if (req.file) {
      const mimeType = getMimeType(req.file.originalname);

      // Step 1: Verbatim transcription via OpenAI Whisper
      console.log("Transcription: Using OpenAI whisper-1 (verbatim mode)...");
      const transcriptionResult = await openaiService.transcribeAudio(
        req.file.buffer,
        mimeType,
        req.file.originalname
      );
      transcript = transcriptionResult.text;
      transcriptWords = transcriptionResult.words;
      audioDuration = transcriptionResult.duration;
      console.log(
        `Transcription: Whisper completed — ${transcriptWords.length} words, ${audioDuration}s duration.`
      );

      // Pronunciation via intelligibility (derived from Whisper recognition
      // confidence — no separate acoustic engine required).
      intelligibilityPron = openaiService.estimatePronunciation(
        transcriptionResult.confidence
      );
      if (intelligibilityPron) {
        console.log(
          `Pronunciation (intelligibility): band ${intelligibilityPron.band} ` +
          `(avg_logprob ${intelligibilityPron.avgLogprob}).`
        );
      }

      // Step 2: Detect pauses from word timestamps
      pauseData = openaiService.detectPauses(transcriptWords);
      console.log(
        `Pauses: Found ${pauseData.count} hesitation pauses (≥0.6s), total pause time: ${pauseData.totalPauseDuration}s`
      );

      // Step 3: Disfluency analysis (fillers, repetitions, false starts) — non-fatal
      try {
        console.log("Disfluency analysis: Sending to gpt-4o-mini...");
        disfluencyData = await openaiService.analyzeDisfluencies(transcript, transcriptWords);
        console.log(
          `Disfluency analysis: Found ${disfluencyData.summary.total_disfluencies} disfluencies ` +
          `(${disfluencyData.summary.filler_count} fillers, ` +
          `${disfluencyData.summary.repetition_count} repetitions, ` +
          `${disfluencyData.summary.false_start_count} false starts)`
        );
      } catch (disfErr) {
        console.warn(`Disfluency analysis: Failed — ${disfErr.message}. Continuing without it.`);
        disfluencyData = null;
      }

      // Step 4: Pronunciation scoring (non-fatal). Disabled while the local
      // acoustic scorer is unreliable — see ACOUSTIC_PRONUNCIATION_ENABLED.
      if (ACOUSTIC_PRONUNCIATION_ENABLED) {
        try {
          pronunciationData = await scorePronunciation(
            req.file.buffer,
            transcript,
            req.file.originalname,
            transcriptWords
          );
          if (pronunciationData) {
            pronunciationSource = "acoustic_pipeline";
            console.log("Pronunciation: Acoustic scoring completed successfully.");
          } else {
            pronunciationSource = "unavailable";
            console.warn("Pronunciation: Service returned null — skipping.");
          }
        } catch (pronErr) {
          pronunciationSource = "unavailable";
          pronunciationData = null;
          console.warn(
            `Pronunciation: Caught error, continuing without pronunciation data — ${pronErr.message}`
          );
        }
      } else {
        pronunciationData = null;
        pronunciationSource = "estimated";
        console.log("Pronunciation: Acoustic scoring disabled — using estimate, excluded from overall band.");
      }
    }

    // === Step 5: OpenAI LLM evaluation (always runs) ===
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "No transcript available. Please provide audio or text input.",
      });
    }

    console.log("LLM evaluation: Using OpenAI gpt-4o-mini...");
    const evaluationResult = await openaiService.evaluateTranscript(
      transcript,
      questionText,
      questionPart
    );
    console.log("LLM evaluation: OpenAI gpt-4o-mini completed successfully.");

    // === Step 6: Merge scores ===
    const coreMean =
      (evaluationResult.fc + evaluationResult.lr + evaluationResult.gra) / 3;

    let pScore;
    if (pronunciationData) {
      pScore = pronunciationData.pronunciation_band;            // acoustic engine (disabled)
    } else if (intelligibilityPron) {
      pScore = intelligibilityPron.band;                        // transcription intelligibility
      pronunciationSource = "intelligibility";
    } else {
      // No audio signal at all (text-only): estimate pronunciation as tracking
      // the other criteria so it neither inflates nor drags the overall band.
      pScore = Math.round(coreMean * 2) / 2;
      if (pronunciationSource === "none") {
        pronunciationSource = req.file ? "estimated" : "text_only";
      }
    }

    const scores = {
      fc: evaluationResult.fc,
      lr: evaluationResult.lr,
      gra: evaluationResult.gra,
      p: pScore,
    };

    // Overall band, rounded to nearest 0.5. Include pronunciation in the
    // standard 4-criteria IELTS mean when we have a real signal (acoustic or
    // intelligibility-based). For text-only input (pure estimate), base it on
    // FC/LR/GRA so a placeholder can't distort the result.
    const hasRealPronunciation = !!(pronunciationData || intelligibilityPron);
    const rawMean = hasRealPronunciation
      ? (scores.fc + scores.lr + scores.gra + scores.p) / 4
      : coreMean;
    const overallBand = Math.round(rawMean * 2) / 2;

    // Build pronunciation criteria
    const pCriteria = pronunciationData
      ? {
          good: pronunciationData.feedback?.phone_feedback
            ?.filter((f) => f.severity !== "high")
            .map((f) => `Clear production of ${f.phone_name}`)
            .slice(0, 3) || ["Generally clear pronunciation"],
          weak: pronunciationData.feedback?.phone_feedback
            ?.filter((f) => f.severity === "high")
            .map((f) => f.message)
            .slice(0, 3) || [],
          note: `Score based on acoustic GOP analysis. Error rate: ${Math.round(
            pronunciationData.error_rate * 100
          )}%`,
          phonemeScores: pronunciationData.word_scores || [],
          mispronunciations: pronunciationData.mispronunciations || [],
        }
      : intelligibilityPron
      ? {
          band: intelligibilityPron.band,
          method: "intelligibility",
          good: intelligibilityPron.band >= 7 ? [intelligibilityPron.descriptor] : [],
          weak: intelligibilityPron.band < 7 ? [intelligibilityPron.descriptor] : [],
          note: "Pronunciation is scored here as overall intelligibility — how clearly your speech was understood — derived from the speech recognizer's confidence. It reflects clarity and is included in your band, but it is not sound-by-sound phoneme analysis.",
          phonemeScores: [],
          mispronunciations: [],
        }
      : {
          good: [],
          weak: [],
          note:
            pronunciationSource === "estimated"
              ? "Acoustic pronunciation analysis is temporarily disabled while a more accurate engine is integrated. This band is an estimate based on your other criteria — it is not phoneme-level analysis and does not affect your overall band."
              : pronunciationSource === "unavailable"
              ? "Pronunciation pipeline was unavailable. Score is estimated."
              : "No audio provided. Pronunciation not assessed acoustically.",
          phonemeScores: [],
          mispronunciations: [],
        };

    const result = {
      overallBand,
      scores: {
        fc: evaluationResult.fc,
        lr: evaluationResult.lr,
        gra: evaluationResult.gra,
        p: pScore,
      },
      pronunciationSource,
      verdict: evaluationResult.verdict,
      transcript,
      groqWords: transcriptWords,
      // ─── Fluency diagnostics (new) ───
      pauseAnalysis: pauseData,
      disfluencyAnalysis: disfluencyData,
      // ─────────────────────────────────
      criteria: {
        fc: evaluationResult.criteria?.fc || { good: [], weak: [], note: "" },
        lr: evaluationResult.criteria?.lr || { good: [], weak: [], note: "" },
        gra: evaluationResult.criteria?.gra || { good: [], weak: [], note: "" },
        p: pCriteria,
      },
      mistakes: evaluationResult.mistakes || [],
      plan: evaluationResult.plan || { target: overallBand + 0.5, focus: "", drills: [] },
      fluency: pronunciationData?.fluency || {},
      metadata: {
        audioDuration,
        totalWords: transcriptWords.length || transcript.split(/\s+/).length,
        totalPhonemes: pronunciationData?.total_phones || 0,
        processingTime: (Date.now() - startTime) / 1000,
        timestamp: new Date().toISOString(),
        studentName,
        questionText,
        questionPart,
      },
    };

    console.log(
      `Evaluation complete: overall=${overallBand}, fc=${scores.fc}, lr=${scores.lr}, gra=${scores.gra}, p=${scores.p} (${pronunciationSource}), ` +
      `pauses=${pauseData.count}, disfluencies=${disfluencyData?.summary?.total_disfluencies ?? "N/A"}, ` +
      `time=${result.metadata.processingTime}s`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
