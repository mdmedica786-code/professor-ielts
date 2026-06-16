const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key_to_prevent_crash" });

/**
 * Transcribe audio using Groq Whisper API.
 *
 * @param {Buffer} audioBuffer - Raw audio file buffer
 * @param {string} mimeType - MIME type of the audio (e.g., 'audio/wav')
 * @param {string} filename - Original filename with extension
 * @returns {Promise<Object>} Transcription result with text, words, segments, duration
 */
async function transcribeAudio(audioBuffer, mimeType, filename) {
  const file = new File([audioBuffer], filename, { type: mimeType });

  const transcription = await groq.audio.transcriptions.create({
    file: file,
    model: "whisper-large-v3-turbo",
    language: "en",
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  });

  let words = transcription.words || [];
  
  // Fallback: If Groq doesn't return word-level timestamps, synthesize them from segments
  if (words.length === 0 && transcription.segments && transcription.segments.length > 0) {
    for (const seg of transcription.segments) {
      const segWords = seg.text.trim().split(/\s+/);
      if (segWords.length === 0) continue;
      const wordDur = (seg.end - seg.start) / segWords.length;
      let curr = seg.start;
      for (const w of segWords) {
        words.push({
          word: w,
          start: curr,
          end: curr + wordDur
        });
        curr += wordDur;
      }
    }
  }

  // Fallback 2: If no segments exist, just make one big segment for the whole text
  if (words.length === 0 && transcription.text) {
    const allWords = transcription.text.trim().split(/\s+/);
    const duration = transcription.duration || 10.0;
    const wordDur = duration / Math.max(allWords.length, 1);
    let curr = 0;
    for (const w of allWords) {
      words.push({
        word: w,
        start: curr,
        end: curr + wordDur
      });
      curr += wordDur;
    }
  }

  return {
    text: transcription.text,
    words: words,
    segments: transcription.segments || [],
    duration: transcription.duration || 0,
  };
}

const IELTS_EXAMINER_PROMPT = require("../prompts/ieltsExaminer");

async function evaluateTranscript(transcript, questionText, questionPart) {
  const userMessage = `IELTS Speaking Question (Part ${questionPart}): "${questionText}"

Student's Transcript:
"${transcript}"

Evaluate this response now. Return ONLY valid JSON.`;

  const response = await groq.chat.completions.create({
    model: "qwen-2.5-32b", // fallback to standard naming if qwen/qwen3-32b is invalid
    messages: [
      { role: "system", content: IELTS_EXAMINER_PROMPT },
      { role: "user", content: userMessage }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  return JSON.parse(response.choices[0].message.content);
}

module.exports = { transcribeAudio, evaluateTranscript };
