# BandLogic — Senior Code Review (Claude)

**Scope:** `bandlogic-real/` (active repo, latest commit `f40c70b`) — Express/Node backend, React+Vite frontend, Capacitor wrapper.
**Date:** 2026-06-29
**Method:** Every finding below was read directly from the current source — file and line references are exact. Nothing here is speculative; where I initially suspected a problem but the code disproved it, I dropped it.

---

## 0. Read this first — the existing docs are stale

`AGENT-HANDOFF.md` and `ARCHITECTURE-ISSUES.md` describe protections that **are not in the running code**. Decisions may be getting made against a version of the app that no longer exists:

| Doc claims | Reality in current code |
|---|---|
| "all behind a dependency-free `middleware/rateLimit.js`" | `rateLimit.js` exists but is **never imported anywhere**. There is **no rate limiting at all**. (`grep` confirms only its own definition.) |
| CORS allow-list `APP_ORIGINS` incl. `capacitor://localhost` | `index.js:40` ships `cors({ origin: process.env.CORS_ORIGIN \|\| "*" })`. No allow-list in code. |
| "Endpoints are unauthenticated" (P1 #7) | Out of date the other way — Firebase auth **is** now applied on most routes (good!). |
| `ACOUSTIC_PRONUNCIATION_ENABLED = false`, "do not re-enable Python scorer" | `evaluate.js:24` now sets it `true` and uses **Azure Speech SDK** (not Python). |

Net: auth got added (good), but the rate-limiter and hardened CORS that the docs claim are protecting you **are not wired in**.

---

## 1. Severity summary

| # | Finding | Severity | Area |
|---|---------|----------|------|
| H1 | No rate limiting (the limiter is dead code) | High | Security / Cost |
| H2 | Paid AI routes have no usage metering (chatbot, transcribe, pronunciation, generate-prompts, listening, reading-generate) | High | Cost / Monetization |
| H3 | Path traversal in `GET /api/listening/test/:id` | High | Security |
| H4 | `AudioContext` never closed → recorder dies after ~6 takes | High | Bug (core feature) |
| H5 | `/api/evaluate` runs 3 independent AI calls sequentially | High | Performance |
| M1 | CORS default falls back to `*` | Medium | Security |
| M2 | No `uncaughtException`/`unhandledRejection` handlers; ffmpeg stdin error can crash the process | Medium | Reliability |
| M3 | `localStorage` saves fail silently + history grows unbounded → data loss | Medium | Bug / Data |
| M4 | No React error boundary → one render throw = white screen | Medium | Reliability |
| M5 | ChatWidget leaks object URLs (image preview re-created every render) | Medium | Memory |
| M6 | Better `errorHandler.js` is dead code; inline handler leaks `err.message` and mis-maps provider errors | Medium | Security / DX |
| M7 | Free credit is consumed even when evaluation fails | Medium | Product |
| M8 | Answer-key token is plain base64 (readable + tamperable) | Medium | Integrity |
| M9 | `AppContext` value object not memoized → all consumers re-render on any state change | Medium | Performance |
| L1–L12 | Info leaks, dead code, duplicate render, sync I/O, timer leaks, etc. | Low | Various |

---

## 2. High severity

### H1 — No rate limiting (the limiter exists but is never used)
**Files:** `server/middleware/rateLimit.js` (defined), `server/index.js` (never imports it).

Every `/api/*` route calls a paid provider (OpenAI Whisper/GPT/TTS, Azure). With auth but no rate limit, one logged-in account (incl. anonymous guests) can loop requests and run up your bill. The handoff doc assumes this file protects you; it doesn't.

**Fix — wire it in globally (`server/index.js`):**
```js
const rateLimit = require("./middleware/rateLimit"); // add with the other middleware imports

// Render/Hostinger sit behind a proxy — without this, every request looks like
// one IP and the limiter is useless (or wrong).
app.set("trust proxy", 1);

app.use(cors({ /* ...existing... */ }));
app.use(rateLimit);            // <-- add, before the body parsers / routes
```
Optionally exempt the webhook: `if (req.path === "/api/payments/webhook") return next();` inside a wrapper, since Lemon Squeezy isn't a per-user caller.

---

### H2 — Paid AI endpoints have no usage metering
**File:** `server/index.js` (mount table) cross-checked against each router.

`checkUsage` is applied to `/api/evaluate`, `/api/evaluate-writing`, `/api/realtime/token`, and `/api/reading/evaluate`. It is **missing** from these paid routes:

| Route | Paid work | Metered? |
|---|---|---|
| `/api/chatbot/message` + `/voice` | GPT-4o-mini (+ Whisper + TTS on voice) | ❌ |
| `/api/transcribe` | Whisper | ❌ |
| `/api/pronunciation` | Azure + ffmpeg | ❌ |
| `/api/generate-prompts` (+`/writing-task1`) | GPT-4o-mini | ❌ |
| `/api/listening/generate` | GPT-4o-mini + many TTS calls (most expensive single call in the app) | ❌ |
| `/api/reading/generate` | GPT-4o | ❌ |

A free user can call `/api/listening/generate` (dozens of TTS calls) unlimited. **`/generate` is metered nowhere while `/evaluate` is** — backwards, since generation is the expensive half.

**Fix — add `checkUsage` at the mount points (`server/index.js`):**
```js
app.use("/api/generate-prompts", verifyAuth, checkUsage, generatePromptsRouter);
app.use("/api/listening",        verifyAuth, checkUsage, listeningRouter);   // or meter only /generate inside the router
app.use("/api/reading",          verifyAuth, checkUsage, readingRouter);
app.use("/api/pronunciation",    verifyAuth, checkUsage, upload.single("audio"), validateAudio, pronunciationRouter);
app.use("/api/transcribe",       verifyAuth, checkUsage, upload.single("audio"), validateAudio, transcribeRouter);
```
And add `verifyAuth, checkUsage` to the chatbot routes (currently `router.post('/message', verifyAuth, ...)` — add `checkUsage`). If chat should stay cheaper, give it its own lighter quota rather than none.

---

### H3 — Path traversal in `GET /api/listening/test/:id`
**File:** `server/routes/listening.js:49-54`

```js
const filePath = path.join(TESTS_DIR, `test_${req.params.id}.json`);
if (!fs.existsSync(filePath)) return res.status(404)...
const testData = JSON.parse(fs.readFileSync(filePath));
```
`req.params.id` is interpolated straight into a path. `id = ../../../../some/dir/file` resolves outside `TESTS_DIR`. It's constrained to read-only `.json` files and the route is auth-gated, so it's not catastrophic — but it's a real traversal that lets any logged-in user probe/read arbitrary JSON on the server.

**Fix — validate the id (whitelist), then confirm the resolved path stays inside the dir:**
```js
const id = String(req.params.id);
if (!/^[A-Za-z0-9_-]+$/.test(id)) {
  return res.status(400).json({ success: false, error: "Invalid test id." });
}
const filePath = path.join(TESTS_DIR, `test_${id}.json`);
if (!filePath.startsWith(TESTS_DIR + path.sep)) {
  return res.status(400).json({ success: false, error: "Invalid test id." });
}
```

---

### H4 — `AudioContext` is never closed → recording breaks after a handful of takes
**File:** `client/src/hooks/useAudioRecorder.js:52`

```js
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
```
`audioCtx` is a local variable, created fresh on every `startRecording`, and **never `.close()`d**. Browsers cap concurrent AudioContexts (~6 in Chrome). A student doing several speaking takes in one session will hit *"Failed to construct 'AudioContext': number of hardware contexts reached the maximum limit"* and the recorder silently stops working — on the app's core feature. (React `StrictMode` in `main.jsx` makes this surface even faster.)

**Fix — keep it in a ref and close it in `stopRecording`:**
```js
const audioCtxRef = useRef(null);
// ...in startRecording:
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
audioCtxRef.current = audioCtx;
// ...in stopRecording, after cancelAnimationFrame:
if (audioCtxRef.current) {
  audioCtxRef.current.close().catch(() => {});
  audioCtxRef.current = null;
}
```
**Also (same file, lines 24-29):** the unmount cleanup `useEffect(... , [])` closes over the *initial* `audioUrl` (`null`), so the final blob URL isn't revoked. Track `audioUrl` in a ref (or add it to deps) so cleanup revokes the current one.

---

### H5 — `/api/evaluate` does 3 independent AI round-trips in series
**File:** `server/routes/evaluate.js:88-151`

After transcription, the pipeline runs **disfluency analysis → pronunciation (Azure+ffmpeg) → LLM grading** strictly one after another. All three depend only on the transcript/audio from step 1 — none depends on another. Serially they stack to ~the sum of three model latencies (and each has a 30s budget). Running them concurrently cuts user-facing wait roughly to the slowest single call.

**Fix — parallelize steps 3–5 (preserving the non-fatal semantics of disfluency & pronunciation):**
```js
// after transcription + detectPauses(...)
const disfluencyP = withTimeout(
  openaiService.analyzeDisfluencies(transcript, transcriptWords),
  STEP_TIMEOUT_MS, "Disfluency analysis"
).catch((e) => { console.warn(`Disfluency failed — ${e.message}`); return null; });

const pronunciationP = ACOUSTIC_PRONUNCIATION_ENABLED
  ? scorePronunciation(req.file.buffer, transcript, req.file.originalname, transcriptWords)
      .catch((e) => { console.warn(`Pronunciation failed — ${e.message}`); return null; })
  : Promise.resolve(null);

const evaluationP = withTimeout(
  openaiService.evaluateTranscript(transcript, questionText, questionPart),
  STEP_TIMEOUT_MS, "LLM evaluation"
);

const [disfluencyData, pronunciationData, evaluationResult] =
  await Promise.all([disfluencyP, pronunciationP, evaluationP]);
// set pronunciationSource based on whether pronunciationData came back, as before
```
(Keep the text-only branch — when there's no `req.file`, just `await evaluationP`.) Separately, **`withTimeout` (lines 11-18) never clears its `setTimeout`**, so each call leaves a timer pending up to 30s; capture and `clearTimeout` it in a `.finally()`.

---

## 3. Medium severity

### M1 — CORS falls back to `*`
**File:** `server/index.js:40-44`. If `CORS_ORIGIN` isn't set on Render, the API accepts any origin. You use bearer tokens (not cookies), so this isn't a CSRF hole, but it lets any site drive your paid API from a browser. Use an explicit allow-list and stop defaulting to open:
```js
const ALLOWED = (process.env.CORS_ORIGIN || "https://bandlogic.online")
  .split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED.includes(origin)) ? cb(null, true) : cb(new Error("Not allowed by CORS")),
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
```
Include `capacitor://localhost` / `https://localhost` for the APK. Also consider adding `helmet` for security headers.

### M2 — No process-level safety net; ffmpeg stdin can crash the server
**Files:** `server/index.js` (no handlers), `server/services/pronunciationService.js:28-58`.
There's no `process.on('uncaughtException'/'unhandledRejection')`. In `convertToWav`, `ffmpeg.stdin.write(inputBuffer)` has no `error` listener — if the ffmpeg binary is missing or the audio is malformed, an `EPIPE` on stdin becomes an **uncaught exception that takes down the whole server** (killing every in-flight request, not just this one). 
```js
// pronunciationService.js
ffmpeg.stdin.on('error', (e) => reject(new Error(`ffmpeg stdin: ${e.message}`)));
// index.js (bottom)
process.on('unhandledRejection', (r) => console.error('UnhandledRejection:', r));
process.on('uncaughtException',  (e) => console.error('UncaughtException:', e)); // log, let platform restart
```

### M3 — Silent localStorage failures + unbounded history = data loss
**Files:** `client/src/hooks/useLocalStorage.js:18-24`, `client/src/context/AppContext.jsx:130`.
Every evaluation (full transcript, criteria, mistakes, plan) is prepended to `ielts:history` forever. When the ~5 MB quota fills, `setItem` throws and is swallowed with only a `console.warn` — the student keeps practicing while nothing persists, and silently loses history on reload. Fixes: (a) surface a real error/toast on quota failure (return a status from the hook), and (b) cap history (e.g. keep the most recent N per student, or strip bulky fields like raw `groqWords`/base64 before saving). The handoff's "add a datastore" (P1 #4) is the durable answer; the cap is the quick mitigation.

### M4 — No error boundary
**File:** confirmed none in the codebase; `client/src/App.jsx`. A single render-time throw (e.g. a malformed persisted record) blanks the entire SPA. Add a class `ErrorBoundary` with a reset button and wrap `<App/>` (or the `<main>` content) in `main.jsx`.

### M5 — ChatWidget object-URL leaks
**File:** `client/src/components/chatbot/ChatWidget.jsx:501` (and 67/404).
`<img src={URL.createObjectURL(imageFile)} />` is called **inline in JSX**, so a brand-new blob URL is created on *every render* while an image is staged (typing in the box re-renders) — none are revoked. Create the URL once in a `useEffect` keyed on `imageFile`, store it in state, and `URL.revokeObjectURL` in the cleanup. The per-message `imageUrl` URLs (line 67) also never get revoked; revoke them when messages are cleared/unmounted.

### M6 — The good error handler is dead code; the live one leaks details
**Files:** `server/middleware/errorHandler.js` (never imported), `server/index.js:207-225` (the inline one that actually runs), `server/middleware/verifyAuth.js:24`.
`errorHandler.js` cleanly maps OpenAI 429/502 and JSON errors — but nothing imports it, so the inline handler runs instead and returns raw `err.message` whenever `NODE_ENV !== "production"`. `verifyAuth` also returns `Details: ${error.message}` to the client. Wire up `errorHandler.js` (`app.use(errorHandler)` last) or fold its logic into the inline one, and make auth failures generic (`"Invalid or expired token."`). Also note the **health endpoint advertises which provider keys are configured** (`index.js:162-169`) — fine for an internal probe, but consider gating it.

### M7 — Failed evaluations still burn a free credit
**Files:** `server/middleware/checkUsage.js` runs before the route; `server/routes/evaluate.js` can still throw at transcription/grading. `checkAndIncrementUsage` increments *before* the AI work, so a provider error (or the new parallel pipeline rejecting) costs the user one of their 3 free evals for nothing. Consider decrementing on failure, or moving the increment to after a successful response.

### M8 — Listening/Reading answer key is plain base64
**Files:** `server/routes/listening.js:18-23`, `server/routes/reading.js:11-16`. The code comments are honest that this is "obfuscation, not security." A user can `atob()` the token to read every answer, or tamper with it. For a monetized scoring product this undermines score integrity. Minimum: HMAC-sign the token (`crypto.createHmac`) and verify on `/evaluate` to stop tampering; better: store the key server-side (Firestore) under a short-lived session id and hand the client only that id.

### M9 — `AppContext` value isn't memoized
**File:** `client/src/context/AppContext.jsx:147-199`. `value` is a fresh object every render, so **every** `useApp()` consumer re-renders whenever any field changes (`isEvaluating`, `evaluationStep`, `sidebarOpen`, …). Wrap `value` in `useMemo([...deps])`, or split session state from persisted state into separate contexts. (`AuthContext` has the same pattern but re-renders rarely, so it's lower priority.)

---

## 4. Low severity / cleanup

- **L1** `client/src/App.jsx:66-67` — `{currentView === 'admin' && <AdminDashboard />}` is duplicated; renders twice. Delete one line.
- **L2** Dead code: `server/services/groqService.js` and `geminiService.js` are only referenced by `test_groq.js`. `groqService` uses a guessed model (`qwen-2.5-32b`) and a `"dummy_key_to_prevent_crash"` fallback. Remove or formalize behind a provider factory.
- **L3** Dead middleware: `server/middleware/validateAudio.js` (the better one, with the size check + `video/webm`) is never imported — `index.js` uses its own inline copy (`index.js:68`). Pick one; delete the other. Same story as the error handler (M6).
- **L4** `client/src/utils/audioUtils.js:37` — `downloadMP3` opens an `AudioContext` and never closes it (one-shot, so minor).
- **L5** `server/routes/evaluate.js:264` and `evaluateWriting.js:47` — `require('../services/streakService')` inside the handler; hoist to top of file.
- **L6** `server/routes/listening.js:38-54` — `fs.existsSync`/`readFileSync`/`readdirSync` run synchronously on each request, blocking the event loop; cache the test index or use `fs.promises`.
- **L7** Listening `generate` returns all section audio as inline base64 in one JSON payload (`listeningService.js` → `toPublicSection`). For a full test this is multi-MB and +33% from base64; consider streaming or uploading clips to storage and returning URLs (you already do URL-based audio for official tests).
- **L8** Log/string mismatch: `evaluate.js:146` and `evaluateWriting.js:35` log "gpt-4o-mini" but `openaiService`/`writingService` actually call `gpt-4o`. Cosmetic, but misleading when debugging cost.
- **L9** `client/src/services/firebaseConfig.js` — the Firebase web API key is public by design (fine to ship), but restrict it in Google Cloud Console (HTTP referrer / package-name + API restrictions) so it can't be reused elsewhere.
- **L10** `client/android-debug.keystore` is committed. Debug keystores are throwaway so it's low-risk, but make sure the **release** keystore never lands in git, and prefer keeping keystores out entirely.
- **L11** `server/middleware/checkUsage.js` doesn't `try/catch` its await. It's currently safe only because `checkAndIncrementUsage` swallows its own errors and returns a value — keep that invariant in mind, or wrap `checkUsage` defensively so a future refactor can't hang the request.
- **L12** `multer@1.4.5-lts.1` is on the deprecated 1.x line; plan a move to `multer@2.x`. `pdf-parse` is a dependency but I didn't see it used in any route.

---

## 5. What's already solid (don't "fix" these)

- Auth via Firebase Admin `verifyIdToken`, with admin custom-claims and a seed-admin bootstrap — clean.
- Usage logic uses **Firestore transactions** (`usageService.js`) — correctly race-safe.
- Payments webhook verifies the HMAC signature with `crypto.timingSafeEqual` and a length guard — done right; checkout uses Lemon Squeezy custom data to map back to `uid`.
- Server-side band math (`utils/bands.js`, `normalizeBand`) never trusts the model's "overall"; the NaN-band guard in `openaiService`/`writingService` is a nice touch.
- Listening service: coalescing consecutive same-speaker TTS, batching, graceful per-clip fallback, and **stripping answer keys** before sending to the browser — thoughtful.
- `ListeningPlayer.jsx` builds object URLs in a memo and revokes on unmount — the right pattern (contrast with the recorder).
- `evaluate.js` already wraps disfluency/pronunciation as non-fatal and has per-step timeouts.

---

## 6. Suggested order of attack

1. **H2 + H1** — stop unmetered/unbounded spend (add `checkUsage` to the paid routes, wire the rate-limiter + `trust proxy`).
2. **H4** — close the `AudioContext`; it's breaking the core recorder for real users.
3. **H3, M1, M6** — quick security hardening (traversal, CORS allow-list, stop leaking error details / wire the real handler).
4. **H5** — parallelize the evaluate pipeline (biggest perceived-speed win).
5. **M2, M3, M4** — reliability (process handlers + ffmpeg stdin, localStorage quota, error boundary).
6. Sweep the Low list (delete dead code, fix the duplicate `AdminDashboard`, hoist requires).

Tell me which of these to apply and I'll make the edits directly against `bandlogic-real/` with before/after diffs for each.
