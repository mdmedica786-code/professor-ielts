const express = require("express");
const { generateReading, evaluateReading } = require("../services/readingService");
const { checkUsage } = require("../middleware/checkUsage");

const router = express.Router();

// The answer key must not ship inside the visible question objects. We keep the
// flow stateless by packing {module, passage, questions+keys} into an opaque
// token returned with the generated set; the client echoes it back at marking
// time. (Obfuscation, not security — adequate for a self-study tool.)
function encodeToken(payload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}
function decodeToken(token) {
  return JSON.parse(Buffer.from(token, "base64").toString("utf8"));
}

// Strip the key fields before sending questions to the browser.
function toPublicQuestion(q) {
  return {
    id: q.id,
    number: q.number,
    type: q.type,
    prompt: q.prompt,
    instruction: q.instruction,
    options: q.options,
    paragraph: q.paragraph,
  };
}

/**
 * POST /api/reading/generate
 * Body: { module, difficulty, topic, passage, questionsHint, count }
 * Returns a passage + key-stripped questions + an opaque marking token.
 */
router.post("/generate", async (req, res, next) => {
  try {
    const module = req.body.module === "general" ? "general" : "academic";
    const { difficulty, topic, passage, questionsHint, count } = req.body;

    const generated = await generateReading({
      module,
      difficulty,
      topic,
      passage,
      questionsHint,
      count,
    });

    if (!generated.passage.text.trim() || generated.questions.length === 0) {
      return res.status(502).json({
        success: false,
        error: "The generator did not return a usable passage. Please try again.",
      });
    }

    const token = encodeToken({
      module,
      passage: generated.passage,
      questions: generated.questions,
    });

    res.json({
      success: true,
      data: {
        passage: generated.passage,
        questions: generated.questions.map(toPublicQuestion),
        module,
        difficulty: generated.difficulty,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reading/evaluate
 * Body: { token, answers, studentName }
 * Marks the attempt server-side using the key carried in the token.
 */
router.post("/evaluate", checkUsage, async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { token, answers, studentName } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: "Missing reading session token." });
    }

    let payload;
    try {
      payload = decodeToken(token);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid reading session token." });
    }

    const { module, passage, questions } = payload;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: "No questions to mark." });
    }

    const result = await evaluateReading({
      module,
      passage,
      questions,
      answers: answers || {},
    });

    result.passage = passage;
    result.metadata = {
      studentName: studentName || "Student",
      module,
      processingTime: (Date.now() - startTime) / 1000,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `Reading evaluation complete: band=${result.overallBand}, ${result.correctCount}/${result.total} correct, module=${module}, time=${result.metadata.processingTime}s`
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
