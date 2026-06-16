# Professor IELTS — Architecture & UI/UX Review

**Reviewed:** June 2026 · **Scope:** full software-house audit (architecture, backend, frontend, UI/UX, security, DevOps, QA, ML/scoring validity, product)
**Codebase:** `professor-ielts/` (React + Vite client, Node/Express server, Python/FastAPI pronunciation service)

---

## 1. What this project is

Professor IELTS is an AI IELTS-Speaking coach. A student records or uploads a spoken answer; the system transcribes it, analyses fluency and disfluencies, grades it against IELTS criteria, and returns a band score with actionable feedback and a printable report.

**Actual runtime architecture (three tiers):**

| Tier | Tech | Port | Responsibility |
|------|------|------|----------------|
| Client | React 19 + Vite + Tailwind | 5173 | Recording, upload, 6-tab evaluation dashboard, history (localStorage) |
| Server | Node.js + Express | 3001 | Orchestrates the pipeline; calls OpenAI; proxies pronunciation |
| Pronunciation | Python FastAPI + MFA + Wav2Vec2 | 8000 | Phoneme-level GOP scoring — **currently disabled in code** |

**Pipeline (POST `/api/evaluate`):** Whisper verbatim transcription → pause detection from word timestamps → `gpt-4o-mini` disfluency analysis → (pronunciation, disabled) → `gpt-4o-mini` FC/LR/GRA grading → merge into an overall band.

**The single most important thing to understand:** despite the README, this app runs **entirely on OpenAI** (Whisper + `gpt-4o-mini`). The Groq and Gemini service files exist but are not wired into any route. The Python pronunciation tier is built and deployed but switched off (`ACOUSTIC_PRONUNCIATION_ENABLED = false`), so "pronunciation" in the score is currently a proxy derived from Whisper's confidence, not phoneme analysis.

---

## 2. Is there architecture / system / UI-UX design documentation?

**Largely no — this is the first gap.** What exists:

- A 4-row architecture table and endpoint table in `README.md` (and it is partly inaccurate — see §4.4).
- A prompt-engineering meta-doc (`ielts-system-prompt-meta-prompt.md`) — valuable, but it documents the grader prompt, not the system.

**Missing:** no `ARCHITECTURE.md`, no diagrams (context / container / sequence), no Architecture Decision Records, no data-flow or data-model doc, no API contract/OpenAPI spec, no UI/UX design system (no documented tokens, component inventory, states, accessibility notes), no threat model, no runbook. For a three-language, three-service system with a non-trivial scoring pipeline, the absence of a single source of truth is itself an architectural risk: the provider drift in §4.4 is a direct symptom of having no canonical design doc.

This document is intended to seed that missing layer. A recommended target architecture is in §6.

---

## 3. Severity legend

| Level | Meaning |
|-------|---------|
| **P0 — Critical** | Broken, insecure, or actively misleading; fix now. |
| **P1 — High** | Real correctness/scalability/UX risk; fix before real users. |
| **P2 — Medium** | Quality, maintainability, polish. |

Items marked **✅ Fixed in this pass** were corrected in the code during this review (see §5).

---

## 4. Findings by discipline

### 4.1 System Architecture

**A. The pipeline is a single synchronous request that can run ~3 minutes. (P1)**
`/api/evaluate` does transcription + pause detection + disfluency LLM call + grading LLM call inside one HTTP request; the client timeout is 180s. One Express worker is tied up for the whole job. Under even light concurrency this starves the event loop's outbound capacity, makes the app impossible to run on serverless (function timeouts), and gives the user a 1–3 minute spinner with no progress truth.
**Fix:** move to an async job model — `POST /evaluate` returns a `jobId`; a worker processes it; the client polls `GET /evaluate/:jobId` or subscribes via SSE/WebSocket. Even without a queue, decouple the long work from the request and stream the existing `evaluationStep` stages to the UI.

