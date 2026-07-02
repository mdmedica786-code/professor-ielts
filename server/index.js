/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  BandLogic — Express server entry point
 *  AI-powered IELTS coaching: Speaking · Writing · Reading · Listening
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// ─── Middleware ──────────────────────────────────────────────────
const { upload } = require("./middleware/upload");
const { verifyAuth } = require("./middleware/verifyAuth");
const { checkUsage } = require("./middleware/checkUsage");
const rateLimit = require("./middleware/rateLimit");
const errorHandler = require("./middleware/errorHandler");

// ─── Route modules ──────────────────────────────────────────────
const evaluateRouter = require("./routes/evaluate");
const evaluateWritingRouter = require("./routes/evaluateWriting");
const generatePromptsRouter = require("./routes/generatePrompts");
const listeningRouter = require("./routes/listening");
const pronunciationRouter = require("./routes/pronunciation");
const readingRouter = require("./routes/reading");
const transcribeRouter = require("./routes/transcribe");
const paymentsRouter = require("./routes/payments");
const chatbotRouter = require("./routes/chatbot");
const adminRouter = require("./routes/adminRoutes");
const realtimeRouter = require("./routes/realtimeRoutes");
const vocabRouter = require("./routes/vocab");
const userRouter = require("./routes/user");
const adsRouter = require("./routes/ads");
const testSessionRouter = require("./routes/testSession");
const historyRouter = require("./routes/history");
const feedbackRouter = require("./routes/feedback");
const cronRouter = require("./routes/cronRoutes");
const accountRouter = require("./routes/account");

// ─── Services (imported for the /health endpoint) ───────────────
const { getFirebaseInitError, getAppsLength } = require("./services/firebaseAdmin");
const { getStats } = require("./services/streakService");

// ─── App setup ──────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// Render/Hostinger sit behind a proxy
app.set("trust proxy", 1);

