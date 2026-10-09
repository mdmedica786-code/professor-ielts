const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { OpenAI } = require("openai");
const {
  buildReadingGeneratorPrompt,
  buildListeningGeneratorPrompt,
  buildWritingGeneratorPrompt,
  buildSpeakingPartnerPrompt,
  buildSpeakingTaskSheetPrompt,
  buildDualRoleExamPrompt,
  taskSheetKind,
  EXAMINER_NAME,
  zuordnungLabels,
} = require("../prompts/goetheGeneratorPrompts");
const {
  ITEM_TYPES,
  sanitizeLevel,
  getLevelFormat,
  getReceptivePart,
  getModuleMaxRaw,
  getWritingAufgabe,
  getSpeakingTeil,
  scaleReceptive,
} = require("../config/goetheExamFormat");
const { getGoethePraedikat, evaluateGoetheSpeaking } = require("./goetheService");
const { transcribeAudio } = require("./openaiService");
const { callWithRetry, parseJsonContent, LlmValidationError } = require("../utils/llmRetry");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const GENERATION_MODEL = "gpt-4o-mini";
const TTS_MODEL = process.env.GOETHE_TTS_MODEL || "tts-1-hd";

function normalizeAnswer(s) {
  return (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/%/g, " prozent ")
    .replace(/[.,;:!?'"„“”()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function invalid(message) {
  return new LlmValidationError(message);
}

/** Exact (normalized) match against a fixed option list, then unique prefix match. */
function matchOption(options, value) {
  const v = normalizeAnswer(value).replace(/^(anzeige|text|satz|option|lösung)\s+/, "");
  if (!v) return null;
  const exact = options.find((o) => normalizeAnswer(o) === v);
  if (exact !== undefined) return exact;
  const prefix = options.filter((o) => normalizeAnswer(o).startsWith(v));
  return prefix.length === 1 ? prefix[0] : null;
}

const stripLetterPrefix = (s) => String(s ?? "").replace(/^\s*[a-d][).:]\s+/i, "").trim();

async function chatJson({ system, user, temperature, label, validate }) {
  return callWithRetry(async () => {
    const completion = await openai.chat.completions.create({
      model: GENERATION_MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return validate(parseJsonContent(completion));
  }, 2, label);
}

// ─── Shared question normalisation (reading + listening) ──────────────

/**
 * Validates the model's questions against the part's FORMAT and rewrites them
 * into the canonical shape: continuous numbering, fixed option sets, answers
 * resolved to an option string (answerLetter kept for MCQ).
 * ctx: { labels, wordBank, sentenceLabels, speakerNames }
 */
function normalizeQuestions(part, rawQuestions, ctx = {}) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length < part.count) {
    throw invalid(`Teil ${part.teil}: ${rawQuestions?.length || 0} statt ${part.count} Aufgaben`);
  }

  return rawQuestions.slice(0, part.count).map((q, idx) => {
    const number = part.from + idx;
    let itemType = part.qType;
    if (part.qType === "paar_rf_mcq") itemType = idx % 2 === 0 ? "richtig_falsch" : "mcq3";

    let options = [];
    let answer = null;
    let answerLetter = null;
    let acceptedAnswers;

    switch (itemType) {
      case "richtig_falsch":
      case "ja_nein":
      case "rfn":
        options = ITEM_TYPES[itemType].options;
        answer = matchOption(options, q.answer);
        break;
      case "mcq3":
      case "mcq4": {
        const letters = ITEM_TYPES[itemType].letters;
        options = (Array.isArray(q.options) ? q.options : []).map(stripLetterPrefix);
        if (options.length !== letters.length || options.some((o) => !o)) break;
        const raw = String(q.answer ?? "").trim();
        let i = /^[a-d]\)?$/i.test(raw) ? letters.indexOf(raw[0].toLowerCase()) : -1;
        if (i < 0) i = options.findIndex((o) => normalizeAnswer(o) === normalizeAnswer(stripLetterPrefix(raw)));
        if (i >= 0) {
          answer = options[i];
          answerLetter = letters[i];
        }
        break;
      }
      case "zuordnung":
        options = ctx.labels;
        answer = matchOption(options, q.answer);
        break;
      case "lueckentext_woerter":
        options = ctx.wordBank;
        answer = matchOption(options, q.answer);
        break;
      case "lueckentext_saetze":
        options = ctx.sentenceLabels;
        answer = matchOption(options, q.answer);
        break;
      case "wer_sagt_was":
        options = ctx.speakerNames;
        answer = matchOption(options, q.answer);
        break;
      case "kurzantwort": {
        const model = String(q.answer ?? "").trim();
        if (model) {
          answer = model;
          const extra = Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers : [];
          acceptedAnswers = [...new Set([model, ...extra].map((a) => String(a).trim()).filter(Boolean))];
        }
        break;
      }
      default:
        break;
    }

    if (answer === null || answer === undefined) {
      throw invalid(`Aufgabe ${number}: ungültige Optionen oder Lösung`);
    }
    if (!String(q.prompt || "").trim() && !["lueckentext_woerter", "lueckentext_saetze"].includes(itemType)) {
      throw invalid(`Aufgabe ${number}: Aufgabentext fehlt`);
    }

    let segment;
    if (part.qType === "paar_rf_mcq") segment = Math.floor(idx / 2) + 1;
    else if (part.scriptKind === "segments") segment = idx + 1;

    return {
      id: `q${number}`,
      number,
      type: itemType,
      prompt: String(q.prompt || `Lücke ${number}`).trim(),
      options,
      answer,
      ...(answerLetter ? { answerLetter } : {}),
      ...(acceptedAnswers ? { acceptedAnswers } : {}),
      ...(segment ? { segment } : {}),
      ...(q.textRef ? { textRef: String(q.textRef) } : {}),
      explanation: q.explanation || "",
    };
  });
}

