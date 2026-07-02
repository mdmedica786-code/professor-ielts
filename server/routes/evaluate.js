const express = require("express");
const openaiService = require("../services/openaiService");
const { scorePronunciation } = require("../services/pronunciationService");
const { getMimeType } = require("../utils/audioUtils");
const { getIsPremium } = require("../services/planService");
const { evalModel } = require("../utils/models");

const router = express.Router();

// Per-step timeout to prevent a single hung API call from stalling the entire pipeline.
const STEP_TIMEOUT_MS = 30_000; // 30 seconds per AI call

function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Audio upload + validation are handled upstream in index.js
// (upload.single("audio") -> validateAudio) before this router runs.

// Acoustic pronunciation scoring is ENABLED using Azure Speech SDK.
const ACOUSTIC_PRONUNCIATION_ENABLED = true;

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
    // Tier the grader: paid users keep the high-accuracy model; free users get
    // the cheaper one (tunable via env — see utils/models.js).
    const evalModelName = evalModel(await getIsPremium(req.uid));

    let transcript = req.body.transcript || "";
    let transcriptWords = [];
    let audioDuration = 0;
    let pronunciationData = null;
    let pronunciationSource = "none";
    let pauseData = { count: 0, totalPauseDuration: 0, pauses: [] };
    let disfluencyData = null;
    let intelligibilityPron = null;
    let evaluationResult = null;

    // === Branch 1: Audio provided — run full pipeline ===
    if (req.file) {
      const mimeType = getMimeType(req.file.originalname);

      // Step 1: Verbatim transcription via OpenAI Whisper
      console.log("Transcription: Using OpenAI whisper-1 (verbatim mode)...");
      const transcriptionResult = await withTimeout(
        openaiService.transcribeAudio(req.file.buffer, mimeType, req.file.originalname),
        STEP_TIMEOUT_MS,
        "Whisper transcription"
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
      console.log("Disfluency analysis: Sending to gpt-4o-mini...");
      const disfluencyP = withTimeout(
        openaiService.analyzeDisfluencies(transcript, transcriptWords),
        STEP_TIMEOUT_MS,
        "Disfluency analysis"
      ).catch((disfErr) => {
        console.warn(`Disfluency analysis: Failed — ${disfErr.message}. Continuing without it.`);
        return null;
      });

      // Step 4: Pronunciation scoring (non-fatal)
      let pronunciationP;
      if (ACOUSTIC_PRONUNCIATION_ENABLED) {
        pronunciationP = scorePronunciation(
          req.file.buffer,
          transcript,
          req.file.originalname,
          transcriptWords
        ).catch((pronErr) => {
          console.warn(`Pronunciation: Caught error, continuing without pronunciation data — ${pronErr.message}`);
          return null;
        });
      } else {
        pronunciationP = Promise.resolve(null);
      }
      
      // Step 5: OpenAI LLM evaluation — grounded in acoustic evidence.
      // Disfluency analysis is awaited FIRST (fast gpt-4o-mini call) so its
      // summary + pause data + speech rate reach the FC grader instead of
      // only decorating the report. Azure keeps running in parallel — its
      // result only affects the P band, which merges after this step.
      disfluencyData = await disfluencyP;
      if (disfluencyData) {
        console.log(`Disfluency analysis: Found ${disfluencyData.summary.total_disfluencies} disfluencies`);
      }

      console.log(`LLM evaluation: Using OpenAI ${evalModelName} (with acoustic fluency evidence)...`);
      const evaluationP = withTimeout(
        openaiService.evaluateTranscript(transcript, questionText, questionPart, evalModelName, {
          audioDuration,
          totalWords: transcriptWords.length,
          pauseData,
          disfluencyData,
        }),
        STEP_TIMEOUT_MS,
        "LLM evaluation"
      );

      const [pronRes, evalRes] = await Promise.all([pronunciationP, evaluationP]);

      pronunciationData = pronRes;
      if (ACOUSTIC_PRONUNCIATION_ENABLED) {
        if (pronunciationData) {
          pronunciationSource = "acoustic_pipeline";
          console.log("Pronunciation: Acoustic scoring completed successfully.");
        } else {
          pronunciationSource = "unavailable";
          console.warn("Pronunciation: Service returned null or failed — skipping.");
        }
      } else {
        pronunciationSource = "estimated";
        console.log("Pronunciation: Acoustic scoring disabled — using estimate.");
      }
      
      evaluationResult = evalRes;
      console.log("LLM evaluation: OpenAI gpt-4o-mini completed successfully.");
    } else {
      // === Branch 2: Text-only (No Audio) ===
      if (!transcript || transcript.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "No transcript available. Please provide audio or text input.",
        });
      }

      console.log(`LLM evaluation: Using OpenAI ${evalModelName}...`);
      evaluationResult = await withTimeout(
        openaiService.evaluateTranscript(transcript, questionText, questionPart, evalModelName),
        STEP_TIMEOUT_MS,
        "LLM evaluation"
      );
      console.log("LLM evaluation: OpenAI gpt-4o-mini completed successfully.");
    }

    // === Step 6: Merge scores ===
    const coreMean =
      (evaluationResult.fc + evaluationResult.lr + evaluationResult.gra) / 3;

    let pScore;
    if (pronunciationData) {
      pScore = pronunciationData.band || pronunciationData.pronunciation_band;
    } else if (intelligibilityPron) {
      pScore = intelligibilityPron.band;
      pronunciationSource = "intelligibility";
    } else {
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

    const hasRealPronunciation = !!(pronunciationData || intelligibilityPron);
    const rawMean = hasRealPronunciation
      ? (scores.fc + scores.lr + scores.gra + scores.p) / 4
      : coreMean;
    const overallBand = Math.round(rawMean * 2) / 2;

    let pCriteria;
    if (pronunciationData && pronunciationData.method === 'azure-speech-sdk') {
      pCriteria = {
        good: [pronunciationData.descriptor],
        weak: pronunciationData.mispronounced?.slice(0, 3).map(w => `Mispronounced: "${w.word}" (accuracy: ${Math.round(w.accuracy)}%)`) || [],
        note: `Azure Speech AI — Accuracy: ${Math.round(pronunciationData.accuracy)}%, Fluency: ${Math.round(pronunciationData.fluency)}%, Prosody: ${Math.round(pronunciationData.prosody)}%`,
        phonemeScores: pronunciationData.words || [],
        mispronunciations: pronunciationData.mispronounced || [],
        metrics: {
          accuracy: pronunciationData.accuracy,
          fluency: pronunciationData.fluency,
          completeness: pronunciationData.completeness,
          prosody: pronunciationData.prosody
        }
      };
    } else if (intelligibilityPron) {
      pCriteria = {
        good: intelligibilityPron.band >= 7 ? [intelligibilityPron.descriptor] : [],
        weak: intelligibilityPron.band < 7 ? [intelligibilityPron.descriptor] : [],
        note: "Pronunciation is scored here as overall intelligibility — how clearly your speech was understood — derived from the speech recognizer's confidence.",
        phonemeScores: [],
        mispronunciations: [],
      };
    } else {
      pCriteria = {
        good: [],
        weak: [],
        note: pronunciationSource === "estimated"
            ? "Acoustic pronunciation analysis is temporarily disabled while a more accurate engine is integrated. This band is an estimate based on your other criteria — it is not phoneme-level analysis and does not affect your overall band."
            : pronunciationSource === "unavailable"
            ? "Pronunciation pipeline was unavailable. Score is estimated."
            : "No audio provided. Pronunciation not assessed acoustically.",
        phonemeScores: [],
        mispronunciations: [],
      };
    }

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
    // Record gamification activity (fire-and-forget — don't block the response)
    const { recordActivity } = require('../services/streakService');
    recordActivity(req.uid, 'speaking').catch(e => console.error('Streak error:', e));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
