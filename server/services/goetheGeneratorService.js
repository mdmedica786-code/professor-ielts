const { OpenAI, toFile } = require("openai");
const {
  GOETHE_READING_GENERATOR_PROMPT,
  GOETHE_LISTENING_GENERATOR_PROMPT,
  GOETHE_WRITING_GENERATOR_PROMPT,
  GOETHE_SPEAKING_PARTNER_PROMPT,
  GOETHE_SPEAKING_DIALOGUE_EXAMINER_PROMPT,
} = require("../prompts/goetheGeneratorPrompts");
const { getGoethePraedikat } = require("./goetheService");
const { transcribeAudio } = require("./openaiService");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Valid CEFR levels supported
const SUPPORTED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1"]);

function sanitizeLevel(lvl) {
  const clean = (lvl || "B1").toString().trim().toUpperCase();
  return SUPPORTED_LEVELS.has(clean) ? clean : "B1";
}

function normalizeAnswer(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/[.,;:!?'"()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── 1. READING (Leseverstehen) ────────────────────────────────────────

async function generateGoetheReading({ level = "B1", topic = "", partNumber = 1 }) {
  const targetLevel = sanitizeLevel(level);
  const part = parseInt(partNumber, 10) || 1;

  const userMessage = `NIVEAUSTUFE: ${targetLevel}
TEIL: ${part}
${topic ? `THEMA: ${topic}` : "THEMA: Alltägliches / Gesellschaftliches Prüfungsthema nach Goethe-Wortliste"}

Erstelle jetzt den kompletten Leseteil mit authentischem Text und anspruchsvollen Fragen auf Niveau ${targetLevel}.
Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.6,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GOETHE_READING_GENERATOR_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return {
    title: parsed.title || `Goethe Lesen ${targetLevel}`,
    level: targetLevel,
    partNumber: part,
    partName: parsed.partName || `Teil ${part}`,
    recommendedTimeMinutes: parsed.recommendedTimeMinutes || 15,
    passage: parsed.passage || { title: "Lesetext", text: "" },
    questions: questions.map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      number: q.number || idx + 1,
      type: q.type || "mcq",
      prompt: q.prompt || "",
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || "",
      explanation: q.explanation || "",
    })),
  };
}

async function evaluateGoetheReading({ questionsWithKey, userAnswers, level = "B1" }) {
  const targetLevel = sanitizeLevel(level);
  let correctCount = 0;
  const breakdown = [];

  for (const q of questionsWithKey) {
    const userVal = userAnswers[q.number] || userAnswers[q.id] || "";
    const isCorrect = normalizeAnswer(userVal) === normalizeAnswer(q.answer);
    if (isCorrect) correctCount++;

    breakdown.push({
      number: q.number,
      id: q.id,
      prompt: q.prompt,
      userAnswer: userVal,
      correctAnswer: q.answer,
      isCorrect,
      explanation: q.explanation || "",
    });
  }

  const totalQuestions = questionsWithKey.length || 1;
  const points100 = Math.round((correctCount / totalQuestions) * 100);
  const praedikat = getGoethePraedikat(points100);

  return {
    level: targetLevel,
    correctCount,
    totalQuestions,
    points100,
    passed: points100 >= 60,
    praedikat: praedikat.label,
    breakdown,
  };
}

// ─── 2. LISTENING (Hörverstehen) ───────────────────────────────────────

async function generateGoetheListening({ level = "B1", topic = "", partNumber = 1 }) {
  const targetLevel = sanitizeLevel(level);
  const part = parseInt(partNumber, 10) || 1;

  const userMessage = `NIVEAUSTUFE: ${targetLevel}
TEIL: ${part}
${topic ? `THEMA: ${topic}` : "THEMA: Authentische Alltagssituation oder Radiobeitrag"}

Erstelle jetzt das komplette Hörskript mit Sprecherangaben und Prüfungsfragen auf Niveau ${targetLevel}.
Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GOETHE_LISTENING_GENERATOR_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const utterances = Array.isArray(parsed.utterances) ? parsed.utterances : [];
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return {
    title: parsed.title || `Goethe Hören ${targetLevel}`,
    level: targetLevel,
    partNumber: part,
    partName: parsed.partName || `Teil ${part}`,
    instructions: parsed.instructions || "Hören Sie den Text und lösen Sie die Aufgaben.",
    maxPlays: parsed.maxPlays || 2,
    speakers: Array.isArray(parsed.speakers) ? parsed.speakers : [{ label: "Sprecher", voice: "alloy" }],
    utterances,
    questions: questions.map((q, idx) => ({
      id: q.id || `q${idx + 1}`,
      number: q.number || idx + 1,
      type: q.type || "mcq",
      prompt: q.prompt || "",
      options: Array.isArray(q.options) ? q.options : [],
      answer: q.answer || "",
      explanation: q.explanation || "",
    })),
  };
}

async function evaluateGoetheListening({ questionsWithKey, userAnswers, level = "B1" }) {
  const targetLevel = sanitizeLevel(level);
  let correctCount = 0;
  const breakdown = [];

  for (const q of questionsWithKey) {
    const userVal = userAnswers[q.number] || userAnswers[q.id] || "";
    const isCorrect = normalizeAnswer(userVal) === normalizeAnswer(q.answer);
    if (isCorrect) correctCount++;

    breakdown.push({
      number: q.number,
      id: q.id,
      prompt: q.prompt,
      userAnswer: userVal,
      correctAnswer: q.answer,
      isCorrect,
      explanation: q.explanation || "",
    });
  }

  const totalQuestions = questionsWithKey.length || 1;
  const points100 = Math.round((correctCount / totalQuestions) * 100);
  const praedikat = getGoethePraedikat(points100);

  return {
    level: targetLevel,
    correctCount,
    totalQuestions,
    points100,
    passed: points100 >= 60,
    praedikat: praedikat.label,
    breakdown,
  };
}

// ─── 3. WRITING TASK GENERATOR ─────────────────────────────────────────

async function generateGoetheWritingTask({ level = "B1", topic = "", taskNumber = 1 }) {
  const targetLevel = sanitizeLevel(level);
  const task = parseInt(taskNumber, 10) || 1;

  const userMessage = `NIVEAUSTUFE: ${targetLevel}
AUFGABENNUMMER: ${task}
${topic ? `THEMA: ${topic}` : "THEMA: Relevantes Modulthema nach Goethe-Institut"}

Erstelle jetzt eine authentische Schreibaufgabe inklusive Situation und Leitpunkten auf Niveau ${targetLevel}.
Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: GOETHE_WRITING_GENERATOR_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  return {
    title: parsed.title || `Goethe Schreiben ${targetLevel} — Aufgabe ${task}`,
    level: targetLevel,
    taskNumber: task,
    taskType: parsed.taskType || "informal_email",
    targetWordCount: parsed.targetWordCount || (targetLevel === "A2" ? 40 : targetLevel === "B2" ? 150 : targetLevel === "C1" ? 220 : 80),
    timeMinutes: parsed.timeMinutes || 20,
    scenario: parsed.scenario || "Situation für die Schreibaufgabe.",
    instructions: parsed.instructions || "Schreiben Sie einen Text zu allen folgenden Leitpunkten:",
    bulletPoints: Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [],
    sampleStarters: Array.isArray(parsed.sampleStarters) ? parsed.sampleStarters : [],
    rubricHighlight: parsed.rubricHighlight || "Achten Sie auf Register, Konnektoren und korrekte Verbstellung.",
  };
}

// ─── 4. INTERACTIVE SPEAKING PARTNER (Gesprächspartner) ─────────────────

/**
 * Executes one interactive turn in a spoken Goethe conversation.
 * Handles Whisper transcription (if audio provided), LLM response as Partner, and TTS generation.
 */
async function interactGoetheSpeakingPartner({
  level = "B1",
  topic = "Gemeinsam etwas planen",
  taskType = "Teil 1: Planen",
  history = [],
  studentText = "",
  audioBuffer = null,
  mimeType = "audio/webm",
  filename = "candidate_speech.webm",
  voice = "nova",
}) {
  const targetLevel = sanitizeLevel(level);

  // 1. Whisper Transcription if audio is present
  let recognizedText = (studentText || "").trim();
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const transcription = await transcribeAudio(audioBuffer, mimeType, filename, "de");
      recognizedText = (transcription.text || "").trim();
    } catch (err) {
      console.error("Whisper German transcription error:", err);
      if (!recognizedText) {
        throw new Error("Fehler bei der Audio-Transkription (Whisper). Bitte wiederholen.");
      }
    }
  }

  // 2. Prepare conversation context for the AI Partner
  const systemPrompt = GOETHE_SPEAKING_PARTNER_PROMPT
    .replace(/{LEVEL}/g, targetLevel)
    .replace(/{TOPIC}/g, topic)
    .replace(/{TASK_TYPE}/g, taskType);

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Feed history (turns between candidate and partner)
  if (Array.isArray(history) && history.length > 0) {
    for (const h of history) {
      if (h.speaker === "candidate" || h.role === "user") {
        messages.push({ role: "user", content: h.text });
      } else if (h.speaker === "partner" || h.role === "assistant") {
        messages.push({ role: "assistant", content: h.text });
      }
    }
  }

  // Current candidate statement
  if (recognizedText) {
    messages.push({ role: "user", content: recognizedText });
  } else if (history.length === 0) {
    // Initial opening turn by partner
    messages.push({
      role: "user",
      content: `[PRÜFUNGSBEGINN]: Wir starten jetzt die mündliche Aufgabe "${taskType}" zum Thema "${topic}". Bitte begrüße mich kurz und mache den ersten Vorschlag oder stelle die Ausgangsfrage, um das Gespräch zu eröffnen.`,
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages,
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const replyText = parsed.replyText || "Hallo! Lass uns gemeinsam überlegen, wie wir das am besten planen.";
  const redemittelTips = Array.isArray(parsed.redemittelTips) ? parsed.redemittelTips : [];

  // 3. Synthesize Spoken German Audio via OpenAI TTS for the Partner
  let audioBase64 = null;
  try {
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: ["alloy", "nova", "echo", "onyx", "shimmer"].includes(voice) ? voice : "nova",
      input: replyText,
      response_format: "mp3",
    });

    const arrayBuffer = await ttsResponse.arrayBuffer();
    audioBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch (ttsErr) {
    console.warn("OpenAI TTS synthesis error (client will fallback to browser speech synthesis):", ttsErr.message);
  }

  return {
    studentTranscript: recognizedText,
    replyText,
    audioBase64,
    redemittelTips,
    role: parsed.role || "Prüfungspartner (Kandidat B)",
    isGoalReached: Boolean(parsed.isGoalReached),
  };
}

/**
 * Deep diagnostic evaluation of the entire spoken dialogue
 */
async function evaluateGoetheSpeakingDialogue({
  level = "B1",
  topic = "Planung",
  taskType = "Teil 1",
  history = [],
  studentName = "Student",
}) {
  const targetLevel = sanitizeLevel(level);

  const formattedConversation = (history || [])
    .map((turn, i) => `${i + 1}. [${turn.speaker === "candidate" ? "KANDIDAT" : "PARTNER"}]: ${turn.text}`)
    .join("\n\n");

  const systemPrompt = GOETHE_SPEAKING_DIALOGUE_EXAMINER_PROMPT
    .replace(/{LEVEL}/g, targetLevel)
    .replace(/{TOPIC}/g, topic);

  const userMessage = `PRÜFUNGSTEIL: ${taskType}
NIVEAUSTUFE: ${targetLevel}
THEMA: ${topic}
TEILNEHMER: ${studentName}

VOLLSTÄNDIGER DIALOGABLAUF:
\"\"\"
${formattedConversation || "Kein Dialog erfasst."}
\"\"\"

Bewerte diese partnerschaftliche mündliche Prüfungsleistung jetzt streng nach den offiziellen Goethe-Kriterien. Gib NUR valides JSON zurück.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const totalPoints = Number(parsed.totalPoints) || 75;
  const scaledPoints100 = Math.min(100, Math.round(Number(parsed.scaledPoints100 || totalPoints)));
  const praedikatInfo = getGoethePraedikat(scaledPoints100);

  return {
    ...parsed,
    level: targetLevel,
    scaledPoints100,
    praedikat: praedikatInfo.label,
    passed: praedikatInfo.passed,
    metadata: {
      studentName,
      timestamp: new Date().toISOString(),
      evalModel: "gpt-4o",
    },
  };
}

module.exports = {
  generateGoetheReading,
  evaluateGoetheReading,
  generateGoetheListening,
  evaluateGoetheListening,
  generateGoetheWritingTask,
  interactGoetheSpeakingPartner,
  evaluateGoetheSpeakingDialogue,
  sanitizeLevel,
};