**B. The pronunciation tier is deployed but disabled. (P1)**
`docker-compose.yml` builds and runs a 6 GB Python/MFA/Wav2Vec2 service, but `ACOUSTIC_PRONUNCIATION_ENABLED = false` means `/api/evaluate` never calls it. You pay the full operational cost (build time, memory reservation, attack surface) for zero functional benefit.
**Fix:** pick one — (a) profile the compose service behind a flag/profile (`profiles: ["pronunciation"]`) so it only runs when enabled, or (b) replace the local acoustic engine with a hosted API (Azure Pronunciation Assessment / Speechace) as the code comments already plan, and delete the local tier.

**C. No persistence layer. (P1)**
There is no database. All history lives in browser `localStorage`. Consequences: no cross-device history, no analytics, no way to improve calibration from real data, and a hard ~5 MB quota that full evaluation objects (transcript + word arrays + criteria) will hit. `useLocalStorage` swallows the quota error (`catch { console.warn }`), so saves **fail silently** — the user thinks history is kept and it isn't.
**Fix:** add a datastore (Postgres or SQLite to start) and persist evaluations server-side behind a lightweight account/anonymous-id; keep localStorage only as a cache.

**D. No observability. (P2)** Rich `console.log` lines exist but there is no structured logging, no request IDs, no metrics/tracing, no error reporting. When a grade looks wrong in production you cannot reconstruct the request. **Fix:** add `pino`/`morgan` with request IDs and a Sentry-style error reporter.

### 4.2 Backend Engineering

**A. Audio-validation middleware never ran. (P0) ✅ Fixed**
`validateAudio` was mounted *before* Multer parsed the body, so `req.file` was always `undefined` and it returned `next()` immediately — the extension/MIME allow-list validated nothing. Multer's 25 MB limit was the only real guard. **Fixed:** Multer now runs first (`upload.single("audio") → validateAudio → route`), centralised in `middleware/upload.js`; the per-route Multer copies were removed.

**B. Unvalidated LLM scores could produce a `NaN` band. (P0) ✅ Fixed**
`evaluateTranscript` did `JSON.parse(...)` then the route averaged `(fc + lr + gra)/3` with no checks. A missing/non-numeric field silently yields `NaN`, which is then rounded, displayed, and saved to history. **Fixed:** added `normalizeBand()` — coerces, clamps to 0–9, snaps to 0.5, and throws a clean error if a score is missing rather than poisoning the band.

**C. Dead provider code. (P2)** `services/groqService.js` and `services/geminiService.js` are not imported by any route. `groqService` also ships a self-doubting model name (`"qwen-2.5-32b" // fallback ... if qwen/qwen3-32b is invalid`). Dead code that references different env vars is exactly what caused the doc drift. **Fix:** delete them, or formalise a provider interface (`services/providers/{openai,groq,gemini}.js` + a factory selected by `LLM_PROVIDER`) if multi-provider is a real goal.

**D. No input schema validation. (P2)** Route bodies (`questionText`, `questionPart`, `topic`, `transcript`) are read directly. `parseInt(req.body.questionPart)` can yield `NaN`; `transcript` length is unbounded (cost/DoS via a giant text-only request). **Fix:** validate with `zod`/`joi`; cap transcript length; coerce `questionPart` to 1–3.

**E. Error responses leak internals. (P2)** `errorHandler` returns `detail: err.message` to the client. Low severity, but it exposes provider internals. **Fix:** return a generic message to the client, keep `err.message`/stack server-side only. (The stale Groq/Gemini branches here were ✅ fixed — see §4.4.)

### 4.3 Frontend Engineering

**A. No error boundary. (P1)** `App.jsx` renders the panels directly. Any render-time throw (e.g. a malformed history record from an older app version) blanks the entire screen with no recovery. **Fix:** wrap the app in an error boundary with a reset action; guard against shape drift when reading persisted records.

**B. Silent localStorage failures. (P1)** As in §4.1-C — `useLocalStorage` catches and warns on write failure. Combined with growing history this means real data loss the user never sees. **Fix:** surface a "history full / couldn't save" toast, cap stored records, and/or compress.

**C. State management will not scale as-is. (P2)** A single `AppContext` holds all session + persisted state; every consumer re-renders on any change. Fine today; split or move to a store (Zustand) before the dashboard grows. **Fix:** split contexts (session vs. settings vs. history) or adopt a store.