/**
 * Ensures the gap markers [[from]]..[[to]] are present exactly once. If the
 * model numbered the gaps 1..count instead, renumber them in reading order.
 */
function normalizeGapText(text, part) {
  const found = [...String(text || "").matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]));
  const expected = Array.from({ length: part.count }, (_, i) => part.from + i);
  if (found.length === part.count && expected.every((n) => found.includes(n))) return text;
  if (found.length !== part.count) {
    throw invalid(`Teil ${part.teil}: ${found.length} statt ${part.count} Lücken im Text`);
  }
  let i = 0;
  return text.replace(/\[\[(\d+)\]\]/g, () => `[[${expected[i++]}]]`);
}

function recommendedMinutes(level, module, part) {
  const fmt = getLevelFormat(level)[module];
  return Math.max(5, Math.round((fmt.timeMinutes * part.count) / getModuleMaxRaw(level, module)));
}

// ─── 1. READING (Leseverstehen) ────────────────────────────────────────

function validateReading(parsed, part) {
  const passage = parsed.passage || {};
  const ctx = {};
  let texts = [];
  let text = String(passage.text || "");

  if (part.textKind === "multi") {
    texts = (Array.isArray(passage.texts) ? passage.texts : []).filter((t) => String(t?.text || "").trim());
    if (texts.length < part.textCount) {
      throw invalid(`Teil ${part.teil}: ${texts.length} statt ${part.textCount} Texte`);
    }
    texts = texts.slice(0, part.textCount).map((t, i) => ({
      label: part.textLabels ? part.textLabels[i] : String(t.label || `Text ${i + 1}`),
      title: t.title || "",
      text: String(t.text).trim(),
    }));
    text = texts.map((t) => `${t.label}${t.title ? ` – ${t.title}` : ""}\n${t.text}`).join("\n\n");
    if (part.qType === "zuordnung") ctx.labels = zuordnungLabels(part);
  } else {
    if (!text.trim()) throw invalid(`Teil ${part.teil}: Lesetext fehlt`);
    if (part.textKind === "gap_words" || part.textKind === "gap_sentences") text = normalizeGapText(text, part);
  }

  let wordBank;
  let sentences;
  if (part.qType === "lueckentext_woerter") {
    wordBank = [...new Set((parsed.wordBank || []).map((w) => String(w).trim()).filter(Boolean))];
    if (wordBank.length < part.count + 1) throw invalid(`Teil ${part.teil}: Wortliste unvollständig`);
    ctx.wordBank = wordBank.slice(0, part.wordBankSize);
    wordBank = ctx.wordBank;
  }
  if (part.qType === "lueckentext_saetze") {
    const letters = "abcdefghij".split("");
    sentences = (parsed.sentences || [])
      .filter((s) => String(s?.text || "").trim())
      .slice(0, part.sentenceCount)
      .map((s, i) => {
        const label = String(s.label || "").trim().toLowerCase().replace(/[^a-j]/g, "");
        return { label: label.length === 1 ? label : letters[i], text: String(s.text).trim() };
      });
    if (sentences.length < part.sentenceCount) throw invalid(`Teil ${part.teil}: Satzliste unvollständig`);
    ctx.sentenceLabels = sentences.map((s) => s.label);
  }

  const questions = normalizeQuestions(part, parsed.questions, ctx);
  return {
    title: parsed.title,
    passage: { title: passage.title || part.title, source: passage.source || "", text, texts },
    wordBank,
    sentences,
    questions,
  };
}

async function generateGoetheReading({ level = "B1", topic = "", partNumber = 1 }) {
  const lvl = sanitizeLevel(level);
  const part = getReceptivePart(lvl, "lesen", partNumber);

  const userMessage = `${topic ? `THEMA: ${topic}` : "THEMA: frei wählbar, passend zur Textsorte und zum Niveau (Wortliste des Goethe-Instituts)"}

Erstelle jetzt Lesen Teil ${part.teil} für das Goethe-Zertifikat ${lvl} exakt nach Vorgabe. Gib NUR valides JSON zurück.`;

  const result = await chatJson({
    system: buildReadingGeneratorPrompt(lvl, part.teil),
    user: userMessage,
    temperature: 0.6,
    label: `Goethe Lesen ${lvl} Teil ${part.teil}`,
    validate: (parsed) => validateReading(parsed, part),
  });

  return {
    title: `Goethe Lesen ${lvl} · Teil ${part.teil}: ${result.title || part.title}`,
    level: lvl,
    partNumber: part.teil,
    totalParts: part.totalParts,
    partName: `Teil ${part.teil}: ${part.title}`,
    qType: part.qType,
    instruction: part.instruction,
    recommendedTimeMinutes: recommendedMinutes(lvl, "lesen", part),
    passage: result.passage,
    ...(result.wordBank ? { wordBank: result.wordBank } : {}),
    ...(result.sentences ? { sentences: result.sentences } : {}),
    questions: result.questions,
  };
}

