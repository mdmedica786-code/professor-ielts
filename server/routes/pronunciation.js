const express = require("express");
const { scorePronunciation } = require("../services/pronunciationService");
const { getMimeType } = require("../utils/audioUtils");

const router = express.Router();

// Audio upload + validation are handled upstream in index.js
// (upload.single("audio") -> validateAudio) before this router runs.

/**
 * POST /api/pronunciation
 * Proxy request to the Python pronunciation pipeline.
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

    const result = await scorePronunciation(
      req.file.buffer,
      transcript,
      req.file.originalname
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
