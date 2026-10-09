const express = require("express");
const { scorePronunciation, sanitizeLanguage } = require("../services/pronunciationService");
const { getMimeType } = require("../utils/audioUtils");

const router = express.Router();

// Audio upload + validation are handled upstream in index.js
// (upload.single("audio") -> validateAudio) before this router runs.

/**
 * POST /api/pronunciation
 * Azure pronunciation assessment. Body: audio file + transcript, optional language.
 */
router.post("/", async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No audio file provided" });
    }

    const transcript = req.body.transcript;
    if (!transcript) {
      return res.status(400).json({ success: false, error: "No transcript provided" });
    }

    // Optional locale ('en-US' default, 'en-GB', 'de-DE'). German answers are
    // free speech of several sentences, so they are assessed continuously.
    const language = sanitizeLanguage(req.body.language);
    const result = await scorePronunciation(
      req.file.buffer,
      transcript,
      req.file.originalname,
      null,
      { language, continuous: language === "de-DE" || String(req.body.continuous) === "true" }
    );

    if (!result) {
      return res.status(503).json({
        success: false,
        error: "Pronunciation scoring service is unavailable",
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
