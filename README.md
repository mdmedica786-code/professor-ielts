# Professor IELTS AI Coach

AI-Powered IELTS Speaking Calibration & Diagnostic Engine.

Upload or record an IELTS Speaking response → get phoneme-level pronunciation scoring, grammar/vocabulary/fluency evaluation, and a comprehensive IELTS band diagnostic with actionable feedback.

## Architecture

| Service | Port | Technology |
|---------|------|------------|
| Frontend | 5173 | React 18 + Vite + Tailwind CSS |
| Backend | 3001 | Node.js + Express |
| Pronunciation | 8000 | Python FastAPI + MFA + Wav2Vec2 |

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your API key:
# - OPENAI_API_KEY (REQUIRED — powers transcription, disfluency analysis,
#   FC/LR/GRA grading, and question generation)
#
# Note: GROQ_API_KEY / GEMINI_API_KEY are optional/legacy. The alternate
# groqService.js and geminiService.js implementations are not wired into the
# routes; the live pipeline uses OpenAI only.
```

### 2. Start Backend (Node.js)

```bash
cd server
npm install
node index.js
```

### 3. Start Frontend (React)

```bash
cd client
npm install
npm run dev
```

### 4. (Optional) Start Pronunciation Pipeline

Requires Linux/WSL with conda:

```bash
cd pronunciation
bash setup.sh
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 5. Docker (all services)

```bash
docker-compose up --build
```

The app is ready at **http://localhost:5173**.

## Features

- **Audio Recording** — Record directly in-browser with waveform visualization
- **Audio Upload** — Drag-and-drop WAV/MP3/M4A/WebM files
- **OpenAI Whisper Transcription** — Verbatim speech-to-text with word timestamps
- **Phoneme-Level Pronunciation Scoring** — MFA + Wav2Vec2 GOP pipeline (optional; disabled by default — see `ACOUSTIC_PRONUNCIATION_ENABLED` in `server/routes/evaluate.js`)
- **IELTS Band Evaluation** — OpenAI gpt-4o-mini FC/LR/GRA scoring
- **6-Tab Dashboard** — Report Card, Criteria, Mistakes, Action Plan, Transcript, Pronunciation Heatmap
- **History & Progress** — localStorage-persisted evaluation history with trend charts
- **Print Certificate** — Clean printable report card

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/transcribe` | Audio → OpenAI Whisper transcription |
| POST | `/api/evaluate` | Full pipeline evaluation |
| POST | `/api/pronunciation` | Proxy to Python pronunciation scorer |
| POST | `/api/generate-prompts` | AI-generated IELTS questions |
