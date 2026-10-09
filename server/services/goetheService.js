const { OpenAI } = require("openai");
const {
  buildWritingExaminerPrompt,
  buildSpeakingExaminerPrompt,
} = require("../prompts/goetheExaminer");
const {
  BAND_FACTORS,
  sanitizeLevel,
  getLevelFormat,
  getWritingAufgabe,
  getSpeakingTeil,
  bandToPoints,
} = require("../config/goetheExamFormat");
const { callWithRetry, parseJsonContent, LlmValidationError } = require("../utils/llmRetry");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Determine Prädikat according to the official Goethe-Zertifikat rules:
 * 100–90: sehr gut
 * 89–80: gut
 * 79–70: befriedigend
 * 69–60: ausreichend (bestanden)
 * 59–0: nicht bestanden
 */
function getGoethePraedikat(scoreOutOf100) {
  const s = Math.round(scoreOutOf100);
  if (s >= 90) return { key: "sehr_gut", label: "Sehr gut", passed: true };
  if (s >= 80) return { key: "gut", label: "Gut", passed: true };
  if (s >= 70) return { key: "befriedigend", label: "Befriedigend", passed: true };
  if (s >= 60) return { key: "ausreichend", label: "Ausreichend", passed: true };
  return { key: "nicht_bestanden", label: "Nicht bestanden", passed: false };
}

/** Count words using German hyphen and space rules */
function countGermanWords(text) {
  const clean = (text || "").trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Read one band per criterion from the model output (top-level "bands" or
 * criteriaAnalysis[key].band). Throws a retryable error if any is missing.
 */
function extractBands(parsed, criteria) {
  const bands = {};
  for (const c of criteria) {
    const raw = parsed?.bands?.[c.key] ?? parsed?.criteriaAnalysis?.[c.key]?.band;
    const band = String(raw || "").trim().toUpperCase();
    if (!(band in BAND_FACTORS)) {
      throw new LlmValidationError(`Kein gültiges Band für Kriterium "${c.key}"`);
    }
    bands[c.key] = band;
  }
  return bands;
}

/** Points per criterion from bands; Erfüllung = E zeroes the whole task. */
function scoreFromBands(criteria, bands) {
  const knockOut = bands.erfuellung === "E";
  const scores = {};
  for (const c of criteria) scores[c.key] = knockOut ? 0 : bandToPoints(bands[c.key], c.max);
  const totalPoints = round2(Object.values(scores).reduce((s, v) => s + v, 0));
  return { scores, totalPoints, knockOut };
}

/**
 * Evaluates a Goethe Schreiben Aufgabe for any supported level.
 * Rubric, criteria and max points come from the FORMAT config.
 */
async function evaluateGoetheWriting({
  level = "B1",
  taskNumber = 1,
  prompt,
  response,
  studentName = "Student",
  model = "gpt-4o",
}) {
  const lvl = sanitizeLevel(level);
  const aufgabe = getWritingAufgabe(lvl, taskNumber);
  const wordCount = countGermanWords(response);
  const [minW, maxW] = aufgabe.words;
  const knockoutWords = Math.floor(minW * 0.5);
  const tooShort = wordCount < knockoutWords;

  const userMessage = `AUFGABE: Goethe-Zertifikat ${lvl}, Schreiben Aufgabe ${aufgabe.nr} (${aufgabe.label})
RICHTWERT: ${minW === maxW ? `circa ${minW}` : `${minW}–${maxW}`} Wörter
TATSÄCHLICHE WORTZAHL (bereits exakt gezählt): ${wordCount} Wörter${tooShort ? ` — UNTER 50 % DER VORGABE: Erfüllung muss Band E sein.` : ""}

AUFGABENSTELLUNG:
"""
${prompt}
"""

TEXT DES TEILNEHMERS:
"""
${response}
"""

Bewerte diesen Text jetzt streng nach den Kriterien für Aufgabe ${aufgabe.nr}. Gib NUR valides JSON zurück.`;

  const { parsed, bands } = await callWithRetry(async () => {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildWritingExaminerPrompt(lvl, aufgabe.nr) },
        { role: "user", content: userMessage },
      ],
    });
    const json = parseJsonContent(completion);
    return { parsed: json, bands: extractBands(json, aufgabe.criteria) };
  }, 2, "Goethe Schreiben-Bewertung");

  // The word-count knock-out is deterministic; never leave it to the model.
  if (tooShort) bands.erfuellung = "E";

  const { scores, totalPoints, knockOut } = scoreFromBands(aufgabe.criteria, bands);
  const scaledPoints100 = Math.round((totalPoints / aufgabe.maxPoints) * 100);
  const praedikatInfo = getGoethePraedikat(scaledPoints100);

  const criteriaAnalysis = { ...(parsed.criteriaAnalysis || {}) };
  for (const c of aufgabe.criteria) {
    criteriaAnalysis[c.key] = { ...(criteriaAnalysis[c.key] || {}), band: bands[c.key], points: scores[c.key] };
  }

  return {
    ...parsed,
    level: lvl,
    taskNumber: aufgabe.nr,
    taskLabel: aufgabe.label,
    wordCount,
    targetWords: aufgabe.words,
    bands,
    scores,
    maxScores: Object.fromEntries(aufgabe.criteria.map((c) => [c.key, c.max])),
    criteriaAnalysis,
    knockOut,
    totalPoints,
    maxPoints: aufgabe.maxPoints,
    // Aufgaben max points add up to 100 per level, so these are module points.
    modulePoints: totalPoints,
    scaledPoints100,
    praedikat: praedikatInfo.label,
    passed: praedikatInfo.passed,
    metadata: {
      studentName,
      timestamp: new Date().toISOString(),
      evalModel: model,
    },
  };
}

