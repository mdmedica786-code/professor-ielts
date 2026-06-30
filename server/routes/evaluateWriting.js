const express = require("express");
const { evaluateWriting } = require("../services/writingService");
const { getIsPremium } = require("../services/planService");
const { evalModel } = require("../utils/models");

const router = express.Router();

/**
 * POST /api/evaluate-writing
 * Body (JSON): { module, taskType, prompt, essay, studentName }
 * Grades an IELTS Writing response on TR/CC/LR/GRA and returns a full report.
 */
router.post("/", async (req, res, next) => {
  try {
    const startTime = Date.now();
    const essay = (req.body.essay || "").toString();
    const prompt = (req.body.prompt || "").toString();
    const taskType = parseInt(req.body.taskType) === 1 ? 1 : 2;
    const module = req.body.module === "general" ? "general" : "academic";
    const studentName = req.body.studentName || "Student";
    const imageBase64 = req.body.imageBase64 || null;
    const evalModelName = evalModel(await getIsPremium(req.uid));

    if (!essay.trim()) {
      return res.status(400).json({
        success: false,
        error: "No written response provided. Please write your answer first.",
      });
    }
    if (!prompt.trim()) {
      return res.status(400).json({
        success: false,
        error: "No task prompt provided. Please select or enter a writing task.",
      });
    }

    console.log(
      `Writing evaluation: module=${module}, task=${taskType}, ${essay.trim().split(/\s+/).length} words — gpt-4o-mini...`
    );
    const result = await evaluateWriting({ essay, prompt, taskType, module, imageBase64, model: evalModelName });
    result.metadata.studentName = studentName;
    result.metadata.processingTime = (Date.now() - startTime) / 1000;
    result.metadata.timestamp = new Date().toISOString();

    console.log(
      `Writing evaluation complete: overall=${result.overallBand}, tr=${result.scores.tr}, cc=${result.scores.cc}, lr=${result.scores.lr}, gra=${result.scores.gra}, time=${result.metadata.processingTime}s`
    );

    // Record gamification activity (fire-and-forget)
    const { recordActivity } = require('../services/streakService');
    recordActivity(req.uid, 'writing').catch(e => console.error('Streak error:', e));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
