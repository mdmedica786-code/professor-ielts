# Architecture Backlog → GitHub Issues

Ready-to-file issue set derived from `ARCHITECTURE-REVIEW.md`. Each entry below
becomes **one GitHub issue** (title, labels, body). The four P0 fixes already
applied in code (validation-middleware order, NaN-band guard, provider doc/key
drift, rate limiting) are intentionally **not** re-filed here.

Suggested labels to create first: `P0` `P1` `P2` · `security` `backend`
`frontend` `devops` `qa` `scoring` `design` `a11y` `observability` `data`.

---

## P0

### 1. Rotate exposed API keys and consolidate to a single `.env`
**Labels:** P0, security
Live `OPENAI_API_KEY` / `GEMINI_API_KEY` values sit in plaintext in **two**
`.env` files (`/.env` and `/server/.env`) with *divergent* Gemini values. They
are git-ignored (not committed), but they're unencrypted on disk with no single
source of truth.
**Fix:** rotate the keys now; keep exactly one local `.env`; in production set
the key only as a Render dashboard env var (already wired via `render.yaml`,
`sync:false`). Ref: review §4.6-B.

---

## P1

### 2. Decide the pronunciation-scoring story (intelligibility proxy in the band)
**Labels:** P1, scoring
With the acoustic engine disabled, `estimatePronunciation()` maps Whisper
`avg_logprob` to a band and folds it into the overall IELTS score when audio is
present. `avg_logprob` reflects ASR confidence (mic quality, noise, accent), not
pronunciation — a validity problem for a scoring product.
**Fix:** either exclude the proxy from the overall band and label it clearly as
an "intelligibility estimate", or integrate a real pronunciation API
(Azure/Speechace) and re-enable the criterion; calibrate against human-rated
samples. Ref: review §4.9-A.

### 3. Make evaluation asynchronous with staged progress
**Labels:** P1, backend, ux
`/api/evaluate` runs transcription + disfluency + grading in one request (up to
~3 min), tying up a worker and showing a long spinner.
**Fix:** return a job id, process in a worker/queue, poll or stream stages
(`Transcribing → Analyzing → Grading`). Ref: review §4.1-A.

### 4. Add a datastore + (anonymous) accounts; stop silent history loss
**Labels:** P1, backend, data
History lives only in `localStorage`; `useLocalStorage` swallows quota errors so
saves can fail silently, and there's no cross-device history or analytics.
**Fix:** add Postgres/SQLite, persist evaluations server-side behind an
anonymous id, keep localStorage as a cache; surface a toast on save failure.
Ref: review §4.1-C, §4.3-B.

### 5. Ship a production client image (build + static server), not the Vite dev server
**Labels:** P1, devops
`client/Dockerfile` runs `npm run dev` (HMR, unminified) as "production".
**Fix:** multi-stage build → `vite build` → serve `dist/` via nginx. (Less
relevant now that mobile is the primary target via Capacitor, but matters for any
web deploy.) Ref: review §4.7-A.

### 6. Add a React error boundary
**Labels:** P1, frontend
A render-time throw (e.g. a malformed history record) blanks the whole screen.
**Fix:** wrap the app in an error boundary with a reset action; guard against
shape drift when reading persisted records. Ref: review §4.3-A.

### 7. Add authentication + security headers on the API
**Labels:** P1, security
Endpoints are unauthenticated (rate limiting added, but no identity); no
`helmet`; the Python service uses `allow_origins=["*"]`.
**Fix:** add lightweight auth (even signed anonymous ids), `helmet` on Express,
and lock FastAPI CORS. Ref: review §4.6-A/C.

### 8. Add an automated test suite + CI
**Labels:** P1, qa
No tests exist; the fragile bits (score parsing, band rounding, pause detection,
middleware order, rate limiter) are unguarded.
**Fix:** Vitest + Supertest on the server (mock the LLM), Vitest + Testing
Library on the client; CI running lint + tests + `node --check`. Ref: review §4.8.

---

## P2

### 9. Remove dead provider code and the stale Dockerfile; add a provider interface
**Labels:** P2, cleanup
`services/groqService.js` and `services/geminiService.js` are unused (and
`groqService` has a guessed model name); `Dockerfile.pronunciation.fixed` is a
stale duplicate.
**Fix:** delete the dead files, or formalize a `LLM_PROVIDER` factory if
multi-provider is a real goal; delete the `.fixed` Dockerfile. Ref: review
§4.2-C, §4.7-B.

### 10. Design-system tokens + accessibility pass
**Labels:** P2, design, a11y
Styling is repeated utility strings with no tokens; score state is color-only
(fails WCAG 1.4.1); the evaluation tab bar lacks `tablist`/`tab` semantics.
**Fix:** extract semantic tokens into `tailwind.config.js`; pair color with
text/icon for scores; add ARIA tab roles + keyboard nav. Ref: review §4.5-A/B/C.

### 11. Structured logging + error reporting
**Labels:** P2, observability
Only `console.log`; no request ids, metrics, or error reporter — hard to debug a
bad grade in production.
**Fix:** add `pino`/`morgan` with request ids and a Sentry-style reporter.
Ref: review §4.1-D.

### 12. Validate request inputs + cap transcript length
**Labels:** P2, backend, security
Route bodies are read directly; `parseInt(questionPart)` can be `NaN`;
`transcript` length is unbounded (cost/DoS).
**Fix:** validate with `zod`/`joi`, coerce `questionPart` to 1–3, cap transcript
size. Ref: review §4.2-D.

### 13. Stop leaking internal error messages to the client
**Labels:** P2, security
`errorHandler` returns `detail: err.message` to the client (exposes provider
internals); the health endpoint advertises which keys are configured.
**Fix:** return generic client messages, keep details server-side only.
Ref: review §4.2-E, §4.6-D.
