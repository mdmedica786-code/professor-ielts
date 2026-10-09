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

// ─── Acoustic pronunciation (Azure, de-DE) ──────────────────────────

// German hesitation sounds as Whisper writes them (it is prompted to keep them).
const FILLER_RE = /(?<!\p{L})(?:äh+m*|öh+m*|eh+m+|hm+|mhm)(?!\p{L})/giu;

function countFillers(text) {
  return (String(text || '').match(FILLER_RE) || []).length;
}

/**
 * Compact per-utterance summary of an Azure pronunciation result, safe to
 * send to the client and back with the transcript.
 */
function summarizePronunciation(azure, transcript) {
  const words = countGermanWords(transcript);
  const fillers = countFillers(transcript);
  if (!azure) return { source: 'transcript', wordCount: words, fillerCount: fillers };
  const pauses = azure.timing?.longPauses || [];
  return {
    source: 'azure',
    accuracy: azure.accuracy,
    fluency: azure.fluency,
    completeness: azure.completeness,
    wordCount: azure.wordCount || words,
    fillerCount: fillers,
    wordsPerMinute: azure.timing?.wordsPerMinute || null,
    longPauses: pauses.length,
    longestPause: pauses.reduce((m, p) => Math.max(m, p.seconds), 0),
    mispronounced: (azure.mispronounced || [])
      .slice()
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 8)
      .map((w) => ({ word: w.word, accuracy: Math.round(w.accuracy) })),
  };
}

/** Word-weighted totals over all candidate utterances of a Teil. */
function aggregatePronunciation(summaries) {
  const list = (summaries || []).filter(Boolean);
  if (!list.length) return null;
  const measured = list.filter((p) => p.source === 'azure' && p.wordCount > 0);
  const words = list.reduce((n, p) => n + (p.wordCount || 0), 0);
  const fillers = list.reduce((n, p) => n + (p.fillerCount || 0), 0);
  const base = { words, fillerCount: fillers, fillersPer100Words: words ? round2((fillers / words) * 100) : 0 };
  if (!measured.length) return { ...base, source: 'transcript' };
  const mw = measured.reduce((n, p) => n + p.wordCount, 0);
  const avg = (key) => Math.round((measured.reduce((sum, p) => sum + (p[key] || 0) * p.wordCount, 0) / mw) * 10) / 10;
  const wordScores = new Map();
  measured.forEach((p) => (p.mispronounced || []).forEach((w) => {
    if (!wordScores.has(w.word) || wordScores.get(w.word) > w.accuracy) wordScores.set(w.word, w.accuracy);
  }));
  return {
    ...base,
    source: 'azure',
    accuracy: avg('accuracy'),
    fluency: avg('fluency'),
    longPauses: measured.reduce((n, p) => n + (p.longPauses || 0), 0),
    mispronounced: [...wordScores.entries()]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 10)
      .map(([word, accuracy]) => ({ word, accuracy })),
  };
}

/**
 * Aussprache band from the acoustic measurement. Heuristic calibration:
 * 60 % segmental accuracy + 40 % fluency, thresholds chosen so that clear,
 * easily understandable learner German reaches A/B and listener effort
 * (frequent errors, halting speech) drops to D/E.
 */
const AUSSPRACHE_THRESHOLDS = [
  ['A', 85],
  ['B', 72],
  ['C', 58],
  ['D', 42],
];
function ausspracheBandFromAzure(agg) {
  const score = 0.6 * agg.accuracy + 0.4 * agg.fluency;
  return (AUSSPRACHE_THRESHOLDS.find(([, min]) => score >= min) || ['E'])[0];
}

function pronunciationPromptBlock(agg) {
  if (!agg) return '';
  const fillerLine = `Füllwörter (äh, ähm, hm …): ${agg.fillerCount} bei ${agg.words} Wörtern (${agg.fillersPer100Words} pro 100 Wörter).`;
  if (agg.source !== 'azure') {
    return `\nSPRECHFLUSS (aus der Transkription): ${fillerLine}\n`;
  }
  const words = agg.mispronounced.length ? agg.mispronounced.map((w) => `${w.word} (${w.accuracy})`).join(', ') : 'keine auffälligen Wörter';
  return `
AKUSTISCHE AUSSPRACHEMESSUNG (Azure, Deutsch):
- Lautliche Genauigkeit: ${agg.accuracy}/100 · Flüssigkeit: ${agg.fluency}/100
- Auffällig ausgesprochene Wörter (Genauigkeit 0–100): ${words}
- Lange Pausen (≥ 1 s): ${agg.longPauses}
- ${fillerLine}
Das Band für "aussprache" wird aus dieser Messung berechnet (${ausspracheBandFromAzure(agg)}). Begründe es in criteriaAnalysis.aussprache und gib in pronunciationTips konkrete Hinweise zu den auffälligen Wörtern.
`;
}

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
  pronunciation = null,
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

  // Acoustic measurements travel with each candidate turn (dialogue) or come
  // directly from the route (monologue upload); filler words always come
  // from the transcript.
  const candidateTurns = isDialogue ? history.filter((t) => t.speaker === "candidate" || t.role === "user") : [];
  const pronAgg = isDialogue
    ? aggregatePronunciation(candidateTurns.map((t) => t.pronunciation || summarizePronunciation(null, t.text)))
    : aggregatePronunciation([pronunciation || summarizePronunciation(null, transcript)]);

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
${pronunciationPromptBlock(pronAgg)}
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

  // A measured Aussprache band replaces the model's estimate from the transcript.
  const ausspracheSource = pronAgg?.source === "azure" ? "azure" : "transcript";
  if (ausspracheSource === "azure") bands.aussprache = ausspracheBandFromAzure(pronAgg);

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
    ausspracheSource,
    pronunciationMetrics: pronAgg,
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
  countFillers,
  summarizePronunciation,
  aggregatePronunciation,
  ausspracheBandFromAzure,
  evaluateGoetheWriting,
  evaluateGoetheSpeaking,
};
