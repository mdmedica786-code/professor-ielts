const express = require("express");
const axios = require("axios");
const {
  evaluateGoetheWriting,
  evaluateGoetheSpeaking,
  getGoethePraedikat,
} = require("../services/goetheService");
const {
  generateGoetheReading,
  evaluateGoetheReading,
  generateGoetheListening,
  evaluateGoetheListening,
  generateGoetheWritingTask,
  interactGoetheSpeakingPartner,
  evaluateGoetheSpeakingDialogue,
} = require("../services/goetheGeneratorService");
const { transcribeAudio } = require("../services/openaiService");
const { getMimeType } = require("../utils/audioUtils");
const { getIsPremium } = require("../services/planService");
const { evalModel } = require("../utils/models");

const crypto = require("crypto");
const { sanitizeLevel, getModuleMaxRaw, scaleReceptive } = require("../config/goetheExamFormat");

const router = express.Router();

// Answer keys travel to the client inside an AES-256-GCM token so they cannot
// be decoded in the browser (plain base64 previously exposed every answer).
const TOKEN_KEY = crypto
  .createHash("sha256")
  .update(process.env.GOETHE_TOKEN_SECRET || `goethe-token:${process.env.OPENAI_API_KEY || ""}`)
  .digest();

function encodeToken(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", TOKEN_KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
function decodeToken(token) {
  try {
    const buf = Buffer.from(String(token), "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", TOKEN_KEY, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8"));
  } catch {
    const err = new Error("Ungültiges oder abgelaufenes Prüfungs-Token. Bitte erstellen Sie die Aufgabe neu.");
    err.status = 400;
    throw err;
  }
}

function toPublicQuestion(q) {
  return {
    id: q.id,
    number: q.number,
    type: q.type,
    prompt: q.prompt,
    options: q.options || [],
  };
}

// ─── DYNAMIC READING (Leseverstehen) ──────────────────────────────────

/**
 * POST /api/goethe/reading/generate
 * Body: { level: 'A2'|'B1'|'B2'|'C1', topic, partNumber }
 */
router.post("/reading/generate", async (req, res, next) => {
  try {
    const { level = "B1", topic = "", partNumber = 1 } = req.body || {};
    const generated = await generateGoetheReading({ level, topic, partNumber });

    if (!generated.passage?.text || !generated.questions?.length) {
      return res.status(502).json({
        success: false,
        error: "Fehler bei der Generierung des Lesetextes. Bitte versuchen Sie es erneut.",
      });
    }

    const token = encodeToken({
      level: generated.level,
      title: generated.title,
      partNumber: generated.partNumber,
      questions: generated.questions,
    });

    res.json({
      success: true,
      data: {
        title: generated.title,
        level: generated.level,
        partNumber: generated.partNumber,
        partName: generated.partName,
        recommendedTimeMinutes: generated.recommendedTimeMinutes,
        passage: generated.passage,
        questions: generated.questions.map(toPublicQuestion),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/reading/evaluate
 * Body: { token, answers: { [num]: 'Option' }, level }
 */
router.post("/reading/evaluate", async (req, res, next) => {
  try {
    const { token, answers = {}, level = "B1" } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: "Kein Validierungs-Token vorhanden." });
    }

    const payload = decodeToken(token);
    const result = await evaluateGoetheReading({
      questionsWithKey: payload.questions || [],
      userAnswers: answers,
      level: payload.level || level,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── DYNAMIC LISTENING (Hörverstehen) ─────────────────────────────────

/**
 * POST /api/goethe/listening/generate
 * Body: { level: 'A2'|'B1'|'B2'|'C1', topic, partNumber }
 */
router.post("/listening/generate", async (req, res, next) => {
  try {
    const { level = "B1", topic = "", partNumber = 1 } = req.body || {};
    const generated = await generateGoetheListening({ level, topic, partNumber });

    if (!generated.utterances?.length || !generated.questions?.length) {
      return res.status(502).json({
        success: false,
        error: "Fehler bei der Generierung des Hörtextes. Bitte erneut versuchen.",
      });
    }

    const token = encodeToken({
      level: generated.level,
      title: generated.title,
      partNumber: generated.partNumber,
      questions: generated.questions,
      utterances: generated.utterances,
    });

    res.json({
      success: true,
      data: {
        title: generated.title,
        level: generated.level,
        partNumber: generated.partNumber,
        partName: generated.partName,
        instructions: generated.instructions,
        maxPlays: generated.maxPlays,
        speakers: generated.speakers,
        utterances: generated.utterances,
        questions: generated.questions.map(toPublicQuestion),
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/listening/evaluate
 * Body: { token, answers: { [num]: 'Option' }, level }
 */
router.post("/listening/evaluate", async (req, res, next) => {
  try {
    const { token, answers = {}, level = "B1" } = req.body || {};
    if (!token) {
      return res.status(400).json({ success: false, error: "Kein Validierungs-Token vorhanden." });
    }

    const payload = decodeToken(token);
    const result = await evaluateGoetheListening({
      questionsWithKey: payload.questions || [],
      userAnswers: answers,
      level: payload.level || level,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ─── DYNAMIC WRITING TASK GENERATION ──────────────────────────────────

/**
 * POST /api/goethe/writing/generate
 * Body: { level: 'A2'|'B1'|'B2'|'C1', topic, taskNumber }
 */
router.post("/writing/generate", async (req, res, next) => {
  try {
    const { level = "B1", topic = "", taskNumber = 1 } = req.body || {};
    const task = await generateGoetheWritingTask({ level, topic, taskNumber });
    res.json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
});

// ─── INTERACTIVE SPEAKING PARTNER (Mündliche Prüfung) ─────────────────

/**
 * POST /api/goethe/speaking/partner-turn
 * Handles candidate speech input (Audio file or text) -> Whisper verbatim (de) ->
 * LLM Partner reply (German, CEFR calibrated) -> OpenAI TTS audio output (base64 mp3).
 */
router.post("/speaking/partner-turn", async (req, res, next) => {
  try {
    const {
      level = "B1",
      topic = "Planung",
      taskType = "Teil 1: Gemeinsam etwas planen",
      studentText = "",
      voice = "nova",
    } = req.body || {};

    let history = [];
    if (req.body.history) {
      try {
        history = typeof req.body.history === "string" ? JSON.parse(req.body.history) : req.body.history;
      } catch {
        history = [];
      }
    }

    let audioBuffer = null;
    let mimeType = "audio/webm";
    let filename = "speech.webm";

    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = getMimeType(req.file.originalname);
      filename = req.file.originalname;
    }

    const result = await interactGoetheSpeakingPartner({
      level,
      topic,
      taskType,
      history,
      studentText,
      audioBuffer,
      mimeType,
      filename,
      voice,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/speaking/finish-dialogue
 * Evaluates the full conversation between candidate and AI partner.
 */
router.post("/speaking/finish-dialogue", async (req, res, next) => {
  try {
    const {
      level = "B1",
      topic = "Planung",
      taskType = "Teil 1: Planen",
      studentName = "Student",
    } = req.body || {};

    let history = [];
    if (req.body.history) {
      try {
        history = typeof req.body.history === "string" ? JSON.parse(req.body.history) : req.body.history;
      } catch {
        history = [];
      }
    }

    const result = await evaluateGoetheSpeakingDialogue({
      level,
      topic,
      taskType,
      history,
      studentName,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/realtime-token
 * Ephemeral client secret for live OpenAI Realtime WebRTC in Goethe German exam mode.
 */
router.post("/realtime-token", async (req, res, next) => {
  try {
    const { level = "B1", topic = "Gemeinsam etwas planen", taskType = "Teil 1: Planen" } = req.body || {};

    const instructions = `Du bist "Kandidat B", ein sympathischer, kooperativer deutscher Prüfungspartner in der mündlichen Goethe-Prüfung (Sprechen) auf Niveau ${level}.
Thema: "${topic}".
Aufgabe: "${taskType}".
Regeln:
1. Sprich AUSSCHLIESSLICH Deutsch, angepasst an das CEFR-Niveau ${level}.
2. Antworte immer kurz und dialogisch (2–3 Sätze), damit der Kandidat aktiv sprechen kann.
3. Gehe auf die Vorschläge des Kandidaten ein, bringe eigene Ideen ein und stelle offene Fragen.
4. Begrüße den Kandidaten kurz und eröffne das Gespräch mit einer themenbezogenen Frage oder einem Vorschlag.`;

    const response = await axios.post(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        session: {
          type: "realtime",
          model: process.env.REALTIME_MODEL || "gpt-realtime-2",
          audio: { output: { voice: process.env.REALTIME_VOICE || "verse" } },
          instructions,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "OpenAI-Safety-Identifier": req.uid || "anonymous",
        },
      }
    );

    res.json({
      success: true,
      client_secret: response.data.value,
      expires_at: response.data.expires_at,
    });
  } catch (error) {
    console.error("Error generating Goethe Realtime token:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: "Fehler beim Erstellen des Live-Sprech-Tokens." });
  }
});

// ─── LEGACY / COMPATIBILITY EVALUATION ROUTES ────────────────────────

/**
 * POST /api/goethe/evaluate-writing
 * Body: { taskNumber: 1 | 2 | 3, prompt, response, studentName }
 */
router.post("/evaluate-writing", async (req, res, next) => {
  try {
    const { taskNumber = 1, prompt = "", response = "", studentName = "Student" } = req.body;

    if (!response.trim()) {
      return res.status(400).json({
        success: false,
        error: "Bitte geben Sie zuerst Ihren Text ein (No written text provided).",
      });
    }

    if (!prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "Keine Aufgabenstellung vorhanden (No task prompt provided).",
      });
    }

    const evalModelName = evalModel(await getIsPremium(req.uid));

    const result = await evaluateGoetheWriting({
      taskNumber: parseInt(taskNumber, 10) || 1,
      prompt,
      response,
      studentName,
      model: evalModelName,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/evaluate-speaking (Monologue / Slide evaluation)
 */
router.post("/evaluate-speaking", async (req, res, next) => {
  try {
    let transcript = req.body.transcript || "";
    const part = parseInt(req.body.part, 10) || 2;
    const prompt = req.body.prompt || "";
    const topic = req.body.topic || "";
    const studentName = req.body.studentName || "Student";
    let slideNotes = null;

    if (req.body.slideNotes) {
      try {
        slideNotes = typeof req.body.slideNotes === "string" ? JSON.parse(req.body.slideNotes) : req.body.slideNotes;
      } catch {
        slideNotes = null;
      }
    }

    if (req.file) {
      const mimeType = getMimeType(req.file.originalname);
      const transcriptionResult = await transcribeAudio(
        req.file.buffer,
        mimeType,
        req.file.originalname,
        "de"
      );
      transcript = transcriptionResult.text;
    }

    if (!transcript.trim()) {
      return res.status(400).json({
        success: false,
        error: "Kein gesprochener Text oder Audio vorhanden (No speech or audio detected).",
      });
    }

    const evalModelName = evalModel(await getIsPremium(req.uid));

    const result = await evaluateGoetheSpeaking({
      part,
      prompt,
      topic,
      transcript,
      slideNotes,
      studentName,
      model: evalModelName,
    });

    result.transcript = transcript;
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/goethe/score-calculator
 * Body: { rawLesen, rawHoeren, schreibenScore, sprechenScore, level }
 */
router.post("/score-calculator", (req, res) => {
  const { rawLesen = 0, rawHoeren = 0, schreibenScore = 0, sprechenScore = 0 } = req.body || {};
  const level = sanitizeLevel(req.body?.level);

  const receptive = (module, rawInput) => {
    const maxRaw = getModuleMaxRaw(level, module);
    const raw = Math.max(0, Math.min(maxRaw, Math.round(Number(rawInput) || 0)));
    const scaled = scaleReceptive(level, module, raw, maxRaw);
    return { ...scaled, points: scaled.points100, praedikat: getGoethePraedikat(scaled.points100) };
  };
  const productive = (value) => {
    const points = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    return { points, passed: points >= 60, praedikat: getGoethePraedikat(points) };
  };

  const modules = {
    lesen: receptive("lesen", rawLesen),
    hoeren: receptive("hoeren", rawHoeren),
    schreiben: productive(schreibenScore),
    sprechen: productive(sprechenScore),
  };

  const allPassed = Object.values(modules).every((m) => m.passed);
  const averagePoints = Math.round(
    (modules.lesen.points + modules.hoeren.points + modules.schreiben.points + modules.sprechen.points) / 4
  );

  res.json({
    success: true,
    data: { level, modules, allPassed, averagePoints, overallPraedikat: getGoethePraedikat(averagePoints) },
  });
});

module.exports = router;
