require("dotenv").config();

const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const validateAudio = require("./middleware/validateAudio");
const { upload } = require("./middleware/upload");
const rateLimit = require("./middleware/rateLimit");
const { verifyAuth } = require("./middleware/verifyAuth");
const { checkUsage } = require("./middleware/checkUsage");

// Route imports
const transcribeRoute = require("./routes/transcribe");
const evaluateRoute = require("./routes/evaluate");
const pronunciationRoute = require("./routes/pronunciation");
const generatePromptsRoute = require("./routes/generatePrompts");
const evaluateWritingRoute = require("./routes/evaluateWriting");
const readingRoute = require("./routes/reading");
const listeningRoute = require("./routes/listening");
const paymentsRoute = require("./routes/payments");
const chatbotRoute = require("./routes/chatbot");
const adminRouter = require('./routes/adminRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');

const app = express();
// Cloud hosts (Render/Railway/etc.) inject PORT and expect the app to bind it.
const PORT = process.env.PORT || process.env.NODE_PORT || 3001;

// Trust the first proxy hop so req.ip reflects the real client address when
// deployed behind a reverse proxy / load balancer (needed for rate limiting).
app.set("trust proxy", 1);

// === Middleware ===
// Allowed origins: the Capacitor app (installed APK is served from
// https://localhost) plus any comma-separated origins in CORS_ORIGIN (e.g. the
// web dev server). Requests with no Origin header (native/mobile/curl) pass.
const APP_ORIGINS = [
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  "https://professor-ielts-1.onrender.com", // hosted UI (Render static site)
];
const configuredOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...configuredOrigins, ...APP_ORIGINS]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Mount payments BEFORE global express.json so webhook can receive raw buffers
app.use("/api/payments", rateLimit, paymentsRoute);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use('/snippets', express.static('d:/NERD speaking/audios/snippets'));

// === Routes ===
// rateLimit guards every paid AI endpoint against abuse / runaway cost (applied
// per-route so the unauthenticated /api/health probe is never throttled).
// Multer must run BEFORE validateAudio so the multipart body is parsed and
// req.file exists when validation executes. (Previously validateAudio ran
// first and always saw req.file === undefined, so it validated nothing.)
app.use("/api/transcribe", rateLimit, verifyAuth, upload.single("audio"), validateAudio, transcribeRoute);
app.use("/api/evaluate", rateLimit, verifyAuth, checkUsage, upload.single("audio"), validateAudio, evaluateRoute);
app.use("/api/pronunciation", rateLimit, verifyAuth, checkUsage, upload.single("audio"), validateAudio, pronunciationRoute);
app.use("/api/generate-prompts", rateLimit, verifyAuth, generatePromptsRoute);
// Writing & Reading are JSON endpoints (no audio), so they skip the multer /
// validateAudio chain but keep rateLimit to guard OpenAI cost.
app.use("/api/evaluate-writing", rateLimit, verifyAuth, checkUsage, evaluateWritingRoute);
app.use("/api/reading", rateLimit, verifyAuth, readingRoute); // checkUsage is applied inside reading.js for /evaluate
// Listening: TTS synth on /generate is slow & cost-heavy, so keep it behind
// the same rateLimit guard as the other paid AI endpoints.
app.use("/api/listening", rateLimit, verifyAuth, checkUsage, listeningRoute);

app.use("/api/chatbot", rateLimit, verifyAuth, chatbotRoute);
app.use("/api/admin", adminRouter);
app.use("/api/realtime", rateLimit, realtimeRoutes);

// Endpoint for frontend to fetch the user's plan
app.get("/api/user/me", verifyAuth, async (req, res) => {
  try {
    const { db } = require('./services/firebaseAdmin');
    if (!db) return res.json({ success: true, plan: 'free' });
    
    const userDoc = await db.collection('users').doc(req.uid).get();
    const data = userDoc.exists ? userDoc.data() : {};
    
    const now = new Date();
    let plan = 'free';
    
    // Normalize legacy "premium" → "pro"
    const rawPlan = data.plan === 'premium' ? 'pro' : (data.plan || 'free');

    if (data.premiumUntil && data.premiumUntil.toDate() > now) {
      plan = rawPlan;
    } else if (rawPlan === 'ultra' || rawPlan === 'pro') {
      plan = rawPlan;
    }
    
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Gamification stats (streak, XP, badges)
app.get("/api/user/stats", verifyAuth, async (req, res) => {
  try {
    const { getStats } = require('./services/streakService');
    const stats = await getStats(req.uid);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Vocabulary CRUD ───
app.get("/api/vocab", verifyAuth, async (req, res) => {
  try {
    const { db } = require('./services/firebaseAdmin');
    if (!db) return res.json({ success: true, data: [] });
    const snap = await db.collection('users').doc(req.uid).collection('vocab')
      .orderBy('createdAt', 'desc').limit(200).get();
    const cards = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/vocab", verifyAuth, async (req, res) => {
  try {
    const { db } = require('./services/firebaseAdmin');
    if (!db) return res.status(503).json({ success: false, error: "DB not configured" });
    const { wrong, correct, context, section } = req.body;
    if (!wrong || !correct) return res.status(400).json({ success: false, error: "wrong and correct are required" });
    const card = {
      wrong, correct, context: context || '',
      section: section || 'general',
      interval: 1,        // days until next review
      easeFactor: 2.5,    // SM-2 ease factor
      nextReview: new Date(),
      createdAt: new Date(),
    };
    const ref = await db.collection('users').doc(req.uid).collection('vocab').add(card);
    res.json({ success: true, data: { id: ref.id, ...card } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/vocab/:id/review", verifyAuth, async (req, res) => {
  try {
    const { db } = require('./services/firebaseAdmin');
    if (!db) return res.status(503).json({ success: false, error: "DB not configured" });
    const { quality } = req.body; // 0-5 (SM-2 scale), 3+ = pass
    const cardRef = db.collection('users').doc(req.uid).collection('vocab').doc(req.params.id);
    const doc = await cardRef.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: "Card not found" });
    
    const data = doc.data();
    let { interval, easeFactor } = data;
    const q = Math.max(0, Math.min(5, quality || 0));
    
    // SM-2 algorithm
    if (q >= 3) {
      if (interval <= 1) interval = 1;
      else if (interval === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    } else {
      interval = 1;
    }
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    await cardRef.update({ interval, easeFactor, nextReview, lastReviewed: new Date() });
    res.json({ success: true, data: { interval, easeFactor, nextReview } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BandLogic Backend",
    timestamp: new Date().toISOString(),
    env: {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      pronunciationUrl: process.env.PYTHON_PRONUNCIATION_URL || "not configured",
      firebaseConfigured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    },
  });
});

// === Error Handler (must be last) ===
app.use(errorHandler);

// === Start Server ===
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   BandLogic — Backend                      ║
  ║   Running on http://localhost:${PORT}          ║
  ╠════════════════════════════════════════════╣
  ║   OpenAI API:  ${process.env.OPENAI_API_KEY ? "✓ Configured" : "✗ Missing"}              ║
  ║   Pronunciation: ${process.env.PYTHON_PRONUNCIATION_URL || "http://localhost:8000"}   ║
  ╚════════════════════════════════════════════╝
  `);
});

module.exports = app;
