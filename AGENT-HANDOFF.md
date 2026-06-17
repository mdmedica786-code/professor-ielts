# BandLogic — Developer Handoff Prompt (paste this to the Antigravity agent)

> Copy everything below the line into your Google Antigravity IDE agent. It already
> has the code files, an agent ID, and is connected to Firebase + the Google
> account. The human owner is temporarily on a usage quota, so you (the agent) will
> carry the build forward.

---

You are taking over active development of **BandLogic**, an AI-powered IELTS
practice app (formerly "Professor IELTS" — the rebrand is done). Read this whole
brief before changing code. Work in small, verified steps and keep the live app
working at every push.

## 1. What the app is
BandLogic gives instant, examiner-style IELTS practice across **all four skills —
Speaking, Writing, Reading, Listening** — using OpenAI. It returns band scores
(0–9) with evidence, mistakes, and an action plan. Tagline: "Decode your IELTS.
Quantify your progress." Target users: South-Asia IELTS candidates (also tutors
with multiple students).

## 2. Repo, hosting & live URLs
- **Repo:** `https://github.com/mdmedica786-code/professor-ielts` (branch `main`).
  NOTE the repo slug is still `professor-ielts`; the product is BandLogic. Repo
  root **is** the project root (`server/`, `client/` are subfolders).
- **Backend (live):** `https://professor-ielts.onrender.com` — Node/Express,
  deployed as a **Docker web service** on Render (project "prof speak") via the
  root `/Dockerfile` (builds `server/` only, runs `node index.js` on
  `process.env.PORT`). Auto-deploys on every push to `main`. Health:
  `/api/health`.
- **Frontend UI (live):** `https://professor-ielts-1.onrender.com` — Render
  **Static Site** built from `client/` (`npm install && npm run build`, publish
  `dist`, env `VITE_API_BASE_URL=https://professor-ielts.onrender.com`).
- **APK:** built in CI via `.github/workflows/android.yml` (artifact
  `bandlogic-apk`). The Capacitor app loads the hosted UI via `server.url` in
  `client/capacitor.config.json`, so **UI changes go live by pushing** (static
  site auto-rebuilds); the APK only needs rebuilding for native changes.
- **Render free tier** sleeps when idle → first request after idle takes ~50s.

