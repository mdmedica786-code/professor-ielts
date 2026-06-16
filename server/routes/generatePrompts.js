const express = require("express");
const { generateQuestions } = require("../services/openaiService");

const router = express.Router();

/**
 * POST /api/generate-prompts
 * Generate 3 IELTS Speaking questions for a given topic.
 */
router.post("/", async (req, res, next) => {
  try {
    const { topic } = req.body;
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Topic is required",
      });
    }

    const questions = await generateQuestions(topic.trim());

    res.json({ success: true, data: questions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
