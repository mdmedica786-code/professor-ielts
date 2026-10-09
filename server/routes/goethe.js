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
  generateSpeakingTaskSheet,
  interactGoetheExamTurn,
  resolveSpeakingTeil,
} = require("../services/goetheGeneratorService");
const { transcribeAudio } = require("../services/openaiService");
const { getMimeType } = require("../utils/audioUtils");
const { getIsPremium } = require("../services/planService");
const { evalModel } = require("../utils/models");

const crypto = require("crypto");
const {
  SUPPORTED_LEVELS,
  sanitizeLevel,
  getLevelFormat,
  getReceptivePart,
  getModuleMaxRaw,
  scaleReceptive,
} = require("../config/goetheExamFormat");
const { buildSpeakingPartnerPrompt } = require("../prompts/goetheGeneratorPrompts");

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
    err.expose = true;
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
    ...(q.segment ? { segment: q.segment } : {}),
    ...(q.textRef ? { textRef: q.textRef } : {}),
  };
}

/** Parses a JSON field that may arrive as a string (multipart) or object. */
function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ─── EXAM FORMAT (single source of truth for the client UI) ──────────

/**
 * GET /api/goethe/format?level=B1
 * Structure of every module for the level: Teile with item type/count,
 * continuous numbering (from/to), resolved instructions, playback limits,
 * writing Aufgaben and speaking Teile with criteria. No answer data.
 * Mounted in index.js ahead of checkUsage: reading the format is free.
 */