// ─── Shared receptive evaluation ──────────────────────────────────────

function isAnswerCorrect(q, userVal) {
  const user = normalizeAnswer(userVal);
  if (!user) return false;
  if (q.type === "kurzantwort") {
    return (q.acceptedAnswers || [q.answer]).some((a) => {
      const acc = normalizeAnswer(a);
      return acc && (user === acc || (acc.length >= 3 && user.includes(acc)));
    });
  }
  return user === normalizeAnswer(q.answer) || (q.answerLetter && user === q.answerLetter);
}

function evaluateReceptive(module, { questionsWithKey, userAnswers = {}, level = "B1" }) {
  const lvl = sanitizeLevel(level);
  let correctCount = 0;

  const breakdown = questionsWithKey.map((q) => {
    const userVal = userAnswers[q.number] ?? userAnswers[q.id] ?? "";
    const isCorrect = isAnswerCorrect(q, userVal);
    if (isCorrect) correctCount++;
    return {
      number: q.number,
      id: q.id,
      prompt: q.prompt,
      userAnswer: userVal,
      correctAnswer: q.answerLetter ? `${q.answerLetter}) ${q.answer}` : q.answer,
      isCorrect,
      explanation: q.explanation || "",
    };
  });

  const totalQuestions = questionsWithKey.length || 1;
  const scaled = scaleReceptive(lvl, module, correctCount, totalQuestions);

  return {
    level: lvl,
    correctCount,
    totalQuestions,
    points100: scaled.points100,
    passRaw: scaled.passRaw,
    isFullModule: scaled.isFullModule,
    passed: scaled.passed,
    praedikat: scaled.passed ? getGoethePraedikat(scaled.points100).label : "Nicht bestanden",
    breakdown,
  };
}

async function evaluateGoetheReading(args) {
  return evaluateReceptive("lesen", args);
}

// ─── 2. LISTENING (Hörverstehen) ───────────────────────────────────────

// Voice casting: narrator/moderator → alloy, women → nova (then shimmer),
// men → onyx (then echo, fable). Instructions are read by the narrator voice.
const ANNOUNCER_VOICE = "alloy";
const VOICE_POOLS = {
  moderator: ["alloy"],
  female: ["nova", "shimmer"],
  male: ["onyx", "echo", "fable"],
};
const TTS_SPEED = { A2: 0.92, B1: 1.0, B2: 1.0, C1: 1.05 };
const PAUSE_AFTER_INSTRUCTION = 2.5;
const PAUSE_BETWEEN_UTTERANCES = 1.5;
const PAUSE_BETWEEN_SEGMENTS = 3;
const TTS_CONCURRENCY = 5;

function assignVoices(speakers) {
  const used = new Set();
  const take = (pool) => {
    const free = pool.find((v) => !used.has(v));
    const voice = free || pool[used.size % pool.length];
    used.add(voice);
    return voice;
  };
  return speakers.map((s) => {
    const isModerator = ["moderator", "narrator"].includes(s.role) && !used.has("alloy");
    const gender = s.gender === "male" ? "male" : "female";
    return { ...s, gender, voice: isModerator ? take(VOICE_POOLS.moderator) : take(VOICE_POOLS[gender]) };
  });
}

function validateListening(parsed, part) {
  const segmentCount = part.scriptKind === "segments" ? part.segmentCount : 1;
  const rawSegments = (Array.isArray(parsed.segments) ? parsed.segments : [])
    .map((seg) => ({
      ...seg,
      utterances: (Array.isArray(seg?.utterances) ? seg.utterances : []).filter((u) => String(u?.text || "").trim()),
    }))
    .filter((seg) => seg.utterances.length);
  if (rawSegments.length < segmentCount) {
    throw invalid(`Teil ${part.teil}: ${rawSegments.length} statt ${segmentCount} Hörtexte`);
  }

  // Every utterance must belong to a declared speaker; add stragglers.
  const speakers = (Array.isArray(parsed.speakers) ? parsed.speakers : [])
    .filter((s) => String(s?.name || "").trim())
    .map((s) => ({ name: String(s.name).trim(), gender: s.gender, role: s.role || "speaker" }));
  const segments = rawSegments.slice(0, segmentCount).map((seg, i) => ({
    label: part.scriptKind === "segments" ? `Text ${i + 1}` : "Text",
    context: seg.context || "",
    utterances: seg.utterances.map((u) => {
      const name = String(u.speaker || "Sprecher").trim();
      if (!speakers.some((s) => s.name === name)) speakers.push({ name, gender: "female", role: "speaker" });
      return { speaker: name, text: String(u.text).trim() };
    }),
  }));
  const castSpeakers = assignVoices(speakers);

  const ctx = { speakerNames: castSpeakers.map((s) => s.name) };
  let optionBank;
  if (part.qType === "zuordnung") {
    ctx.labels = zuordnungLabels(part);
    optionBank = (parsed.optionBank || [])
      .filter((o) => String(o?.text || "").trim())
      .slice(0, ctx.labels.length)
      .map((o, i) => ({ label: ctx.labels[i], text: String(o.text).trim() }));
    if (optionBank.length < ctx.labels.length) throw invalid(`Teil ${part.teil}: Lösungsliste unvollständig`);
  }

  const questions = normalizeQuestions(part, parsed.questions, ctx);
  return { title: parsed.title, speakers: castSpeakers, segments, optionBank, questions };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const bundled = require("ffmpeg-static");
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* fall through to system ffmpeg */
  }
  return "ffmpeg";
}

