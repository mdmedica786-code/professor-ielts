const express = require("express");
const {
  evaluateGoetheWriting,
  evaluateGoetheSpeaking,
  getGoethePraedikat,
} = require("../services/goetheService");
const { transcribeAudio } = require("../services/openaiService");
const { getMimeType } = require("../utils/audioUtils");
const { getIsPremium } = require("../services/planService");
const { evalModel } = require("../utils/models");

const router = express.Router();

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
      taskNumber: parseInt(taskNumber) || 1,
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
 * POST /api/goethe/evaluate-speaking
 * Accepts either:
 * 1. Audio file (multipart/form-data) + fields: part, prompt, topic, slideNotes, studentName
 * 2. JSON / text: transcript, part, prompt, topic, slideNotes, studentName
 */
router.post("/evaluate-speaking", async (req, res, next) => {
  try {
    let transcript = req.body.transcript || "";
    const part = parseInt(req.body.part) || 2;
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

    // Audio provided -> transcribe in German
    if (req.file) {
      const mimeType = getMimeType(req.file.originalname);
      const transcriptionResult = await transcribeAudio(
        req.file.buffer,
        mimeType,
        req.file.originalname,
        "de" // German transcription
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
 * Body: { rawLesen, rawHoeren, schreibenScore, sprechenScore }
 */
router.post("/score-calculator", (req, res) => {
  const { rawLesen = 0, rawHoeren = 0, schreibenScore = 0, sprechenScore = 0 } = req.body;

  // Official conversion: raw items out of 30 * 3.33, rounded
  const lesen100 = Math.min(100, Math.round(Number(rawLesen) * 3.33333));
  const hoeren100 = Math.min(100, Math.round(Number(rawHoeren) * 3.33333));
  const schreiben100 = Math.min(100, Math.round(Number(schreibenScore)));
  const sprechen100 = Math.min(100, Math.round(Number(sprechenScore)));

  const modules = {
    lesen: {
      raw: rawLesen,
      maxRaw: 30,
      points: lesen100,
      passed: rawLesen >= 18 && lesen100 >= 60,
      praedikat: getGoethePraedikat(lesen100),
    },
    hoeren: {
      raw: rawHoeren,
      maxRaw: 30,
      points: hoeren100,
      passed: rawHoeren >= 18 && hoeren100 >= 60,
      praedikat: getGoethePraedikat(hoeren100),
    },
    schreiben: {
      points: schreiben100,
      passed: schreiben100 >= 60,
      praedikat: getGoethePraedikat(schreiben100),
    },
    sprechen: {
      points: sprechen100,
      passed: sprechen100 >= 60,
      praedikat: getGoethePraedikat(sprechen100),
    },
  };

  const allPassed =
    modules.lesen.passed &&
    modules.hoeren.passed &&
    modules.schreiben.passed &&
    modules.sprechen.passed;

  const averagePoints = Math.round((lesen100 + hoeren100 + schreiben100 + sprechen100) / 4);

  res.json({
    success: true,
    data: {
      modules,
      allPassed,
      averagePoints,
      overallPraedikat: getGoethePraedikat(averagePoints),
    },
  });
});

module.exports = router;
