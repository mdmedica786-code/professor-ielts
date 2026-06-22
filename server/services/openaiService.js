const { OpenAI, toFile } = require("openai");
const IELTS_EXAMINER_PROMPT = require("../prompts/ieltsExaminer");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Verbatim transcription prompt — biases Whisper toward keeping disfluencies
const VERBATIM_PROMPT =
  "Transcribe exactly as spoken including all filler words like um, uh, er, hmm, ah, " +
  "repetitions, false starts, self-corrections, and hesitations. " +
  "Do NOT clean up, rephrase, or remove any disfluencies. Keep every word.";

/**
 * Transcribe audio using OpenAI Whisper API in verbatim mode.
 * Returns per-word timestamps for pause detection.
 *
 * @param {Buffer} audioBuffer - Raw audio file buffer
 * @param {string} mimeType - MIME type of the audio
 * @param {string} filename - Original filename with extension
 * @returns {Promise<Object>} Transcription result with text, words[], duration
 */
async function transcribeAudio(audioBuffer, mimeType, filename) {
  const file = await toFile(audioBuffer, filename, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
    language: "en",
    prompt: VERBATIM_PROMPT,
    response_format: "verbose_json",
    // "segment" granularity gives us per-segment avg_logprob (recognition
    // confidence) which we use as an intelligibility-based pronunciation signal.
    timestamp_granularities: ["word", "segment"],
  });

  let words = transcription.words || [];

  // Duration-weighted recognition confidence across segments. Whisper's
  // avg_logprob rises toward 0 when speech is clear/well-articulated and falls
  // when it is unclear or heavily mispronounced — a real intelligibility proxy.
  const segments = transcription.segments || [];
  let confidence = { avgLogprob: null, noSpeechProb: null, segmentCount: segments.length };
  if (segments.length > 0) {
    let totalDur = 0, wLogprob = 0, wNoSpeech = 0;
    for (const s of segments) {
      const dur = Math.max((s.end ?? 0) - (s.start ?? 0), 0.01);
      totalDur += dur;
      wLogprob += (s.avg_logprob ?? 0) * dur;
      wNoSpeech += (s.no_speech_prob ?? 0) * dur;
    }
    confidence.avgLogprob = wLogprob / totalDur;
    confidence.noSpeechProb = wNoSpeech / totalDur;
  }

  // Fallback: If no word-level timestamps, synthesize from full text
  if (words.length === 0 && transcription.text) {
    const allWords = transcription.text.trim().split(/\s+/);
    const duration = transcription.duration || 10.0;
    const wordDur = duration / Math.max(allWords.length, 1);
    let curr = 0;
    for (const w of allWords) {
      words.push({ word: w, start: curr, end: curr + wordDur });
      curr += wordDur;
    }
  }

  return {
    text: transcription.text,
    words: words,
    duration: transcription.duration || 0,
    confidence,
  };
}

// ─── Pronunciation (intelligibility) from Whisper confidence ─────────

/**
 * Map duration-weighted Whisper avg_logprob to an IELTS-style intelligibility
 * band. This measures how clearly the speech was understood by the recogniser
 * — a legitimate proxy for the "pronunciation" criterion's intelligibility
 * dimension. It is NOT phoneme-level scoring (that needs a dedicated acoustic
 * engine). Thresholds are calibrated estimates and may be tuned with samples.
 *
 * @param {Object} confidence - { avgLogprob, noSpeechProb, segmentCount }
 * @returns {Object|null} { band, method, descriptor, avgLogprob } or null
 */
