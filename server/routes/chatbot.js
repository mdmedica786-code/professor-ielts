const express = require('express');
const { OpenAI } = require('openai');
const { verifyAuth } = require('../middleware/verifyAuth');
const { upload } = require('../middleware/upload'); // Use multer instance
const fs = require('fs');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/chatbot/message (handles text and optional image)
router.post('/message', verifyAuth, upload.single('image'), async (req, res, next) => {
  try {
    const message = req.body.message;
    let history = [];
    try {
      history = JSON.parse(req.body.history || '[]');
    } catch (e) {}

    const messages = [
      {
        role: "system",
        content: "You are a friendly, expert IELTS tutor assistant. Your job is to help the user with grammar, vocabulary, or rewriting sentences to improve their band score. Keep your answers brief, encouraging, and highly actionable. Do not write full essays for them; instead, suggest improvements. If they show you an image (e.g. a Task 1 chart or essay), analyze it carefully and give specific IELTS feedback."
      },
      ...history
    ];

    // Construct the user message. If there's an image, use Vision API format.
    const userContent = [];
    if (message) {
      userContent.push({ type: "text", text: message });
    }

    if (req.file) {
      // Read file to base64
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype;
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Image}` }
      });
      // Cleanup temp file
      fs.unlinkSync(req.file.path);
    }

    messages.push({
      role: "user",
      content: userContent.length > 0 ? userContent : "Hello!"
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    res.json({
      success: true,
      data: {
        reply: response.choices[0].message.content,
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// POST /api/chatbot/voice (handles audio -> transcription -> LLM -> TTS audio)
router.post('/voice', verifyAuth, upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No audio file provided" });
    }

    let history = [];
    try {
      history = JSON.parse(req.body.history || '[]');
    } catch (e) {}

    // 1. Transcribe the audio using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      language: "en",
    });
    
    const transcribedText = transcription.text;

    // 2. Generate response using GPT-4o-mini
    const messages = [
      {
        role: "system",
        content: "You are a friendly, expert IELTS speaking tutor. You are having a voice conversation with the user. Keep your answers brief, encouraging, natural, and conversational. Do not use markdown lists or emojis, as your response will be read aloud by a text-to-speech engine."
      },
      ...history,
      { role: "user", content: transcribedText }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200,
      temperature: 0.7,
    });

    const replyText = completion.choices[0].message.content;

    // 3. Generate Audio using Text-to-Speech (TTS)
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // "alloy", "echo", "fable", "onyx", "nova", and "shimmer"
      input: replyText,
    });

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // Clean up uploaded audio file
    fs.unlinkSync(req.file.path);

    // Send both the text reply and the TTS audio as a base64 string
    res.json({
      success: true,
      data: {
        transcription: transcribedText,
        reply: replyText,
        audioBase64: audioBuffer.toString('base64')
      }
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

module.exports = router;