/** Joins mp3 clips into one mp3, padding each with `pauseAfter` seconds of silence. */
async function mergeClipsWithPauses(clips) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "goethe-tts-"));
  try {
    const files = await Promise.all(
      clips.map(async (clip, i) => {
        const file = path.join(dir, `clip${i}.mp3`);
        await fs.promises.writeFile(file, clip.buffer);
        return file;
      })
    );
    const chains = clips.map((clip, i) => {
      const pad = clip.pauseAfter > 0 ? `,apad=pad_dur=${clip.pauseAfter}` : "";
      return `[${i}:a]aresample=24000,aformat=sample_fmts=fltp:channel_layouts=mono${pad}[a${i}]`;
    });
    const filter = `${chains.join(";")};${clips.map((_, i) => `[a${i}]`).join("")}concat=n=${clips.length}:v=0:a=1[out]`;
    const args = [
      "-hide_banner", "-loglevel", "error",
      ...files.flatMap((f) => ["-i", f]),
      "-filter_complex", filter,
      "-map", "[out]",
      "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1",
      "-f", "mp3", "pipe:1",
    ];

    return await new Promise((resolve, reject) => {
      const proc = spawn(resolveFfmpegPath(), args);
      const chunks = [];
      let errorLog = "";
      proc.stdout.on("data", (c) => chunks.push(c));
      proc.stderr.on("data", (c) => (errorLog += c.toString()));
      proc.on("error", reject);
      proc.on("close", (code) =>
        code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited with code ${code}: ${errorLog}`))
      );
    });
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Renders the full Teil as one mp3: official instruction, then each Hörtext
 * (announced as "Text N" for multi-text parts), with pauses between turns.
 * Returns null if synthesis fails so the client can fall back to browser TTS.
 */
async function synthesizeListeningAudio({ level, part, speakers, segments }) {
  const voiceOf = Object.fromEntries(speakers.map((s) => [s.name, s.voice]));
  const plan = [
    { text: `Sie hören jetzt Teil ${part.teil}. ${part.instruction}`, voice: ANNOUNCER_VOICE, pauseAfter: PAUSE_AFTER_INSTRUCTION },
  ];

  segments.forEach((seg, sIdx) => {
    if (part.scriptKind === "segments") {
      plan.push({ text: `${seg.label}.`, voice: ANNOUNCER_VOICE, pauseAfter: 1 });
    }
    // Merge consecutive turns of one speaker into a single TTS call.
    const turns = [];
    for (const u of seg.utterances) {
      const last = turns[turns.length - 1];
      if (last && last.speaker === u.speaker) last.text += ` ${u.text}`;
      else turns.push({ ...u });
    }
    turns.forEach((u, uIdx) => {
      const lastInSegment = uIdx === turns.length - 1;
      plan.push({
        text: u.text,
        voice: voiceOf[u.speaker] || "nova",
        pauseAfter: lastInSegment ? (sIdx === segments.length - 1 ? 0 : PAUSE_BETWEEN_SEGMENTS) : PAUSE_BETWEEN_UTTERANCES,
      });
    });
  });

  try {
    const speed = TTS_SPEED[level] || 1.0;
    const clips = await mapLimit(plan, TTS_CONCURRENCY, async (item) => {
      const res = await openai.audio.speech.create({
        model: TTS_MODEL,
        voice: item.voice,
        input: item.text.slice(0, 4000),
        response_format: "mp3",
        speed,
      });
      return { buffer: Buffer.from(await res.arrayBuffer()), pauseAfter: item.pauseAfter };
    });

    let merged;
    try {
      merged = await mergeClipsWithPauses(clips);
    } catch (mergeErr) {
      // Without ffmpeg, plain mp3 concatenation still plays (just without pauses).
      console.warn("Goethe listening audio merge failed, concatenating clips:", mergeErr.message);
      merged = Buffer.concat(clips.map((c) => c.buffer));
    }
    return merged.toString("base64");
  } catch (err) {
    console.warn("Goethe listening TTS failed (client falls back to browser speech):", err.message);
    return null;
  }
}

async function generateGoetheListening({ level = "B1", topic = "", partNumber = 1, withAudio = true }) {
  const lvl = sanitizeLevel(level);
  const part = getReceptivePart(lvl, "hoeren", partNumber);

  const userMessage = `${topic ? `THEMA: ${topic}` : "THEMA: frei wählbar, passend zur Textsorte und zum Niveau"}

Erstelle jetzt Hören Teil ${part.teil} für das Goethe-Zertifikat ${lvl} exakt nach Vorgabe. Gib NUR valides JSON zurück.`;

  const result = await chatJson({
    system: buildListeningGeneratorPrompt(lvl, part.teil),
    user: userMessage,
    temperature: 0.7,
    label: `Goethe Hören ${lvl} Teil ${part.teil}`,
    validate: (parsed) => validateListening(parsed, part),
  });

  const voiceOf = Object.fromEntries(result.speakers.map((s) => [s.name, s.voice]));
  const utterances = result.segments.flatMap((seg, sIdx) =>
    seg.utterances.map((u) => ({ ...u, voice: voiceOf[u.speaker], segment: sIdx + 1 }))
  );
  const audioData = withAudio
    ? await synthesizeListeningAudio({ level: lvl, part, speakers: result.speakers, segments: result.segments })
    : null;

  return {
    title: `Goethe Hören ${lvl} · Teil ${part.teil}: ${result.title || part.title}`,
    level: lvl,
    partNumber: part.teil,
    totalParts: part.totalParts,
    partName: `Teil ${part.teil}: ${part.title}`,
    qType: part.qType,
    instructions: part.instruction,
    maxPlays: part.maxPlays,
    recommendedTimeMinutes: recommendedMinutes(lvl, "hoeren", part),
    speakers: result.speakers.map(({ name, gender, role, voice }) => ({ label: name, name, gender, role, voice })),
    segments: result.segments.map(({ label, context }) => ({ label, context })),
    utterances,
    ...(result.optionBank ? { optionBank: result.optionBank } : {}),
    audioData,
    audioMimeType: audioData ? "audio/mpeg" : null,
    questions: result.questions,
  };
}

async function evaluateGoetheListening(args) {
  return evaluateReceptive("hoeren", args);
}

// ─── 3. WRITING TASK GENERATOR ─────────────────────────────────────────

function validateWritingTask(parsed, aufgabe) {
  if (!String(parsed.scenario || "").trim()) throw invalid("Situation fehlt");
  const bulletPoints = (Array.isArray(parsed.bulletPoints) ? parsed.bulletPoints : [])
    .map((b) => String(b).trim())
    .filter(Boolean);
  if (bulletPoints.length < aufgabe.leitpunkte) {
    throw invalid(`${bulletPoints.length} statt ${aufgabe.leitpunkte} Leitpunkte`);
  }
  if (aufgabe.leitpunkte === 0 && !String(parsed.stimulus || "").trim()) throw invalid("Impuls fehlt");
  const chart = parsed.chart && Array.isArray(parsed.chart.data) && parsed.chart.data.length ? parsed.chart : null;
  if (aufgabe.withChart && !chart) throw invalid("Grafik fehlt");
  return { ...parsed, bulletPoints: bulletPoints.slice(0, aufgabe.leitpunkte), chart };
}

async function generateGoetheWritingTask({ level = "B1", topic = "", taskNumber = 1 }) {
  const lvl = sanitizeLevel(level);
  const aufgabe = getWritingAufgabe(lvl, taskNumber);

  const userMessage = `${topic ? `THEMA: ${topic}` : "THEMA: frei wählbar, passend zur Textsorte und zum Niveau"}

Erstelle jetzt Schreiben Aufgabe ${aufgabe.nr} für das Goethe-Zertifikat ${lvl} exakt nach Vorgabe. Gib NUR valides JSON zurück.`;

  const parsed = await chatJson({
    system: buildWritingGeneratorPrompt(lvl, aufgabe.nr),
    user: userMessage,
    temperature: 0.7,
    label: `Goethe Schreiben ${lvl} Aufgabe ${aufgabe.nr}`,
    validate: (json) => validateWritingTask(json, aufgabe),
  });

  return {
    title: `Goethe Schreiben ${lvl} · Aufgabe ${aufgabe.nr}: ${parsed.title || aufgabe.label}`,
    level: lvl,
    taskNumber: aufgabe.nr,
    totalTasks: getLevelFormat(lvl).schreiben.aufgaben.length,
    taskType: aufgabe.type,
    taskLabel: aufgabe.label,
    register: aufgabe.register,
    wordRange: aufgabe.words,
    targetWordCount: aufgabe.words[1],
    timeMinutes: aufgabe.timeHintMinutes,
    maxPoints: aufgabe.maxPoints,
    criteria: aufgabe.criteria,
    scenario: parsed.scenario,
    stimulus: parsed.stimulus || null,
    instructions: aufgabe.instruction,
    bulletPoints: parsed.bulletPoints,
    chart: parsed.chart,
    sampleStarters: Array.isArray(parsed.sampleStarters) ? parsed.sampleStarters : [],
    rubricHighlight: parsed.rubricHighlight || "",
  };
}

// ─── 4. INTERACTIVE SPEAKING PARTNER (Gesprächspartner) ─────────────────

/** Resolves the Sprechen Teil from an explicit number or a "Teil N: …" label. */
function resolveSpeakingTeil(level, teil, taskType) {
  const n = parseInt(teil, 10) || parseInt(String(taskType || "").match(/Teil\s*(\d)/i)?.[1], 10) || 1;
  return getSpeakingTeil(level, n);
}

/**
 * Executes one interactive turn in a spoken Goethe conversation.
 * Handles Whisper transcription (if audio provided), LLM response as Partner, and TTS generation.
 */
async function interactGoetheSpeakingPartner({
  level = "B1",
  teil = null,
  topic = "",
  taskType = "",
  history = [],
  studentText = "",
  audioBuffer = null,
  mimeType = "audio/webm",
  filename = "candidate_speech.webm",
  voice = "nova",
}) {
  const lvl = sanitizeLevel(level);
  const speakingTeil = resolveSpeakingTeil(lvl, teil, taskType);

  // 1. Whisper Transcription if audio is present
  let recognizedText = (studentText || "").trim();
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const transcription = await transcribeAudio(audioBuffer, mimeType, filename, "de");
      recognizedText = (transcription.text || "").trim();
    } catch (err) {
      console.error("Whisper German transcription error:", err);
      if (!recognizedText) {
        throw Object.assign(new Error("Fehler bei der Audio-Transkription. Bitte sprechen Sie noch einmal."), {
          status: 502,
          expose: true,
        });
      }
    }
  }

  // 2. Prepare conversation context for the AI Partner
  const messages = [{ role: "system", content: buildSpeakingPartnerPrompt(lvl, speakingTeil.teil, topic) }];

  if (Array.isArray(history) && history.length > 0) {
    for (const h of history) {
      if (h.speaker === "candidate" || h.role === "user") {
        messages.push({ role: "user", content: h.text });
      } else if (h.speaker === "partner" || h.role === "assistant") {
        messages.push({ role: "assistant", content: h.text });
      }
    }
  }

  if (recognizedText) {
    messages.push({ role: "user", content: recognizedText });
  } else if (!history.length) {
    // Opening turn: the partner/examiner starts the task.
    messages.push({
      role: "user",
      content: `[PRÜFUNGSBEGINN]: Wir starten jetzt Sprechen Teil ${speakingTeil.teil} („${speakingTeil.title}“) zum Thema „${topic || speakingTeil.title}“. Bitte begrüße mich kurz und eröffne die Aufgabe so, wie es in der Prüfung üblich ist.`,
    });
  }

  const parsed = await callWithRetry(async () => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages,
    });
    const json = parseJsonContent(completion);
    if (!String(json.replyText || "").trim()) throw invalid("replyText fehlt");
    return json;
  }, 2, "Goethe Sprechpartner");

  const replyText = parsed.replyText.trim();
  const redemittelTips = Array.isArray(parsed.redemittelTips) ? parsed.redemittelTips : [];

  // 3. Synthesize Spoken German Audio via OpenAI TTS for the Partner
  let audioBase64 = null;
  try {
    const ttsResponse = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: ["alloy", "nova", "echo", "onyx", "shimmer", "fable"].includes(voice) ? voice : "nova",
      input: replyText,
      response_format: "mp3",
    });
    audioBase64 = Buffer.from(await ttsResponse.arrayBuffer()).toString("base64");
  } catch (ttsErr) {
    console.warn("OpenAI TTS synthesis error (client will fallback to browser speech synthesis):", ttsErr.message);
  }

  return {
    studentTranscript: recognizedText,
    replyText,
    audioBase64,
    redemittelTips,
    teil: speakingTeil.teil,
    role: parsed.role || "Prüfungspartner/in",
    isGoalReached: Boolean(parsed.isGoalReached),
  };
}

// ─── 5. SPEAKING TASK SHEET & DUAL-ROLE PAARPRÜFUNG ─────────────────────

const EXAMINER_VOICE = "shimmer";
const PARTNERS = {
  Florian: { gender: "male", voice: "onyx" },
  Sarah: { gender: "female", voice: "nova" },
};

const asStringList = (v) => (Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : []);

function validateTaskSheet(parsed, level, teil) {
  const kind = taskSheetKind(level, teil);
  const sheet = {
    title: String(parsed.title || teil.title).trim(),
    situation: String(parsed.situation || "").trim(),
    question: String(parsed.question || "").trim(),
    leitpunkte: asStringList(parsed.leitpunkte),
    cards: asStringList(parsed.cards),
    slides: (Array.isArray(parsed.slides) ? parsed.slides : [])
      .filter((sl) => String(sl?.title || "").trim())
      .map((sl) => ({ title: String(sl.title).trim(), prompt: String(sl.prompt || "").trim() })),
    calendar: null,
    partnerTopic: String(parsed.partnerTopic || "").trim(),
    partnerSummary: String(parsed.partnerSummary || "").trim(),
    partnerNotes: String(parsed.partnerNotes || "").trim(),
  };
  const need = (cond, msg) => {
    if (!cond) throw invalid(`Aufgabenblatt Teil ${teil.teil}: ${msg}`);
  };

  switch (kind) {
    case "fragen_zur_person":
      need(sheet.cards.length >= 4, "4 Karten erwartet");
      sheet.cards = sheet.cards.slice(0, 4);
      break;
    case "von_sich_erzaehlen":
      need(sheet.question && sheet.leitpunkte.length >= 4, "Frage und 4 Stichpunkte erwartet");
      break;
    case "gemeinsam_planen":
      need(sheet.situation && sheet.leitpunkte.length >= 3, "Situation und Planungspunkte erwartet");
      break;
    case "gemeinsam_planen_kalender": {
      const cal = parsed.calendar || {};
      const clean = (list) =>
        (Array.isArray(list) ? list : [])
          .filter((e) => /^\d{1,2}:\d{2}$/.test(String(e?.time || "").trim()) && String(e?.entry || "").trim())
          .map((e) => ({ time: String(e.time).trim().padStart(5, "0"), entry: String(e.entry).trim() }));
      sheet.calendar = { candidate: clean(cal.candidate), partner: clean(cal.partner) };
      need(sheet.calendar.candidate.length >= 4 && sheet.calendar.partner.length >= 4, "zwei Terminkalender erwartet");
      break;
    }
    case "praesentation":
      need(sheet.question && sheet.slides.length >= 5, "Thema und 5 Folien erwartet");
      sheet.slides = sheet.slides.slice(0, 5);
      break;
    case "feedback_fragen":
      need(sheet.partnerTopic && sheet.partnerSummary, "Thema und Zusammenfassung des Partners erwartet");
      break;
    default:
      need(sheet.question && sheet.leitpunkte.length >= 3, "Thema und Leitpunkte erwartet");
  }
  return sheet;
}

/** Generates the candidate's Aufgabenblatt for one Sprechen Teil. */
async function generateSpeakingTaskSheet({ level = "B1", teil = 1, topic = "" }) {
  const lvl = sanitizeLevel(level);
  const speakingTeil = getSpeakingTeil(lvl, teil);

  const sheet = await chatJson({
    system: buildSpeakingTaskSheetPrompt(lvl, speakingTeil.teil),
    user: `${topic ? `THEMA: ${topic}` : "THEMA: frei wählbar, passend zum Niveau"}\n\nErstelle jetzt das Aufgabenblatt. Gib NUR valides JSON zurück.`,
    temperature: 0.7,
    label: `Goethe Sprechen ${lvl} Teil ${speakingTeil.teil} Aufgabenblatt`,
    validate: (parsed) => validateTaskSheet(parsed, lvl, speakingTeil),
  });

  return {
    level: lvl,
    teil: speakingTeil.teil,
    type: speakingTeil.type,
    mode: speakingTeil.mode,
    title: speakingTeil.title,
    instruction: speakingTeil.instruction,
    durationSeconds: speakingTeil.durationSeconds,
    topic,
    ...sheet,
  };
}

const EXAM_EVENTS = { start: "start", candidate: "kandidat", time_up: "zeit_um", end: "ende" };

function formatExamHistory(history, partnerName) {
  return (history || [])
    .map((h) => {
      const label =
        h.speaker === "candidate" || h.role === "user"
          ? "KANDIDAT"
          : h.speaker === "examiner"
          ? `PRÜFERIN ${EXAMINER_NAME}`
          : `PARTNER ${partnerName}`;
      return `[${label}]: ${h.text}`;
    })
    .join("\n");
}

/**
 * One step of the dual-role Paarprüfung: the AI plays the examiner and the
 * partner candidate and answers with 1–2 spoken turns (each with its own voice).
 * event: 'start' | 'candidate' | 'time_up' | 'end'
 */
async function interactGoetheExamTurn({
  level = "B1",
  teil = 1,
  topic = "",
  taskSheet = null,
  partnerName = "Florian",
  history = [],
  event = "candidate",
  firstTeil = false,
  afterPreparation = false,
  elapsedSeconds = 0,
  studentText = "",
  audioBuffer = null,
  mimeType = "audio/webm",
  filename = "candidate_speech.webm",
}) {
  const lvl = sanitizeLevel(level);
  const speakingTeil = getSpeakingTeil(lvl, teil);
  const partner = PARTNERS[partnerName] ? partnerName : "Florian";

  let recognizedText = (studentText || "").trim();
  if (audioBuffer && audioBuffer.length > 0) {
    try {
      const transcription = await transcribeAudio(audioBuffer, mimeType, filename, "de");
      recognizedText = (transcription.text || "").trim();
    } catch (err) {
      console.error("Whisper German transcription error:", err);
      if (!recognizedText) {
        throw Object.assign(new Error("Fehler bei der Audio-Transkription. Bitte sprechen Sie noch einmal."), {
          status: 502,
          expose: true,
        });
      }
    }
  }
  if (event === "candidate" && !recognizedText) {
    throw Object.assign(new Error("Es wurde keine Äußerung erkannt. Bitte sprechen Sie noch einmal."), {
      status: 400,
      expose: true,
    });
  }

  const userMessage = `EREIGNIS: ${EXAM_EVENTS[event] || "kandidat"}
ersterTeil: ${Boolean(firstTeil)} · nachVorbereitung: ${Boolean(afterPreparation)}
VERSTRICHENE ZEIT IN DIESEM TEIL: ${Math.round(elapsedSeconds)} von ca. ${speakingTeil.durationSeconds} Sekunden

AUFGABENBLATT (Felder "partner…" und calendar.partner kennt nur der Partner):
${JSON.stringify(taskSheet || {}, null, 2)}

BISHERIGER VERLAUF IN TEIL ${speakingTeil.teil}:
${formatExamHistory(history, partner) || "(noch nichts gesagt)"}
${recognizedText ? `\nNEUE ÄUSSERUNG DES KANDIDATEN:\n"${recognizedText}"` : ""}

Antworte jetzt als PRÜFERIN und/oder PARTNER. Gib NUR valides JSON zurück.`;

  const parsed = await chatJson({
    system: buildDualRoleExamPrompt(lvl, speakingTeil.teil, {
      topic,
      partnerName: partner,
      partnerGender: PARTNERS[partner].gender,
    }),
    user: userMessage,
    temperature: 0.7,
    label: `Goethe Paarprüfung ${lvl} Teil ${speakingTeil.teil}`,
    validate: (json) => {
      const turns = (Array.isArray(json.turns) ? json.turns : [])
        .filter((t) => ["pruefer", "partner"].includes(t?.role) && String(t?.text || "").trim())
        .slice(0, 2)
        .map((t) => ({ role: t.role, text: String(t.text).trim() }));
      if (!turns.length) throw invalid("Keine Redebeiträge");
      return { ...json, turns };
    },
  });

  const turns = await Promise.all(
    parsed.turns.map(async (t) => {
      const isExaminer = t.role === "pruefer";
      let audioBase64 = null;
      try {
        const res = await openai.audio.speech.create({
          model: TTS_MODEL,
          voice: isExaminer ? EXAMINER_VOICE : PARTNERS[partner].voice,
          input: t.text.slice(0, 4000),
          response_format: "mp3",
          speed: TTS_SPEED[lvl] || 1.0,
        });
        audioBase64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      } catch (ttsErr) {
        console.warn("Goethe exam TTS failed (client falls back to browser speech):", ttsErr.message);
      }
      return {
        role: isExaminer ? "examiner" : "partner",
        name: isExaminer ? EXAMINER_NAME : partner,
        text: t.text,
        audioBase64,
      };
    })
  );

  return {
    studentTranscript: recognizedText,
    turns,
    replyText: turns.map((t) => t.text).join(" "),
    redemittelTips: asStringList(parsed.redemittelTips).slice(0, 4),
    isGoalReached: Boolean(parsed.isGoalReached),
    teil: speakingTeil.teil,
  };
}

/** Candidate-visible part of a task sheet, as text for the examiner rubric. */
function describeTaskSheet(sheet) {
  if (!sheet) return "";
  const lines = [];
  if (sheet.title) lines.push(`Thema: ${sheet.title}`);
  if (sheet.situation) lines.push(`Situation: ${sheet.situation}`);
  if (sheet.question) lines.push(`Frage: ${sheet.question}`);
  if (sheet.leitpunkte?.length) lines.push(`Leitpunkte: ${sheet.leitpunkte.join(" · ")}`);
  if (sheet.cards?.length) lines.push(`Karten: ${sheet.cards.join(" · ")}`);
  if (sheet.slides?.length) lines.push(`Folien: ${sheet.slides.map((sl, i) => `${i + 1}. ${sl.title}`).join(" · ")}`);
  if (sheet.calendar?.candidate?.length) lines.push(`Terminkalender des Kandidaten: ${sheet.calendar.candidate.map((e) => `${e.time} ${e.entry}`).join(", ")}`);
  if (sheet.partnerTopic) lines.push(`Präsentationsthema des Partners: ${sheet.partnerTopic}`);
  return lines.join("\n");
}

/**
 * Evaluation of the entire spoken dialogue with the level/Teil rubric.
 */
async function evaluateGoetheSpeakingDialogue({
  level = "B1",
  teil = null,
  topic = "",
  taskType = "",
  taskSheet = null,
  history = [],
  studentName = "Student",
  model = "gpt-4o",
}) {
  const lvl = sanitizeLevel(level);
  const speakingTeil = resolveSpeakingTeil(lvl, teil, taskType);
  const result = await evaluateGoetheSpeaking({
    level: lvl,
    part: speakingTeil.teil,
    topic,
    prompt: describeTaskSheet(taskSheet),
    history,
    studentName,
    model,
  });
  return {
    ...result,
    topic,
    totalTurns: (history || []).filter((h) => h.speaker === "candidate" || h.role === "user").length,
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
  generateSpeakingTaskSheet,
  interactGoetheExamTurn,
  resolveSpeakingTeil,
  sanitizeLevel,
};