function estimatePronunciation(confidence) {
  if (!confidence || confidence.avgLogprob == null || confidence.segmentCount === 0) {
    return null;
  }
  const lp = confidence.avgLogprob;

  let band;
  if (lp >= -0.15) band = 9.0;
  else if (lp >= -0.22) band = 8.5;
  else if (lp >= -0.30) band = 8.0;
  else if (lp >= -0.40) band = 7.5;
  else if (lp >= -0.50) band = 7.0;
  else if (lp >= -0.65) band = 6.5;
  else if (lp >= -0.80) band = 6.0;
  else if (lp >= -1.00) band = 5.5;
  else if (lp >= -1.25) band = 5.0;
  else band = 4.5;

  // Heavy non-speech/noise lowers confidence in the estimate — nudge down.
  if ((confidence.noSpeechProb ?? 0) > 0.5) band = Math.max(4.0, band - 0.5);

  let descriptor;
  if (band >= 8.5) descriptor = "Speech was highly clear and easily understood throughout — excellent intelligibility.";
  else if (band >= 7.5) descriptor = "Speech was clear and easy to follow, with only brief moments needing slightly more listener effort.";
  else if (band >= 6.5) descriptor = "Speech was generally intelligible; a few words were less clear and would benefit from sharper articulation.";
  else if (band >= 5.5) descriptor = "Speech was understandable but some stretches required real listener effort; clearer articulation would help.";
  else descriptor = "Several parts were hard to make out; clearer articulation and steadier pacing would noticeably improve intelligibility.";

  return {
    band,
    method: "intelligibility",
    descriptor,
    avgLogprob: Math.round(lp * 1000) / 1000,
  };
}

// ─── Pause detection from word timestamps ───────────────────────────

const PAUSE_THRESHOLD_SEC = 0.6;

/**
 * Detect hesitation pauses by scanning gaps between consecutive words.
 *
 * @param {Array} words - Array of { word, start, end }
 * @returns {Object} { count, totalPauseDuration, pauses: [{ afterWord, beforeWord, startTime, endTime, duration }] }
 */
function detectPauses(words) {
  const pauses = [];
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap >= PAUSE_THRESHOLD_SEC) {
      pauses.push({
        afterWord: words[i].word,
        beforeWord: words[i + 1].word,
        afterIndex: i,
        startTime: Math.round(words[i].end * 100) / 100,
        endTime: Math.round(words[i + 1].start * 100) / 100,
        duration: Math.round(gap * 100) / 100,
      });
    }
  }
  return {
    count: pauses.length,
    totalPauseDuration: Math.round(pauses.reduce((s, p) => s + p.duration, 0) * 100) / 100,
    pauses,
  };
}

// ─── Disfluency analysis via gpt-4o-mini ────────────────────────────

const DISFLUENCY_SYSTEM_PROMPT = `You are a speech disfluency analyzer for IELTS speaking tests.
Given a verbatim transcript (with word-level timestamps), identify ALL disfluencies.

Classify each disfluency into one of these categories:
- "filler": filler words/sounds (um, uh, er, hmm, ah, like [when used as filler], you know, I mean, so [when filler])
- "repetition": the same word or short phrase repeated immediately (e.g. "I I think", "the the", "I went I went to")
- "false_start": abandoned or self-corrected utterance (e.g. "I was go- I went", "She is- She was")

Return JSON with this exact structure:
{
  "fillers": [
    { "word": "um", "index": 5, "timestamp": 2.1 }
  ],
  "repetitions": [
    { "text": "I I", "indices": [10, 11], "timestamp": 4.3 }
  ],
  "false_starts": [
    { "original": "I was go-", "correction": "I went", "indices": [15, 16, 17], "timestamp": 6.0 }
  ],
  "summary": {
    "filler_count": 3,
    "repetition_count": 1,
    "false_start_count": 1,
    "total_disfluencies": 5,
    "disfluency_rate": 0.08,
    "filler_words_found": ["um", "uh"]
  }
}

Rules:
- disfluency_rate = total_disfluencies / total_word_count
- Include timestamps from the provided word data when possible
- Be thorough — catch every instance, not just obvious ones
- If there are NO disfluencies of a category, return an empty array for it
- Return ONLY valid JSON, no markdown`;

/**
 * Analyze transcript disfluencies (fillers, repetitions, false starts) using gpt-4o-mini.
 *
 * @param {string} transcript - Verbatim transcript text
 * @param {Array} words - Word-level timestamps [{ word, start, end }]
 * @returns {Promise<Object>} Structured disfluency analysis
 */
