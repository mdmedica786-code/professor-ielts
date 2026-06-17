const express = require('express');
const { getOpenAI } = require('../services/openaiService');
const { verifyAuth } = require('../middleware/verifyAuth');

const router = express.Router();

router.post('/message', verifyAuth, async (req, res, next) => {
  try {
    const { message, history } = req.body;
    const openai = getOpenAI();

    const messages = [
      {
        role: "system",
        content: "You are a friendly, expert IELTS tutor assistant. Your job is to help the user with grammar, vocabulary, or rewriting sentences to improve their band score. Keep your answers brief, encouraging, and highly actionable. Do not write full essays for them; instead, suggest improvements."
      },
      ...(Array.isArray(history) ? history : []),
      { role: "user", content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    res.json({
      success: true,
      data: {
        reply: response.choices[0].message.content,
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
