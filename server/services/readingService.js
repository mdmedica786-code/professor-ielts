const { OpenAI } = require("openai");
const IELTS_READING_GENERATOR_PROMPT = require("../prompts/ieltsReadingGenerator");
const IELTS_READING_EXAMINER_PROMPT = require("../prompts/ieltsReadingExaminer");
const { readingBand } = require("../utils/bands");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODULE_LABEL = { academic: "Academic", general: "General Training" };

function countWords(text) {
  const t = (text || "").trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

/** Normalise an answer for tolerant comparison. */
function normalizeAnswer(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[.,;:!?'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop a single leading article so "the brain" matches "brain". */
function stripArticle(s) {
  return s.replace(/^(a|an|the)\s+/, "").trim();
}

// ─── Generation ─────────────────────────────────────────────────────

/**
 * Generate (or wrap a supplied) reading passage + question set.
 * @param {Object} p
 * @param {'academic'|'general'} p.module
 * @param {string} p.difficulty   - target band range label, e.g. "6.5–7.5"
 * @param {string} [p.topic]      - optional topic
 * @param {string} [p.passage]    - student-supplied passage (bring-your-own)
 * @param {string} [p.questionsHint] - optional question hints
 * @param {number} [p.count]      - question count (default 8)
 */
async function generateReading({ module, difficulty, topic, passage, questionsHint, count }) {
  const moduleLabel = MODULE_LABEL[module] || "Academic";
  const n = Math.max(3, Math.min(14, parseInt(count) || 8));

  const userMessage = `MODULE: ${moduleLabel}
DIFFICULTY (target band range): ${difficulty || "6.0–7.0"}
QUESTION COUNT: ${n}
${topic ? `TOPIC: ${topic}` : ""}
${questionsHint ? `QUESTION HINTS:\n${questionsHint}` : ""}
${passage && passage.trim()
      ? `SUPPLIED PASSAGE (use verbatim as "text" — do NOT rewrite):\n"""\n${passage.trim()}\n"""`
      : "No passage supplied — WRITE an original passage."}

Produce the passage and exactly ${n} questions. Return ONLY valid JSON matching the contract.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_READING_GENERATOR_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  const text =
    passage && passage.trim()
      ? passage.trim()
      : (parsed.passage?.text || "").toString();

  const questions = (Array.isArray(parsed.questions) ? parsed.questions : []).map(
    (q, i) => ({
      id: q.id || `q${i + 1}`,
      number: q.number || i + 1,
      type: ["tfng", "ynng", "mcq", "gap", "heading"].includes(q.type) ? q.type : "mcq",
      prompt: (q.prompt || "").toString(),
      instruction: (q.instruction || "").toString(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      // The answer key + explanation are kept server-bound in the response, but
      // the route strips them before sending to the client so a user can't peek.
      answer: (q.answer ?? "").toString(),
      acceptableAnswers: Array.isArray(q.acceptableAnswers)
        ? q.acceptableAnswers.map(String)
        : [],
      paragraph: (q.paragraph || "").toString(),
      explanation: (q.explanation || "").toString(),
    })
  );

  return {
    passage: {
      title: (parsed.passage?.title || (passage ? "Your passage" : "Reading Passage")).toString(),
      text,
      wordCount: countWords(text),
    },
    questions,
    module,
    difficulty: difficulty || "6.0–7.0",
  };
}

// ─── Marking ────────────────────────────────────────────────────────

/** Deterministically decide whether one student answer is correct. */
function markOne(question, studentAnswerRaw) {
  const student = normalizeAnswer(studentAnswerRaw);
  if (!student) return false;
  const canonical = normalizeAnswer(question.answer);

  if (["tfng", "ynng", "mcq", "heading"].includes(question.type)) {
    return student === canonical;
  }

  // gap — accept the canonical answer or any acceptable variant, with tolerant
  // article handling on both sides.
  const candidates = [question.answer, ...(question.acceptableAnswers || [])]
    .map(normalizeAnswer)
    .filter(Boolean);
  for (const c of candidates) {
    if (student === c) return true;
    if (stripArticle(student) === stripArticle(c)) return true;
  }
  return false;
}

/**
 * Mark a reading attempt and build a banded, coached result.
 * @param {Object} p
 * @param {'academic'|'general'} p.module
 * @param {Object} p.passage      - { title, text }
 * @param {Array}  p.questions    - questions WITH answer key (server-held)
 * @param {Object} p.answers      - map of questionId -> student answer
 */
async function evaluateReading({ module, passage, questions, answers }) {
  const total = questions.length;
  const results = questions.map((q) => {
    const studentAnswer = answers?.[q.id] ?? "";
    const correct = markOne(q, studentAnswer);
    return {
      id: q.id,
      number: q.number,
      type: q.type,
      prompt: q.prompt,
      paragraph: q.paragraph,
      studentAnswer: (studentAnswer || "").toString(),
      correctAnswer: q.answer,
      correct,
      explanation: q.explanation,
    };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const overallBand = readingBand(correctCount, total, module);

  // AI coaching is non-fatal — fall back to a simple heuristic if it fails.
  let feedback;
  try {
    feedback = await generateFeedback({ passage, results, overallBand, correctCount, total });
  } catch (err) {
    console.warn(`Reading feedback: failed (${err.message}); using fallback.`);
    feedback = fallbackFeedback(results, correctCount, total);
  }

  return {
    overallBand,
    correctCount,
    total,
    accuracy: total ? Math.round((correctCount / total) * 100) : 0,
    module,
    results,
    feedback,
  };
}

async function generateFeedback({ passage, results, overallBand, correctCount, total }) {
  const marked = results
    .map(
      (r) =>
        `Q${r.number} [${r.type}] ${r.correct ? "CORRECT" : "WRONG"} — your answer: "${r.studentAnswer || "(blank)"}", correct: "${r.correctAnswer}"`
    )
    .join("\n");

  const userMessage = `PASSAGE TITLE: ${passage?.title || "Reading Passage"}
BAND ACHIEVED: ${overallBand} (${correctCount}/${total} correct)

MARKED ANSWERS:
${marked}

Write the feedback JSON now.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_READING_EXAMINER_PROMPT },
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
    strengths: correctCount > 0 ? ["You correctly handled several questions in this passage."] : [],
    weaknesses: missedTypes.length
      ? [`Review the question types you missed: ${missedTypes.join(", ")}.`]
      : [],
    strategies: ["Re-read the passage sentences linked to each missed question and confirm the exact evidence."],
  };
}

module.exports = { generateReading, evaluateReading, countWords };
