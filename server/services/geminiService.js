const { GoogleGenAI } = require("@google/genai");
const IELTS_EXAMINER_PROMPT = require("../prompts/ieltsExaminer");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Evaluate an IELTS Speaking transcript using Gemini LLM.
 *
 * @param {string} transcript - Student's spoken transcript
 * @param {string} questionText - The IELTS question prompt
 * @param {number} questionPart - IELTS part number (1, 2, or 3)
 * @returns {Promise<Object>} Parsed evaluation JSON with fc, lr, gra scores, mistakes, plan
 */
async function evaluateTranscript(transcript, questionText, questionPart) {
  const userMessage = `IELTS Speaking Question (Part ${questionPart}): "${questionText}"

Student's Transcript:
"${transcript}"

Evaluate this response now. Return ONLY valid JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userMessage,
    config: {
      systemInstruction: IELTS_EXAMINER_PROMPT,
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = response.text;
  return JSON.parse(text);
}

/**
 * Generate IELTS speaking questions from a topic using Gemini.
 *
 * @param {string} topic - The topic to generate questions for
 * @returns {Promise<Array>} Array of 3 question objects with part, topic, text
 */
async function generateQuestions(topic) {
  const prompt = `Generate exactly 3 realistic IELTS Speaking test questions about the topic "${topic}".

Return a JSON array with exactly 3 objects, one for each part:
- Part 1: A simple, personal question (1-2 sentences)
- Part 2: A cue card prompt with 4 bullet points (use \\n and • for formatting)
- Part 3: An abstract/discussion question (1-2 sentences)

Each object must have: "part" (number), "topic" (string), "text" (string).
Return ONLY the JSON array, no markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const text = response.text;
  return JSON.parse(text);
}

/**
 * Transcribe audio using Gemini.
 */
async function transcribeAudio(audioBuffer, mimeType, filename) {
  const filePart = {
    inlineData: {
      data: audioBuffer.toString("base64"),
      mimeType: mimeType,
    },
  };
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: ["Transcribe this audio exactly as spoken. Do not add any extra text or formatting.", filePart],
  });

  const text = response.text || "";
  const allWords = text.trim().split(/\s+/);
  const duration = 10.0; // Fallback duration
  const wordDur = duration / Math.max(allWords.length, 1);
  let words = [];
  let curr = 0;
  for (const w of allWords) {
    words.push({ word: w, start: curr, end: curr + wordDur });
    curr += wordDur;
  }

  return {
    text: text,
    words: words,
    segments: [],
    duration: duration,
  };
}

module.exports = { evaluateTranscript, generateQuestions, transcribeAudio };
