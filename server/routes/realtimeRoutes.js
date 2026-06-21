const express = require('express');
const axios = require('axios');
const { verifyAuth } = require('../middleware/verifyAuth');
const { checkUsage } = require('../middleware/checkUsage');

const router = express.Router();

router.post('/token', verifyAuth, checkUsage, async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/realtime/sessions',
      {
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse', // Options: alloy, echo, fable, onyx, nova, shimmer, verse
        instructions: `You are an expert, strict, but encouraging IELTS speaking examiner and tutor.
        The user is a student preparing for the IELTS speaking test.
        You must act like a real person talking to them on the phone.
        IMPORTANT: If the user makes a grammatical mistake, uses incorrect vocabulary, or has very poor pronunciation, you MUST gently interrupt or correct them immediately after they finish speaking.
        Example: "Good point, but instead of saying 'I goes to', you should say 'I go to'."
        Then continue the conversation. Keep responses relatively concise to mimic a real conversation.`
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json({
      success: true,
      client_secret: response.data.client_secret.value,
    });
  } catch (error) {
    console.error('Error generating Realtime session token:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Failed to generate real-time token' });
  }
});

module.exports = router;
