const { OpenAI } = require("openai");
const IELTS_LISTENING_GENERATOR_PROMPT = require("../prompts/ieltsListeningGenerator");
const IELTS_LISTENING_EXAMINER_PROMPT = require("../prompts/ieltsListeningExaminer");
const { listeningBand } = require("../utils/bands");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Valid OpenAI TTS voices (tts-1 model). The generator is instructed to use
// only these; we still hard-validate so a typo can't break audio synthesis.
const VALID_VOICES = new Set(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]);
const DEFAULT_VOICE = "alloy";

// Section count map — used to validate the model's output shape.
const FULL_SECTIONS = [1, 2, 3, 4];

// ─── Generation ─────────────────────────────────────────────────────

/**
 * Build the script (multi-speaker utterances per section) + the answer key.
 * @param {Object} p
 * @param {'full'|'section'} [p.size='section']
 * @param {1|2|3|4} [p.whichSection=1]
 * @param {string} [p.topic]
 * @param {string} [p.difficulty]
 */
async function generateListeningScript({ size, whichSection, topic, difficulty }) {
  const testSize = size === "full" ? "full" : "section";
  const section = [1, 2, 3, 4].includes(Number(whichSection)) ? Number(whichSection) : 1;

  const userMessage = `TEST_SIZE: ${testSize}
WHICH_SECTION: ${testSize === "section" ? section : "N/A"}
DIFFICULTY (target band range): ${difficulty || "6.0–7.0"}
${topic ? `TOPIC: ${topic}` : "TOPIC: (you choose a fitting everyday/academic scenario)"}

Write the spoken script and questions now. Return ONLY valid JSON matching the contract.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_LISTENING_GENERATOR_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const raw = JSON.parse(response.choices[0].message.content);

  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  if (sections.length === 0) {
    throw new Error("Generator returned no sections.");
  }
  if (testSize === "full" && sections.length !== 4) {
    // Tolerate but warn — we'll still ship what came back.
    console.warn(
      `Listening: requested full test but got ${sections.length} sections (expected 4).`
    );
  }

  const normalized = sections.map((s, sIdx) => normalizeSection(s, sIdx, testSize));
  return {
    title: (raw.title || "IELTS Listening Practice").toString(),
    size: testSize,
    sections: normalized,
  };
}

function normalizeSection(s, sIdx, testSize) {
  const number = Number.isFinite(s?.number) ? s.number : (testSize === "full" ? FULL_SECTIONS[sIdx] : (sIdx + 1));
  // Speakers — used in the UI legend.
  const speakers = (Array.isArray(s?.speakers) ? s.speakers : [])
    .map((sp) => ({
      label: (sp?.label || "Speaker").toString(),
      voice: VALID_VOICES.has(sp?.voice) ? sp.voice : DEFAULT_VOICE,
    }));
  // Utterances — voice-per-line, defaults applied if model slipped.
  const utterances = (Array.isArray(s?.utterances) ? s.utterances : []).map((u, i) => ({
    id: `s${number}u${i + 1}`,
    speaker: (u?.speaker || "Speaker").toString(),
    voice: VALID_VOICES.has(u?.voice) ? u.voice : DEFAULT_VOICE,
    text: (u?.text || "").toString().trim(),
  })).filter((u) => u.text.length > 0);

  // Questions — strict typing on the answer key.
  const questions = (Array.isArray(s?.questions) ? s.questions : []).map((q, i) => ({
    id: q?.id || `s${number}q${i + 1}`,
    number: Number.isFinite(q?.number) ? q.number : i + 1,
    type: ["gap", "mcq", "matching", "tfng"].includes(q?.type) ? q.type : "gap",
    prompt: (q?.prompt || "").toString(),
    instruction: (q?.instruction || "").toString(),
    options: Array.isArray(q?.options) ? q.options.map(String) : [],
    context: (q?.context || "").toString(),
    answer: (q?.answer ?? "").toString(),
    acceptableAnswers: Array.isArray(q?.acceptableAnswers) ? q.acceptableAnswers.map(String) : [],
    explanation: (q?.explanation || "").toString(),
  }));

  return {
    number,
    title: (s?.title || `Section ${number}`).toString(),
    context: (s?.context || "").toString(),
    speakers,
    utterances,
    questions,
  };
}

// ─── TTS synthesis ──────────────────────────────────────────────────

/**
 * Synthesize audio for every utterance in every section using OpenAI TTS.
 * Returns the sections with each utterance carrying `audioBase64` (mp3 data).
 * Runs in small parallel batches to stay under rate limits.
 */
async function synthesizeAllAudio(script) {
  const BATCH = 4; // parallel OpenAI TTS calls — small to be polite under rate limits
  const out = [];
  for (const section of script.sections) {
    const newUtts = [];
    for (let i = 0; i < section.utterances.length; i += BATCH) {
      const chunk = section.utterances.slice(i, i + BATCH);
      const synthesized = await Promise.all(chunk.map(synthesizeOne));
      newUtts.push(...synthesized);
    }
    out.push({ ...section, utterances: newUtts });
  }
  return { ...script, sections: out };
}

async function synthesizeOne(utt) {
  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: VALID_VOICES.has(utt.voice) ? utt.voice : DEFAULT_VOICE,
      input: utt.text,
      response_format: "mp3",
    });
    const buf = Buffer.from(await speech.arrayBuffer());
    return { ...utt, audioBase64: buf.toString("base64"), mime: "audio/mpeg" };
  } catch (err) {
    console.warn(`TTS failed for utterance ${utt.id}: ${err.message}`);
    // Non-fatal — return the utterance without audio so the player can still
    // surface the script text (graceful degradation).
    return { ...utt, audioBase64: null, mime: null, audioError: err.message };
  }
}

// ─── Marking ────────────────────────────────────────────────────────

function normalizeAnswer(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[.,;:!?'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripArticle(s) {
  return s.replace(/^(a|an|the)\s+/, "").trim();
}

// Digit ↔ word equivalence for the IELTS-common cases — speakers may say
// "eleven a.m." while the candidate writes "11 am" (or vice versa). We
// normalise both sides through this small table before comparison.
const NUM_WORDS = {
  zero: "0", oh: "0",
  one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9",
  ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19",
  twenty: "20", thirty: "30", forty: "40", fifty: "50",
  sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000",
};

function numberish(s) {
  return s
    .split(" ")
    .map((w) => NUM_WORDS[w] || w)
    .join(" ")
    .replace(/\b(\d+)\s+(\d+)\b/g, "$1$2"); // collapse "1 1" into "11"
}

/** Deterministically decide whether one student answer is correct. */
function markOne(question, studentAnswerRaw) {
  const student = normalizeAnswer(studentAnswerRaw);
  if (!student) return false;
  const canonical = normalizeAnswer(question.answer);

  if (["mcq", "matching", "tfng"].includes(question.type)) {
    return student === canonical;
  }

  // gap — accept canonical + variants + article/number tolerance.
  const candidates = [question.answer, ...(question.acceptableAnswers || [])]
    .map(normalizeAnswer)
    .filter(Boolean);
  for (const c of candidates) {
    if (student === c) return true;
    if (stripArticle(student) === stripArticle(c)) return true;
    if (numberish(student) === numberish(c)) return true;
    if (numberish(stripArticle(student)) === numberish(stripArticle(c))) return true;
  }
  return false;
}

/**
 * Mark a full listening attempt and build a banded, coached result.
 * @param {Object} p
 * @param {Object} p.script           { title, size, sections } — key-bearing
 * @param {Object} p.answers          map of questionId -> student answer
 */
async function evaluateListening({ script, answers }) {
  // Flatten all questions across all sections (preserves section grouping in results).
  const sectionResults = script.sections.map((section) => {
    const qResults = section.questions.map((q) => {
      const studentAnswer = answers?.[q.id] ?? "";
      const correct = markOne(q, studentAnswer);
      return {
        id: q.id,
        number: q.number,
        type: q.type,
        prompt: q.prompt,
        studentAnswer: (studentAnswer || "").toString(),
        correctAnswer: q.answer,
        correct,
        explanation: q.explanation,
        sectionNumber: section.number,
        sectionTitle: section.title,
      };
    });
    return {
      number: section.number,
      title: section.title,
      questions: qResults,
      correctCount: qResults.filter((r) => r.correct).length,
      total: qResults.length,
    };
  });

  const allResults = sectionResults.flatMap((sr) => sr.questions);
  const total = allResults.length;
  const correctCount = allResults.filter((r) => r.correct).length;
  const overallBand = listeningBand(correctCount, total);

  let feedback;
  try {
    feedback = await generateFeedback({ overallBand, correctCount, total, sectionResults });
  } catch (err) {
    console.warn(`Listening feedback: failed (${err.message}); using fallback.`);
    feedback = fallbackFeedback(allResults, correctCount, total);
  }

  return {
    overallBand,
    correctCount,
    total,
    accuracy: total ? Math.round((correctCount / total) * 100) : 0,
    sectionResults,
    feedback,
    title: script.title,
    size: script.size,
  };
}

async function generateFeedback({ overallBand, correctCount, total, sectionResults }) {
  const sectionLines = sectionResults
    .map(
      (sr) =>
        `Section ${sr.number} "${sr.title}" — ${sr.correctCount}/${sr.total}\n` +
        sr.questions
          .map(
            (r) =>
              `  Q${r.number} [${r.type}] ${r.correct ? "CORRECT" : "WRONG"} — yours: "${r.studentAnswer || "(blank)"}", correct: "${r.correctAnswer}"`
          )
          .join("\n")
    )
    .join("\n\n");

  const userMessage = `BAND ACHIEVED: ${overallBand} (${correctCount}/${total} correct)

MARKED ANSWERS:
${sectionLines}

Write the feedback JSON now.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_LISTENING_EXAMINER_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return {
    summary: parsed.summary || "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    strategies: Array.isArray(parsed.strategies) ? parsed.strategies : [],
  };
}

