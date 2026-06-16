const express = require("express");
const { transcribeAudio } = require("../services/openaiService");
const { getMimeType } = require("../utils/audioUtils");

const router = express.Router();

// Audio upload + validation are handled upstream in index.js
// (upload.single("audio") -> validateAudio) before this router runs.

/**
 * POST /api/transcribe
 * Transcribe audio file using OpenAI Whisper.
 */
router.post("/", async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No audio file provided" });
    }

    const mimeType = getMimeType(req.file.originalname);
    const result = await transcribeAudio(
      req.file.buffer,
      mimeType,
      req.file.originalname
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