/**
 * Evaluates a Goethe Sprechen Teil for any supported level.
 * Pass `transcript` for a monologue, or `history` ([{speaker, text}]) for a
 * dialogue with the AI partner — only the candidate's turns are graded.
 */
async function evaluateGoetheSpeaking({
  level = "B1",
  part = 1,
  prompt = "",
  topic = "",
  transcript = "",
  history = null,
  slideNotes = null,
  studentName = "Student",
  model = "gpt-4o",
}) {
  const lvl = sanitizeLevel(level);
  const fmt = getLevelFormat(lvl);
  const teil = getSpeakingTeil(lvl, part);
  const aussprache = { key: "aussprache", label: "Aussprache", max: fmt.sprechen.ausspracheMax };
  const allCriteria = [...teil.criteria, aussprache];
  const teilMax = teil.criteria.reduce((s, c) => s + c.max, 0);
  const isDialogue = Array.isArray(history) && history.length > 0;

  const spoken = isDialogue
    ? history
        .map((turn, i) => {
          const label =
            turn.speaker === "candidate" || turn.role === "user"
              ? "KANDIDAT"
              : turn.speaker === "examiner"
              ? "PRÜFER"
              : "PARTNER";
          return `${i + 1}. [${label}]: ${turn.text}`;
        })
        .join("\n\n")
    : transcript;

  const userMessage = `PRÜFUNGSTEIL: Goethe-Zertifikat ${lvl}, Sprechen Teil ${teil.teil} (${teil.title})
THEMA: ${topic || "Allgemeines Prüfungsthema"}
${prompt ? `\nAUFGABENSTELLUNG / VORGABEN:\n"""\n${prompt}\n"""\n` : ""}${slideNotes ? `\nNOTIZEN DES KANDIDATEN:\n${JSON.stringify(slideNotes, null, 2)}\n` : ""}
${isDialogue ? "VOLLSTÄNDIGER DIALOGABLAUF" : "GESPROCHENER TEXT (TRANSKRIPT)"}:
"""
${spoken || "Keine Äußerung erfasst."}
"""

Bewerte diese mündliche Leistung jetzt streng nach den Kriterien für Teil ${teil.teil}. Gib NUR valides JSON zurück.`;

  const { parsed, bands } = await callWithRetry(async () => {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSpeakingExaminerPrompt(lvl, teil.teil, { dialogue: isDialogue }) },
        { role: "user", content: userMessage },
      ],
    });
    const json = parseJsonContent(completion);
    return { parsed: json, bands: extractBands(json, allCriteria) };
  }, 2, "Goethe Sprechen-Bewertung");

  // Knock-out applies to the Teil criteria; Aussprache is rated for the whole exam.
  const teilResult = scoreFromBands(teil.criteria, bands);
  const ausspracheScore = bandToPoints(bands.aussprache, aussprache.max);
  const scores = { ...teilResult.scores, aussprache: ausspracheScore };
  const maxPoints = teilMax + aussprache.max;
  const totalPoints = round2(teilResult.totalPoints + ausspracheScore);
  const scaledPoints100 = Math.round((totalPoints / maxPoints) * 100);
  const praedikatInfo = getGoethePraedikat(scaledPoints100);

  return {
    ...parsed,
    level: lvl,
    part: teil.teil,
    partTitle: teil.title,
    bands,
    scores,
    maxScores: Object.fromEntries(allCriteria.map((c) => [c.key, c.max])),
    knockOut: teilResult.knockOut,
    teilPoints: teilResult.totalPoints,
    teilMaxPoints: teilMax,
    ausspracheBand: bands.aussprache,
    totalPoints,
    maxPoints,
    scaledPoints100,
    praedikat: praedikatInfo.label,
    passed: praedikatInfo.passed,
    metadata: {
      studentName,
      timestamp: new Date().toISOString(),
      evalModel: model,
    },
  };
}

module.exports = {
  getGoethePraedikat,
  countGermanWords,
  evaluateGoetheWriting,
  evaluateGoetheSpeaking,
};