function fallbackFeedback(results, correctCount, total) {
  const missedTypes = [...new Set(results.filter((r) => !r.correct).map((r) => r.type))];
  return {
    summary: `You answered ${correctCount} of ${total} correctly.`,
    strengths: correctCount > 0 ? ["You answered several questions correctly across the test."] : [],
    weaknesses: missedTypes.length ? [`Review the question types you missed: ${missedTypes.join(", ")}.`] : [],
    strategies: ["Re-listen to the section and locate the exact line that proved the answer for each miss."],
  };
}

// ─── Public helpers ─────────────────────────────────────────────────

/** Strip the key fields before sending questions to the browser. */
function toPublicSection(section) {
  return {
    number: section.number,
    title: section.title,
    context: section.context,
    speakers: section.speakers,
    // Audio is what the browser plays — key fields stay server-side.
    utterances: section.utterances.map((u) => ({
      id: u.id,
      speaker: u.speaker,
      voice: u.voice,
      audioBase64: u.audioBase64,
      mime: u.mime,
      audioError: u.audioError || null,
      // Include the spoken text only if there was an audio error (graceful fallback).
      text: u.audioBase64 ? undefined : u.text,
    })),
    questions: section.questions.map((q) => ({
      id: q.id,
      number: q.number,
      type: q.type,
      prompt: q.prompt,
      instruction: q.instruction,
      options: q.options,
      context: q.context,
    })),
  };
}

module.exports = {
  generateListeningScript,
  synthesizeAllAudio,
  evaluateListening,
  toPublicSection,
};