function sendFormat(req, res) {
  const level = sanitizeLevel(req.query.level);
  const fmt = getLevelFormat(level);
  const receptive = (module) => ({
    ...fmt[module],
    maxRaw: getModuleMaxRaw(level, module),
    parts: fmt[module].parts.map((p) => getReceptivePart(level, module, p.teil)),
  });
  res.json({
    success: true,
    data: {
      level,
      levels: SUPPORTED_LEVELS,
      lesen: receptive("lesen"),
      hoeren: receptive("hoeren"),
      schreiben: fmt.schreiben,
      sprechen: fmt.sprechen,
    },
  });
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

    const token = encodeToken({
      module: "lesen",
      level: generated.level,
      title: generated.title,
      partNumber: generated.partNumber,
      questions: generated.questions,
    });

    const { questions, ...publicData } = generated;
    res.json({
      success: true,
      data: { ...publicData, questions: questions.map(toPublicQuestion), token },
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
 * Response adds audioData (base64 mp3) + audioMimeType for server-rendered audio.
 */
router.post("/listening/generate", async (req, res, next) => {
  try {
    const { level = "B1", topic = "", partNumber = 1 } = req.body || {};
    const generated = await generateGoetheListening({ level, topic, partNumber });

    const token = encodeToken({
      module: "hoeren",
      level: generated.level,
      title: generated.title,
      partNumber: generated.partNumber,
      questions: generated.questions,
    });

    // audioData: the whole Teil (instructions + script, with pauses) as one
    // base64 mp3 rendered with tts-1-hd; null if synthesis failed, in which
    // case the client falls back to reading `utterances` with browser TTS.
    const { questions, ...publicData } = generated;
    res.json({
      success: true,
      data: { ...publicData, questions: questions.map(toPublicQuestion), token },
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
      teil = null,
      topic = "",
      taskType = "",
      studentText = "",
      voice = "nova",
      mode = "partner",
    } = req.body || {};

    const history = parseJsonField(req.body?.history, []);

    let audioBuffer = null;
    let mimeType = "audio/webm";
    let filename = "speech.webm";

    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = getMimeType(req.file.originalname);
      filename = req.file.originalname;
    }

    // Paarprüfung: AI plays examiner + partner candidate (separate voices).
    if (mode === "exam") {
      const examResult = await interactGoetheExamTurn({
        level,
        teil: parseInt(teil, 10) || 1,
        topic,
        taskSheet: parseJsonField(req.body.taskSheet, null),
        partnerName: req.body.partnerName,
        history: Array.isArray(history) ? history : [],
        event: req.body.event || "candidate",
        firstTeil: String(req.body.firstTeil) === "true",
        afterPreparation: String(req.body.afterPreparation) === "true",
        elapsedSeconds: Number(req.body.elapsedSeconds) || 0,
        studentText,
        audioBuffer,
        mimeType,
        filename,
      });
      return res.json({ success: true, data: examResult });
    }

    const result = await interactGoetheSpeakingPartner({
      level,
      teil,
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
 * POST /api/goethe/speaking/task
 * Body: { level, teil, topic } → Aufgabenblatt for one Sprechen Teil
 * (Leitpunkte, Folien, Karten, Terminkalender …).
 */
router.post("/speaking/task", async (req, res, next) => {
  try {
    const { level = "B1", teil = 1, topic = "" } = req.body || {};
    const sheet = await generateSpeakingTaskSheet({ level, teil: parseInt(teil, 10) || 1, topic });
    res.json({ success: true, data: sheet });
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
      teil = null,
      topic = "",
      taskType = "",
      studentName = "Student",
    } = req.body || {};

    const history = parseJsonField(req.body?.history, []);

    if (!Array.isArray(history) || !history.some((h) => (h.speaker === "candidate" || h.role === "user") && String(h.text || "").trim())) {
      return res.status(400).json({
        success: false,
        error: "Es wurden noch keine Redebeiträge von Ihnen aufgezeichnet.",
      });
    }

    const result = await evaluateGoetheSpeakingDialogue({
      level,
      teil,
      topic,
      taskSheet: parseJsonField(req.body.taskSheet, null),
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
    const { level = "B1", teil = null, topic = "", taskType = "" } = req.body || {};
    const lvl = sanitizeLevel(level);
    const speakingTeil = resolveSpeakingTeil(lvl, teil, taskType);

    const instructions = `${buildSpeakingPartnerPrompt(lvl, speakingTeil.teil, topic, { output: "speech" })}
Begrüße den Kandidaten kurz und eröffne die Aufgabe so, wie es in der Prüfung üblich ist.`;

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
 * Body: { level, taskNumber, prompt, response, studentName }
 */
router.post("/evaluate-writing", async (req, res, next) => {
  try {
    const { level = "B1", taskNumber = 1, prompt = "", response = "", studentName = "Student" } = req.body || {};

    if (!String(response).trim()) {
      return res.status(400).json({
        success: false,
        error: "Bitte geben Sie zuerst Ihren Text ein.",
      });
    }

    if (!String(prompt).trim()) {
      return res.status(400).json({
        success: false,
        error: "Es ist keine Aufgabenstellung vorhanden.",
      });
    }

    const evalModelName = evalModel(await getIsPremium(req.uid));

    const result = await evaluateGoetheWriting({
      level,
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
    const level = req.body.level || "B1";
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
        error: "Es wurde kein gesprochener Text erkannt. Bitte nehmen Sie Ihre Antwort erneut auf.",
      });
    }

    const evalModelName = evalModel(await getIsPremium(req.uid));

    const result = await evaluateGoetheSpeaking({
      level,
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

// ─── ERROR HANDLING (German messages for the exam UI) ─────────────────

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, _next) => {
  console.error("Goethe route error:", err.message);

  if (err.expose && err.status) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, error: "Die Audiodatei ist zu groß (maximal 25 MB)." });
  }
  if (err.isValidation || err instanceof SyntaxError) {
    return res.status(502).json({
      success: false,
      error: "Die KI hat keine gültige Antwort geliefert. Bitte versuchen Sie es erneut.",
    });
  }
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: "Der KI-Dienst ist gerade ausgelastet. Bitte warten Sie einen Moment und versuchen Sie es erneut.",
    });
  }
  if (typeof err.status === "number") {
    return res.status(502).json({
      success: false,
      error: "Der KI-Dienst ist momentan nicht erreichbar. Bitte versuchen Sie es erneut.",
    });
  }
  res.status(500).json({
    success: false,
    error: "Ein interner Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
  });
});

module.exports = router;
module.exports.formatHandler = sendFormat;
