const { OpenAI } = require("openai");
const {
  GOETHE_WRITING_EXAMINER_PROMPT,
  GOETHE_SPEAKING_EXAMINER_PROMPT,
} = require("../prompts/goetheExaminer");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Determine Prädikat according to Goethe-Zertifikat B1 official rules:
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

/**
 * Evaluates a Goethe Writing task (Aufgabe 1, 2, or 3)
 */
async function evaluateGoetheWriting({
  taskNumber = 1,
  prompt,
  response,
  studentName = "Student",
  model = "gpt-4o",
}) {
  const wordCount = countGermanWords(response);
  const targetWords = taskNumber === 3 ? 40 : 80;
  const maxPoints = taskNumber === 3 ? 20 : 40;

  const userMessage = `AUFGABE: Aufgabe ${taskNumber} (${taskNumber === 1 ? "Persönliche E-Mail/Brief" : taskNumber === 2 ? "Diskussionsforum / Meinung" : "Formelle E-Mail"})
RICHTWERT WORTE: ca. ${targetWords} Wörter
TATSÄCHLICHE WORTZAHL (bereits exakt gezählt): ${wordCount} Wörter

AUFGABENSTELLUNG:
"""
${prompt}
"""

TEXT DES TEILNEHMERS:
"""
${response}
"""

Bewerte diesen Text nun streng nach den Goethe B1 Richtlinien (Erfüllung, Kohärenz, Wortschatz, Strukturen). Beachte die Knock-Out-Regel (< 50% Wortzahl oder Thema verfehlt = Erfüllung E = 0 Punkte für die gesamte Aufgabe). Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GOETHE_WRITING_EXAMINER_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");

  // Ensure scaled score and praedikat are accurate
  const totalPoints = typeof parsed.totalPoints === "number" ? parsed.totalPoints : 0;
  const scaledPoints100 = Math.round((totalPoints / maxPoints) * 100);
  const praedikatInfo = getGoethePraedikat(scaledPoints100);

  return {
    ...parsed,
    wordCount,
    taskNumber,
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

/**
 * Evaluates a Goethe Speaking task (Teil 1, 2, or 3)
 */
async function evaluateGoetheSpeaking({
  part = 2,
  prompt,
  topic,
  transcript,
  slideNotes = null,
  studentName = "Student",
  model = "gpt-4o",
}) {
  const partTitle =
    part === 1
      ? "Teil 1: Gemeinsam etwas planen"
      : part === 2
      ? "Teil 2: Ein Thema präsentieren"
      : "Teil 3: Über das Thema sprechen";

  const userMessage = `PRÜFUNGSTEIL: ${partTitle} (Teil ${part})
THEMA: ${topic || "Allgemeines Prüfungsthema"}

AUFGABENSTELLUNG / VORGABEN:
"""
${prompt || ""}
"""

${slideNotes ? `NOTIZEN ZU DEN 5 FOLIEN:\n${JSON.stringify(slideNotes, null, 2)}\n` : ""}

GESPROCHENER TEXT (TRANSKRIPT):
"""
${transcript}
"""

Bewerte diese mündliche Leistung streng nach den Bewertungskriterien des Goethe-Instituts. Beachte die 5-Folien-Struktur in Teil 2, die Interaktionsdynamik in Teil 1 und die Frage-/Feedbackkultur in Teil 3 sowie die Aussprache. Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GOETHE_SPEAKING_EXAMINER_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const maxPartPoints = part === 1 ? 28 : part === 2 ? 40 : 16;
  const scaledPoints100 = parsed.scaledPoints100 || Math.round((parsed.totalPoints / (parsed.maxPoints || maxPartPoints)) * 100);
  const praedikatInfo = getGoethePraedikat(scaledPoints100);

  return {
    ...parsed,
    part,
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