**D. `useAudioRecorder` cleanup. (P2)** The unmount effect calls `stopRecording`/revokes URLs with an empty dependency array; it relies on stable `useCallback` identities and will trip `react-hooks/exhaustive-deps`. It works, but is fragile. **Fix:** include the stable callbacks or inline cleanup.

### 4.4 Provider / Documentation Drift — **the highest-leverage bug** (P0) ✅ Fixed

The README, `.env.example`, and `errorHandler.js` described a **Groq + Gemini** system; the code runs on **OpenAI**, and `.env.example` did not even contain `OPENAI_API_KEY`. A new engineer following the README would set the wrong keys and the app would not start — and the error handler branched on Groq/Gemini errors that can no longer occur, so OpenAI failures fell through to a generic 500.
**Fixed:** `.env.example` now lists `OPENAI_API_KEY` as required (Groq/Gemini marked optional/legacy); README env-setup, feature list, and endpoint table corrected to OpenAI; `errorHandler` now recognises OpenAI SDK errors (incl. 429 quota/rate-limit surfaced as 429).

### 4.5 UI/UX Design

**A. No documented design system. (P2)** Styling is ad-hoc Tailwind utility soup (e.g. `text-2xl font-black text-amber-900`) repeated across components. There are no tokens, no component states inventory, no spacing/typography scale on paper. **Fix:** extract semantic tokens into `tailwind.config.js` (colours, score states, type scale) and write a one-page component/state catalogue. *(You have a `design:design-system` skill available for this.)*

**B. Score meaning is colour-only. (P1, accessibility)** `getScoreColor`/`getScoreClass` encode good/okay/poor purely as green/amber/red. Colour-blind and low-vision users can't distinguish bands; this likely fails WCAG 1.4.1 (use of colour). **Fix:** pair colour with text/icon/shape, and verify contrast for the amber-on-light combinations. *(Run the `design:accessibility-review` skill.)*

**C. Tab bar isn't an accessible tablist. (P2)** `EvaluationPanel` renders `<button>`s without `role="tab"`, `aria-selected`, or arrow-key navigation. Screen-reader users get six unlabelled buttons. **Fix:** add proper `tablist`/`tab`/`tabpanel` semantics and keyboard handling.

**D. Layout is desktop-only. (P1)** `PracticeRoom` is a flex row with a fixed `w-[420px]` question panel beside the recorder; `App` uses `h-screen … overflow-hidden`. On a phone the 420 px panel crushes the recorder and the fixed-height shell fights mobile browser chrome. There are no breakpoints here. **Fix:** stack to a single column under `md:`, make the question panel collapsible, and test on a real mobile viewport.

**E. Long-job feedback. (P2)** There's an `evaluationStep` value but a 1–3 minute wait needs honest staged progress ("Transcribing… Analysing fluency… Grading…") tied to real backend stages (see §4.1-A), not a spinner. **Fix:** stream stages; show estimated time.

### 4.6 Security

**A. No auth + no rate limiting on paid endpoints. (P0) ✅ Fixed (rate limiting)**
Every `/api` route calls a paid OpenAI endpoint with no authentication and no throttle — a public deploy can be drained to run up an unbounded bill and exhaust quota for everyone. **Fixed:** added a dependency-free in-memory limiter (`middleware/rateLimit.js`, default 60 req / 15 min / IP, tunable via `RATE_LIMIT_*`), applied per-route, with `trust proxy` set for correct client IPs. **Still recommended (P1):** real auth (even anonymous signed IDs) and, for multi-instance deploys, move the limiter to Redis; add a per-key/day cost cap.

**B. Live secrets sit in plaintext, in two divergent files. (P0 — operational)**
`.env` and `server/.env` both contain **real** `OPENAI_API_KEY`/`GEMINI_API_KEY` values, and the two Gemini keys **differ** between files. `.gitignore` does exclude `.env`, and the folder isn't a git repo yet — so nothing is committed — but real keys are sitting unencrypted on disk in two places with no single source of truth. **Fix (do this manually — I did not touch your keys):** rotate the exposed keys now; keep exactly one `.env` (the server reads its own `server/.env` via `dotenv` when started from `server/`, while compose uses the root `.env` — reconcile to one); use a secrets manager for anything beyond local dev.

