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

/**
 * POST /api/generate-prompts/writing-task1
 * Generates an IELTS Academic Task 1 graph and description.
 */
router.post("/writing-task1", async (req, res, next) => {
  try {
    const { generateWritingTask1 } = require("../services/openaiService");
    const taskData = await generateWritingTask1();
    res.json({ success: true, data: taskData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
