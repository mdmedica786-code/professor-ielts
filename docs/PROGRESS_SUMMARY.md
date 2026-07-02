# BandLogic IELTS App — Progress Summary for Architecture Review

*Prepared 2 July 2026. Covers the IELTS library integration work stream plus the state of the evaluation/speech subsystems it touches.*

## 1. Finalized architecture, stack, and workflow decisions

**Tech stack.** React + Vite + Capacitor client (web and Android from one codebase); Node/Express (CommonJS) backend that holds all API keys; Firebase Auth + Firestore; Supabase Postgres; Cloudinary as the media CDN; OpenAI + Azure Speech on the server side.

**Dual-database split.** Firebase owns *who the user is and what they did* (auth, sessions, per-user progress, real-time state). Supabase owns *what the content is* (decks, cue cards, follow-up questions, listening tests). No user IDs live in Supabase, so there is nothing to synchronize between the two systems. Content tables have RLS with read-only policies on published rows; all writes go through the service-role key on the server.

**Global deck model (current product decision).** One published deck — Makkar Cue Cards May–Aug 2023 — is served to every signed-in student. `GET /api/library/deck` (Express, behind the existing Firebase `verifyAuth` middleware, deliberately *not* behind `checkUsage`) serves it with an in-memory 1-hour cache and ETag. Source of truth is Supabase when seeded and published; until then the route transparently falls back to `server/scripts/makkar_parsed.json` on disk. Rationale: content fixes must not require Capacitor app-store releases (rules out bundling JSON in the client), and Firestore's 1 MiB document cap plus bandwidth billing rules out a single public document.

**Content ingestion pipeline (shipped and verified).**
`PDF → pdf-parse raw text → parseMakkar.js (deterministic state machine) → optional --llm repair pass (gpt-4o-mini, flagged cards only) → seedSupabase.js → Postgres`.
Extraction results from the real 326-page source: **86 cue cards, ~600 Part-3 Q&As, 14 cards flagged for review**. The parser handles three format shifts found in the book: tab-separated TOC rows, three Part-3 header variants, and the mid-book switch from dashed prompts to bare "You should say:" lines.

**Listening tests (in progress).** 80 tests; audio is transcoded to 96 kbps mono MP3 with the `ffmpeg-static` binary already in deps, uploaded to the existing Cloudinary account (`uploadListeningAudio.js`, chunked `upload_large`, `resource_type: "video"`), with `audio_url` persisted to `listening_tests` in Supabase. Playback is a plain HTML5 `<audio>` element against the CDN (range requests → seeking works). Known cost watch-point: a full test streams ~20 MB; if bandwidth outgrows the Cloudinary tier, migrate files to Cloudflare R2 (zero egress) and update one URL column.

**Frontend integration (shipped).** A "Library" tab in `QuestionBank.jsx` (default mode) renders `MakkarLibrary.jsx`: searchable list → card detail with Part-2 prompts, collapsed model answers, and per-question Part-3 practice. Selecting anything emits the app-wide `selectedQuestion` shape `{id, part, topic, text}`, so `RecorderPanel`, `LiveTutor`, and the evaluation pipeline required **zero changes**.

## 2. Whisper & Azure Speech integration (evaluation engine)

The hybrid scoring engine is implemented in `server/routes/evaluate.js` + `server/services/pronunciationService.js`: the LLM grades what it can *read*, Azure grades what it can *hear*, and the results are merged.

**Pipeline (`POST /api/evaluate`), as documented in the route:**
1. Audio → OpenAI **Whisper** verbatim transcription (keeps fillers/disfluencies)
2. Word timestamps → pause detection (gaps ≥ 0.6 s)
3. Verbatim transcript → gpt-4o-mini disfluency analysis (fillers, repetitions, false starts)
4. Audio + transcript → **Azure** pronunciation scoring (non-fatal step — evaluation succeeds without it)
5. Transcript → LLM evaluation of Fluency & Coherence / Lexical Resource / Grammatical Range & Accuracy
6. Merge → overall IELTS band + fluency diagnostics

Operational details: every AI step is wrapped in a 30 s `withTimeout` race so one hung call can't stall the pipeline; the grader model is tiered by plan (`evalModel(isPremium)` in `utils/models.js`) so free users hit the cheaper model.

**Azure specifics (`pronunciationService.js`).** Uses `microsoft-cognitiveservices-speech-sdk` directly in Node (replaced an older Python proxy). Any client codec (WebM/MP4/Ogg) is converted to Azure's native format before assessment:

```js
// ffmpeg-static → 16 kHz, mono, 16-bit PCM WAV, streamed via stdin/stdout
spawn(ffmpegPath, ['-i','pipe:0','-f','wav','-ar','16000','-ac','1','-c:a','pcm_s16le','pipe:1'])
```

Env: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (default `eastus`); free tier is 5 h/month of STT. Feature-flagged via `ACOUSTIC_PRONUNCIATION_ENABLED = true`.

**Live tutor (OpenAI Realtime, migrated today — see §3).** Server mints an ephemeral key at `POST /api/realtime/token`; the session instructions carry the examiner persona, immediate-error-correction policy, the internal band descriptors (`SPEAKING_BAND_DESCRIPTORS`), and — new — the student's selected question, so the tutor examines the exact cue card chosen in the app.

## 3. Task in progress immediately before this summary

**Bug: "Live call not working perfectly" — root-caused and fixed, pending device testing.** The live call failed to connect on both web and Android because the integration was pinned to the retired beta Realtime API. Migration to the GA API (per current OpenAI docs):

| | Old (broken) | New (GA) |
|---|---|---|
| Token endpoint | `POST /v1/realtime/sessions` | `POST /v1/realtime/client_secrets` |
| Model | `gpt-4o-realtime-preview-2024-12-17` | `gpt-realtime-2` (env-overridable) |
| Key in response | `client_secret.value` | top-level `value` (`ek_…`) |
| SDP endpoint | `/v1/realtime?model=…` | `/v1/realtime/calls` |

Four client-side bugs fixed in `LiveTutor.jsx` in the same pass: (1) the selected question was only sent as a topic string in a fake first user message — now baked into session instructions server-side; (2) the "AI speaking" indicator listened for `response.audio.delta`, a WebSocket-only event — now uses WebRTC's `output_audio_buffer.started/stopped`; (3) connection errors were invisible because the cleanup path overwrote the `error` status with `disconnected`; (4) dropped calls showed "connected" forever — added a `connectionstatechange` handler. Also added: `OpenAI-Safety-Identifier` (hashed Firebase UID) on token minting.

Remaining verification: live end-to-end test on web + APK; TURN server still recommended before scale (STUN-only fails on symmetric NATs, common on mobile carriers).

*Reference: [OpenAI Realtime API with WebRTC guide](https://developers.openai.com/api/docs/guides/realtime-webrtc).*