**C. No security headers. (P2)** No `helmet`. Pronunciation FastAPI uses `allow_origins=["*"]`. **Fix:** add `helmet` on Express; lock the FastAPI CORS to the server origin (it should never be hit by browsers directly).

**D. Prompt injection / info disclosure (P2):** `topic` is string-interpolated into the generation prompt (low stakes), and the health endpoint advertises which keys are configured. Minor; sanitise/limit as cleanup.

### 4.7 DevOps / SRE

**A. The client image ships the Vite dev server as "production". (P1)** `client/Dockerfile` ends `CMD ["npm","run","dev"]`. That's HMR, no minification, source exposed, single-threaded — not a production server. **Fix:** multi-stage build → `npm run build` → serve `dist/` via nginx (or `vite preview` at minimum).

**B. Duplicate, drifted pronunciation Dockerfiles. (P2)** `Dockerfile.pronunciation` (the one compose builds) is complete and correct — it even adds CPU-only torch + an nltk download. `Dockerfile.pronunciation.fixed` is an **older, inferior** duplicate missing those steps. Two files, one stale, no note saying which is canonical. **Fix:** delete `Dockerfile.pronunciation.fixed`. *(Compose is wired to the right one — no build breakage.)*

**C. Compose has no health gating. (P2)** `client.depends_on: server` and `server → pronunciation` wait for container start, not readiness; there are no `healthcheck` blocks, though both services expose `/api/health` and `/health`. **Fix:** add healthchecks and `depends_on: condition: service_healthy`.

**D. `Dockerfile.server` is outside its build context.** `context: ./server, dockerfile: ../Dockerfile.server` works (Compose reads the Dockerfile separately), but it's surprising. **Fix:** move `Dockerfile.server` into `./server` for clarity, or document why.

### 4.8 QA / Testing

**No automated tests exist. (P1)** The client has no test runner; the server has only ad-hoc scripts (`test-generate.js`, `test_groq.js`) that hit live APIs. There is zero protection against regressions in exactly the fragile parts: score parsing, band rounding, pause detection, middleware ordering. **Fix:** add Vitest + Supertest on the server (unit-test `normalizeBand`, `detectPauses`, `validateAudio`, the rate limiter; contract-test routes with the LLM mocked) and Vitest + Testing Library on the client (reducers/hooks, history persistence). Add a CI workflow that runs lint + tests + `node --check`.

### 4.9 ML / Speech-Scoring Validity (domain expert)

**A. "Pronunciation" is currently an ASR-confidence proxy folded into the band. (P1)**
With the acoustic engine off, `estimatePronunciation()` maps Whisper's duration-weighted `avg_logprob` to a band and — when audio is present — includes it in the 4-criterion IELTS mean. But `avg_logprob` is the recogniser's confidence in *its own transcription*; it co-varies with mic quality, background noise, speaking rate, and accent familiarity at least as much as with pronunciation. Presenting it as a "Pronunciation" band that moves the headline score is a **validity problem** for an assessment product, even though the UI copy hedges it. **Fix:** either exclude the proxy from the overall band (report it as a separate, clearly-labelled "intelligibility estimate"), or integrate a real pronunciation-assessment API and turn the criterion back on. Calibrate thresholds against human-rated samples before trusting either.

**B. The disabled acoustic scorer had real method bugs.** The team correctly disabled it; for the record, `scorer.py._map_phone` matches ARPAbet→IPA by loose substring (`if ipa in label or label in label`), which over-matches phones, and alignment was approximate. Don't re-enable as-is; prefer a hosted engine or proper MFA forced alignment with a verified phone map.

**C. Grader calibration is unguarded. (P2)** The examiner prompt is strong and self-aware about central-tendency bias, but nothing measures whether scores are actually calibrated. **Fix:** keep a small gold-set of human-rated responses and track grader agreement over time (now feasible once §4.1-C persistence exists).