const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "https://bandlogic.online,https://www.bandlogic.online,http://bandlogic.online,http://www.bandlogic.online")
  .split(",")
  .map((s) => s.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.startsWith("http://localhost") || origin === "capacitor://localhost") {
      cb(null, true);
    } else {
      cb(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Apply global rate limiting before body parsers, except for the payments webhook
app.use((req, res, next) => {
  if (req.path === "/api/payments/webhook") {
    return next();
  }
  rateLimit(req, res, next);
});

// JSON body parser (skip for routes that need raw bodies, e.g. webhooks)
app.use((req, res, next) => {
  // The payments webhook route needs the raw body for signature verification
  if (req.path === "/api/payments/webhook") {
    return next();
  }
  express.json({ limit: "10mb" })(req, res, next);
});

// URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Audio file validation helper ───────────────────────────────
const ALLOWED_AUDIO_TYPES = [
  "audio/wav", "audio/wave", "audio/x-wav",
  "audio/mpeg", "audio/mp3",
  "audio/mp4", "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
];

function validateAudio(req, res, next) {
  if (!req.file) return next(); // No file is OK — some routes accept text-only

  const mime = req.file.mimetype || "";
  const ext = path.extname(req.file.originalname || "").toLowerCase();

  const isValidMime = ALLOWED_AUDIO_TYPES.some((t) => mime.startsWith(t));
  const isValidExt = [".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac"].includes(ext);

  if (!isValidMime && !isValidExt) {
    return res.status(400).json({
      success: false,
      error: `Unsupported audio format (${mime || ext}). Supported: WAV, MP3, M4A, WebM, OGG, FLAC.`,
    });
  }

  next();
}

// ─── API Routes ─────────────────────────────────────────────────

// Speaking evaluation: audio → transcription → grading
app.use(
  "/api/evaluate",
  verifyAuth,
  checkUsage,
  upload.single("audio"),
  validateAudio,
  evaluateRouter
);

// Writing evaluation: JSON body → grading
app.use("/api/evaluate-writing", verifyAuth, checkUsage, evaluateWritingRouter);

// Generate speaking prompts / writing Task 1 graphs
app.use("/api/generate-prompts", verifyAuth, checkUsage, generatePromptsRouter);

// Listening module: generate, fetch tests, evaluate
app.use("/api/listening", verifyAuth, checkUsage, listeningRouter);

// Pronunciation standalone scoring
app.use(
  "/api/pronunciation",
  verifyAuth,
  checkUsage,
  upload.single("audio"),
  validateAudio,
  pronunciationRouter
);

// Reading module: generate + evaluate
app.use("/api/reading", verifyAuth, checkUsage, readingRouter);

// Standalone transcription
app.use(
  "/api/transcribe",
  verifyAuth,
  checkUsage,
  upload.single("audio"),
  validateAudio,
  transcribeRouter
);

// Payments (Lemon Squeezy checkout + webhook)
app.use("/api/payments", paymentsRouter);

// AI Chatbot (text + image + voice)
app.use("/api/chatbot", chatbotRouter);

// Realtime speaking practice (OpenAI Realtime API)
app.use("/api/realtime", realtimeRouter);

// Admin routes (grant-pro, set-admin)
app.use("/api/admin", adminRouter);

// User profile and plan routes
app.use("/api/user", verifyAuth, userRouter);

// Vocabulary mini-app (Firestore-backed SRS flashcards). CRUD is auth-only;
// the AI deck generator inside applies checkUsage since it calls a paid model.
app.use("/api/vocab", verifyAuth, vocabRouter);

// IELTS Library (Global decks for all users)
app.use("/api/library", verifyAuth, require("./routes/library"));

// Rewarded-ad credit (watch a video → earn one evaluation, capped per day)
app.use("/api/ads", verifyAuth, adsRouter);

// Pre-paid test sessions
app.use("/api/test-session", testSessionRouter);
app.use("/api/history", historyRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/cron", cronRouter);
app.use("/api/account", accountRouter);

// ─── Gamification / Streak stats ────────────────────────────────
app.get("/api/stats", verifyAuth, async (req, res) => {
  try {
    const stats = await getStats(req.uid);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch stats." });
  }
});

// ─── Health check ───────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const firebaseError = getFirebaseInitError();
  res.json({
    status: "ok",
    service: "bandlogic-server",
    version: "1.0.0",
    uptime: process.uptime(),
    firebase: firebaseError ? `error: ${firebaseError}` : "connected",
    firebaseApps: getAppsLength(),
    env: {
      openai: !!process.env.OPENAI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
      azure: !!process.env.AZURE_SPEECH_KEY,
      firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      lemonSqueezy: !!process.env.LEMONSQUEEZY_API_KEY,
    },
    timestamp: new Date().toISOString(),
  });
});

// ─── Root / catch-all ───────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "BandLogic API",
    description: "AI-powered IELTS coaching — Speaking · Writing · Reading · Listening",
    version: "1.0.0",
    endpoints: [
      "POST /api/evaluate           — Speaking evaluation",
      "POST /api/evaluate-writing    — Writing evaluation",
      "POST /api/generate-prompts    — Generate speaking questions",
      "POST /api/generate-prompts/writing-task1 — Generate Task 1 graph",
      "POST /api/listening/generate  — Generate listening test",
      "GET  /api/listening/tests     — List available tests",
      "GET  /api/listening/test/:id  — Fetch a specific test",
      "POST /api/listening/evaluate  — Mark listening answers",
      "POST /api/reading/generate    — Generate reading passage",
      "POST /api/reading/evaluate    — Mark reading answers",
      "POST /api/pronunciation       — Pronunciation scoring",
      "POST /api/transcribe          — Audio transcription",
      "POST /api/chatbot/message     — AI tutor chat",
      "POST /api/chatbot/voice       — Voice chat (audio → reply → TTS)",
      "POST /api/realtime/token      — OpenAI Realtime session token",
      "POST /api/payments/checkout   — Create checkout link",
      "POST /api/payments/webhook    — Lemon Squeezy webhook",
      "POST /api/admin/grant-pro     — Admin: grant premium access",
      "POST /api/admin/set-admin     — Admin: promote user to admin",
      "GET  /api/vocab               — List vocabulary cards",
      "POST /api/vocab               — Create card(s)",
      "PUT  /api/vocab/:id           — Update a card (review/edit)",
      "DELETE /api/vocab/:id         — Delete a card",
      "POST /api/vocab/generate      — AI-generate a themed deck",
      "GET  /api/stats               — Gamification stats",
      "GET  /api/health              — Server health check",
    ],
  });
});

// ─── Global error handler ───────────────────────────────────────
app.use(errorHandler);

// ─── Start server ───────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎯 BandLogic server running on port ${PORT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Endpoints:
    Speaking   → POST /api/evaluate
    Writing    → POST /api/evaluate-writing
    Reading    → POST /api/reading/*
    Listening  → POST /api/listening/*
    Chatbot    → POST /api/chatbot/*
    Realtime   → POST /api/realtime/token
    Payments   → POST /api/payments/*
    Admin      → POST /api/admin/*
    Stats      → GET  /api/stats
    Health     → GET  /api/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));
process.on('uncaughtException',  (err) => console.error('UncaughtException:', err)); // Let the platform restart if needed

module.exports = app;