async function analyzeDisfluencies(transcript, words) {
  // Build a compact word list with indices + timestamps for the LLM
  const wordList = words
    .map((w, i) => `[${i}] "${w.word}" @${Math.round(w.start * 100) / 100}s`)
    .join("\n");

  const userMessage = `Transcript (${words.length} words):
"${transcript}"

Word-level timestamps:
${wordList}

Analyze all disfluencies in this speech. Return ONLY valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: DISFLUENCY_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Ensure expected structure
  return {
    fillers: result.fillers || [],
    repetitions: result.repetitions || [],
    false_starts: result.false_starts || [],
    summary: {
      filler_count: result.summary?.filler_count ?? result.fillers?.length ?? 0,
      repetition_count: result.summary?.repetition_count ?? result.repetitions?.length ?? 0,
      false_start_count: result.summary?.false_start_count ?? result.false_starts?.length ?? 0,
      total_disfluencies: result.summary?.total_disfluencies ?? 0,
      disfluency_rate: result.summary?.disfluency_rate ?? 0,
      filler_words_found: result.summary?.filler_words_found || [],
    },
  };
}

// ─── IELTS evaluation ───────────────────────────────────────────────

/**
 * Coerce a model-provided score into a valid IELTS band: a number clamped to
 * 0–9 and snapped to the nearest 0.5. Returns null when the value is missing or
 * not numeric, so callers can detect a malformed grade instead of propagating
 * NaN into the overall band.
 */
function normalizeBand(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const clamped = Math.min(9, Math.max(0, n));
  return Math.round(clamped * 2) / 2;
}

/**
 * Evaluate transcript using OpenAI gpt-4o-mini
 */
async function evaluateTranscript(transcript, questionText, questionPart) {
  const userMessage = `IELTS Speaking Question (Part ${questionPart}): "${questionText}"

Student's Transcript:
"${transcript}"

Evaluate this response now. Return ONLY valid JSON.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_EXAMINER_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  // Validate the three scores. With response_format=json_object the payload is
  // syntactically valid JSON, but the model can still omit a key or emit a
  // non-multiple-of-0.5 value — guard against that so the route never averages
  // undefined/NaN into the overall band.
  const fc = normalizeBand(parsed.fc);
  const lr = normalizeBand(parsed.lr);
  const gra = normalizeBand(parsed.gra);
  if (fc === null || lr === null || gra === null) {
    throw new Error(
      `Evaluator returned invalid scores (fc=${parsed.fc}, lr=${parsed.lr}, gra=${parsed.gra}). Please try again.`
    );
  }

  return { ...parsed, fc, lr, gra };
}

// ─── Question generation ────────────────────────────────────────────

/**
 * Generate IELTS speaking questions from a topic using OpenAI.
 *
 * @param {string} topic - The topic to generate questions for
 * @returns {Promise<Array>} Array of 3 question objects with part, topic, text
 */
async function generateQuestions(topic) {
  const prompt = `Generate exactly 3 realistic IELTS Speaking test questions about the topic "${topic}".

Return a JSON object with a "questions" key containing an array of exactly 3 objects, one for each part:
- Part 1: A simple, personal question (1-2 sentences)
- Part 2: A cue card long-turn prompt that says "Describe..." followed by 4 bullet points
- Part 3: An abstract/discussion question (1-2 sentences)

Each object must have these keys:
  "part": number (1, 2, or 3)
  "topic": string (the topic name)
  "text": string (the question text; for Part 2 use bullet character and line breaks between points)`;

  console.log(`Question generation: Generating for topic "${topic}"...`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You generate IELTS speaking questions. Return ONLY valid JSON with a \"questions\" key containing an array of 3 question objects." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = response.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    console.error("Question generation: Failed to parse OpenAI response.");
    console.error("Raw response (first 500 chars):", raw.substring(0, 500));
    // Try stripping markdown fences if model wrapped output
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  // Extract the array from whichever key the model used
  const questions = Array.isArray(parsed)
    ? parsed
    : parsed.questions || parsed.data || parsed.items || [];

  console.log(`Question generation: Generated ${questions.length} questions for "${topic}".`);
  return questions;
}

const IELTS_WRITING_GRAPH_PROMPT = require("../prompts/ieltsWritingGraphGenerator");

/**
 * Generate an IELTS Writing Task 1 chart using OpenAI.
 *
 * @returns {Promise<Object>} The generated task 1 object
 */
async function generateWritingTask1() {
  console.log(`Question generation: Generating new Writing Task 1 chart...`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_WRITING_GRAPH_PROMPT }
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const raw = response.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    console.error("Question generation: Failed to parse OpenAI Task 1 response.");
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(cleaned);
  }

  return parsed;
}

module.exports = {
  transcribeAudio,
  evaluateTranscript,
  generateQuestions,
  analyzeDisfluencies,
  detectPauses,
  estimatePronunciation,
  generateWritingTask1,
};