### 4.10 Product

- **Pronunciation honesty.** The headline feature ("phoneme-level pronunciation") is off; the UI shows an estimate. Decide and message clearly — users will judge an IELTS tool on score trust.
- **No accounts = no retention loop.** History is device-bound; progress charts can't follow a user. This caps the core value prop (tracking improvement).
- **Cost model.** Every evaluation is two `gpt-4o-mini` calls + Whisper; with no auth/limits the unit economics are unprotected (now partly mitigated by the rate limiter).

---

## 5. Corrections applied in this pass

| # | Issue | Severity | Files |
|---|-------|----------|-------|
| 1 | Audio validation middleware never executed (ran before Multer) | P0 | `server/index.js`, new `server/middleware/upload.js`, `routes/{transcribe,evaluate,pronunciation}.js` |
| 2 | Unvalidated LLM scores → possible `NaN` overall band | P0 | `server/services/openaiService.js` (`normalizeBand` + validation) |
| 3 | Provider drift: docs/config/error-handler said Groq/Gemini; app uses OpenAI; `OPENAI_API_KEY` absent from `.env.example` | P0 | `.env.example`, `README.md`, `server/middleware/errorHandler.js` |
| 4 | No rate limiting/abuse protection on paid AI endpoints | P0 | new `server/middleware/rateLimit.js`, `server/index.js` (+`trust proxy`) |

**Verification:** all changed server files pass `node --check` on the real filesystem; module wiring (routes, middleware, `upload.single`, error-handler arity) loads cleanly with a dummy key. Note: the sandbox's mounted view briefly served truncated copies of the two largest edited files — re-run locally to confirm:
```bash
cd server && npm install && node --check routes/evaluate.js services/openaiService.js && node index.js
```

**Not auto-changed (require your judgment / credentials):** rotating the live API keys (§4.6-B), deleting dead provider files and the stale Dockerfile, and the larger architectural moves below.

---

## 6. Prioritised roadmap

**P0 — now**
1. Rotate the exposed API keys; consolidate to one `.env`. (§4.6-B)
2. Verify the four applied fixes locally and commit. (§5)

**P1 — before real users**
3. Decide the pronunciation story: exclude the proxy from the band, or wire a hosted assessment API. (§4.9-A, §4.1-B)
4. Make evaluation asynchronous with staged progress. (§4.1-A, §4.5-E)
5. Add a database + (anonymous) accounts; stop losing history silently. (§4.1-C, §4.3-B)
6. Production client image (build + nginx). (§4.7-A)
7. Error boundary + mobile layout. (§4.3-A, §4.5-D)
8. Auth on `/api`; security headers. (§4.6-A/C)
9. Test suite + CI. (§4.8)

**P2 — quality**
10. Delete dead provider files + stale Dockerfile; add a provider interface if multi-provider is real. (§4.2-C, §4.7-B)
11. Design-system tokens + accessibility pass (tablist semantics, non-colour score cues). (§4.5)
12. Structured logging + error reporting; input schema validation. (§4.1-D, §4.2-D)

---

## 7. Suggested target architecture (sketch)

```
Browser (React, built static via nginx)
   │  HTTPS, signed anon-id / auth token
   ▼
API gateway / Express  ──►  Auth + per-key rate limit + cost cap
   │ POST /evaluate  → returns jobId (202)
   ▼
Job queue (BullMQ/Redis)
   ▼
Worker(s)
   ├─ OpenAI Whisper (transcribe)
   ├─ Disfluency + FC/LR/GRA (gpt-4o-mini)
   └─ Pronunciation API (Azure/Speechace)  ── optional, behind flag
   ▼
Postgres (users, evaluations, gold-set, calibration metrics)
   ▲
Client polls GET /evaluate/:jobId  (or SSE)  → staged progress, then result
```

This keeps the parts you've built (the pipeline stages, the strong grader prompt, the 6-tab dashboard) while removing the structural risks: the long synchronous request, the silent client-only storage, and the unmetered paid endpoints.