## 3. Architecture & stack
- **client/** — React 19 + Vite + Tailwind; Capacitor 6 Android wrapper. State in
  React Context (`src/context/AppContext.jsx`). **All user data is device-local
  in `localStorage`** (students roster + per-student history). API base resolves
  from `VITE_API_BASE_URL` (origin; `/api` appended) in `src/api/client.js`.
- **server/** — Node/Express, **OpenAI only** (`whisper-1` transcription +
  `gpt-4o-mini` grading + OpenAI TTS for Listening). Routes under `/api/*`, all
  behind a dependency-free `middleware/rateLimit.js`. CORS allow-list in
  `index.js` `APP_ORIGINS` includes `capacitor://localhost`, `https://localhost`,
  `http://localhost`, and `https://professor-ielts-1.onrender.com`. The
  **OPENAI_API_KEY lives only on the server** (Render env var) — never ship it to
  the client/APK.
- **pronunciation/** — Python FastAPI MFA+Wav2Vec2 service that is **DISABLED**
  (`ACOUSTIC_PRONUNCIATION_ENABLED = false` in `routes/evaluate.js`). Pronunciation
  is currently an *intelligibility estimate* from Whisper `avg_logprob`, not
  phoneme-level. Do not re-enable the Python scorer; if real pronunciation is
  wanted, integrate **Azure Pronunciation Assessment** or **Speechace**.

## 4. What already works (don't rebuild these)
- **Speaking:** `/api/transcribe`, `/api/evaluate` (Whisper verbatim + pause
  detection + disfluency analysis + FC/LR/GRA grading), `/api/generate-prompts`.
- **Writing:** `/api/evaluate-writing` (TR/CC/LR/GRA, Academic + General, Task 1 &
  2, word-count aware); client `components/writing/*`; preset tasks in
  `data/writingTasks.js`.
- **Reading:** `/api/reading/generate` + `/api/reading/evaluate` (deterministic
  marking; answer key hidden behind an opaque base64 token); client
  `components/reading/*`.
- **Listening:** `/api/listening/generate` + `/evaluate` (authentic 4-section
  format, multi-speaker OpenAI TTS, deterministic marker with digit↔word
  tolerance); client `components/listening/*`. Band math in `utils/bands.js`
  (`listeningBand()` from the Cambridge /40 table).
- **UX:** mobile-first, purple theme, collapsible drawer sidebar, device-local
  **student roster** + per-student history, section picker, printable report.
- **Rebrand:** `components/common/BrandLogo.jsx` (`<BrandLogo>` chip +
  `<BrandWordmark>`); logo at `client/public/bandlogic-logo.png`; all brand
  strings, `capacitor.config.json` (appId `com.bandlogic.app`), `render.yaml`
  (`bandlogic-api`), prompts ("You are BandLogic's AI examiner…") updated.

## 5. In-progress / known issues to finish first
1. **Listening timeout (HIGH):** generating a section's TTS can exceed the client's
   axios timeout. A fix was started — finish + verify: per-route longer timeout,
   coalesce consecutive same-speaker lines into one TTS call, raise TTS
   parallelism, and friendlier timeout copy in `ListeningSetup.jsx` /
   `ListeningRoom.jsx` (the `ListeningRoom.jsx` edit was interrupted mid-way —
   re-check it compiles).
2. **Debug-APK signing:** CI builds an unsigned debug APK with a throwaway key, so
   updates won't install over the old app without uninstalling (wipes local data).
   Generate **one stable keystore**, store it as CI secrets, and sign releases —
   needed for both painless updates and the Play Store.
3. **No accounts/DB yet** — required before monetization (see §6).
4. Tech-debt backlog is in `ARCHITECTURE-ISSUES.md` (13 items) and full review in
   `ARCHITECTURE-REVIEW.md`.

## 6. PRIORITY remaining work (what the owner most wants next)

### A. Google authentication + accounts (do this first)
- Use **Firebase Authentication** with **Google Sign-In + Phone OTP**. Firebase
  project already exists: **"bands logic"** (project id `bands-logic`), Spark/free
  plan; enable Google + Phone under Authentication → Sign-in method.
- Because the app loads the UI from a hosted **https** origin, Firebase **web**
  auth (redirect/popup + reCAPTCHA phone) works without native SHA-1/google-services
  setup — implement it as you would for a website.
- Client: add Firebase web SDK, a sign-in screen, store the ID token, send it as
  `Authorization: Bearer <idToken>` on every `/api` call.
- Server: add `firebase-admin`, a `verifyAuth` middleware that validates the ID
  token, attaches `req.uid`. Put the Firebase **service-account JSON** in a Render
  backend env var (e.g. `FIREBASE_SERVICE_ACCOUNT`) — never commit it.

### B. Usage metering + free/paid limits (server-side, in Firestore)
- Use **Firestore** (same Firebase project) for `users/{uid}` = `{ plan, freeUsed,
  lastFreeAt, premiumUntil }`. No separate database needed.
- Enforce **server-side** before any OpenAI call: **free tier = 3 evaluations on
  first sign-up, then 1 evaluation every 48h**, across all sections. Over limit →
  return a friendly "upgrade" response (HTTP 402/429-style) the UI shows as a
  paywall. Premium = unlimited.

### C. Payments (web checkout, NOT in-app Google billing)
- Use a **Merchant of Record** — **Lemon Squeezy or Paddle** — for web checkout
  (global cards + tax handled; works in Pakistan/India; avoids Google Play's
  15–30% cut). Reason: Google Play still effectively forces Play Billing for
  in-app digital goods in most regions, so sell on the web and unlock the account.
- Build: an upgrade/paywall screen → hosted checkout → **webhook** to the backend
  that sets `plan=premium` / `premiumUntil` in Firestore. Suggested pricing:
  ~$3–5/mo regional + an annual plan + a 7-day "exam sprint" pass.

### D. Grammarly-style voice chatbot (floating assistant)
- A floating chat icon, available app-wide, that: (1) auto-corrects grammar and
  rewrites sentences (gpt-4o-mini), and (2) supports **voice in/out** — record →
  **OpenAI Whisper** STT → GPT reply/correction → **OpenAI TTS** playback — i.e.
  talk back and forth. Add server routes (reuse the existing OpenAI service) and a
  client widget; keep all OpenAI calls server-side.

### E. Writing & Reading polish
- **Writing Task 1 (Academic)** currently uses *text-described* graphs. Add **real
  chart/graph images** — generate them server-side (QuickChart API or a chart lib)
  or curate a set — and render them in the task. Polish the right-hand evaluation
  panel (`components/writing/WritingEvaluationPanel.jsx`).
- **Reading:** polish and standardize question types/marking to official IELTS
  rules (Academic vs General passages, all standard task types, /40→band).

### F. Play Store readiness (last)
- Signed release **AAB** with the stable keystore from §5.2; hosted **privacy
  policy** (mic + accounts + payments), Data Safety form, content rating,
  **account-deletion** flow, store listing. A **new personal** Play account must
  run a **12-tester / 14-day closed test** before production ($25 one-time).

## 7. Hard rules / decisions already made (do not reverse without asking)
- **OpenAI only**; `OPENAI_API_KEY` and Firebase service account stay **server-side**.
- Keep the **hosted-UI** model (Capacitor `server.url` → static site) so UI updates
  ship by pushing.
- Auth = **Firebase (Google + Phone)**; Payments = **web MoR (Lemon Squeezy/
  Paddle)**, not Play Billing.
- Don't re-enable the Python pronunciation scorer; it's intentionally off.

## 8. Build / run / deploy
- Local: `cd server && npm install && npm start` (needs `OPENAI_API_KEY` in
  `server/.env`); `cd client && npm install && npm run dev`.
- Deploy backend: push to `main` → Render Docker service auto-deploys.
- Deploy UI: push to `main` → Render Static Site auto-rebuilds.
- APK: GitHub → Actions → "Build Android APK" → input backend origin
  `https://professor-ielts.onrender.com` (no `/api`).
- Secrets already set: `OPENAI_API_KEY` (Render backend). You must add
  `FIREBASE_SERVICE_ACCOUNT` (backend) and the Firebase **web config** (client) for
  auth, plus Lemon Squeezy/Paddle keys for payments.

## 9. Acceptance for this phase
A user can sign in (Google or phone), gets 3 free evaluations then 1/48h, sees a
paywall when over limit, can upgrade via web checkout and immediately get
unlimited use, and the grammar/voice assistant works. Keep every section
(Speaking/Writing/Reading/Listening) working throughout. Push in small, verified
increments.
