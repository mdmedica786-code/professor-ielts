# Continue: Goethe Exam Enhancement — Phase 1 (Server)

You've completed the groundwork:
- ✅ `server/config/goetheExamFormat.js` — Canonical exam format spec (825 lines, all levels)
- ✅ `server/routes/goethe.js` — AES-256-GCM token encryption, level-aware score calculator
- ✅ `client/src/data/goethe/goetheGradingRules.js` — Updated client grading rules
- ✅ Client components updated (ExamSelector, Navbar, Sidebar, AppContext for multi-level)

Continue with the remaining work. Here's the prioritized plan:

---

## PHASE 1: Server Prompts & Services (DO THIS FIRST)

### 1A. Rewrite Generator Prompts to Use the Format File

`server/prompts/goetheGeneratorPrompts.js` currently has hardcoded format descriptions. Rewrite ALL generator prompts (reading, listening, writing, speaking) so they **read from the FORMAT config** for the requested level/Teil. This means:

- The reading generator prompt should receive the exact `textSpec`, `qType`, `count`, and `instruction` from `getReceptivePart(level, 'lesen', teil)` and embed them into the system prompt.
- The listening generator prompt should receive `scriptSpec`, `segmentCount`, `qType`, `count`, `maxPlays`, and `instruction` from `getReceptivePart(level, 'hoeren', teil)`.
- The writing generator prompt should receive `type`, `register`, `words`, `leitpunkte`, `instruction` from `getWritingAufgabe(level, nr)`.
- The speaking partner prompt should receive `type`, `mode`, `instruction` from `getSpeakingTeil(level, teil)`.

This ensures **every generated exam Teil matches the exact official format** for that level.

### 1B. Server-Side TTS for Listening

The listening module currently sends utterance text to the client, which uses browser SpeechSynthesis (awful quality). Fix this:

1. In `goetheGeneratorService.js` `generateGoetheListening()`:
   - After generating the script JSON, call OpenAI TTS (`tts-1-hd`) for each utterance
   - Use distinct voices per speaker: `nova` (female), `onyx` (male), `alloy` (narrator/moderator), `echo` (secondary male)
   - Concatenate/return audio as base64-encoded mp3 segments (or a single merged mp3)
   - **Add the official instruction audio** before the content: "Sie hören jetzt [Teil X]. Sie hören den Text [einmal/zweimal]."
   - Add natural pauses (~1.5s) between utterances
   - Return the audio alongside the questions in the API response

2. In the route handler, return `audioData` (base64 mp3) alongside the existing fields.

3. The client will play this server-generated audio instead of browser TTS.

### 1C. Level-Specific Examiner Rubrics

`server/prompts/goetheExaminer.js` only has B1 rubrics. Create examiner prompts for **A2, B2, and C1**:

**Writing Examiner per level:**
- **A2**: 2 Aufgaben. Criteria: Erfüllung, Kommunikation, Korrektheit. Max points from the FORMAT config.
- **B1**: Already done (3 Aufgaben, 4 criteria, 40+40+20=100).
- **B2**: 2 Aufgaben. 4 criteria (Erfüllung, Kohärenz, Wortschatz, Strukturen). Each criterion from FORMAT.
- **C1**: 2 Aufgaben. 4 criteria. Aufgabe 1 is an essay (250 words), Aufgabe 2 is a formal letter (150 words). Points from FORMAT.

**Speaking Examiner per level:**
- **A2**: 3 Teile. Criteria and max points from `FORMAT.A2.sprechen.teile[*].criteria` + `ausspracheMax`.
- **B1**: Already done.
- **B2**: 2 Teile. Criteria from FORMAT.
- **C1**: 2 Teile (Vortrag + Diskussion). Criteria from FORMAT.

For each, the rubric should:
- Use the BAND system (A/B/C/D/E) with the `bandToPoints()` helper
- Include Knock-out rule (Erfüllung = E → entire Aufgabe = 0)
- Output the same JSON format as the existing B1 rubric but with level-appropriate criteria/points

**Implementation approach:** Create a function `buildWritingExaminerPrompt(level, aufgabeNr)` and `buildSpeakingExaminerPrompt(level, teil)` that dynamically construct the rubric prompt from the FORMAT config. This replaces the single hardcoded prompt.

### 1D. Validate LLM JSON Responses

In `goetheGeneratorService.js`, add a retry wrapper:
```javascript
async function callWithRetry(fn, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      // Validate the parsed JSON has required fields
      return result;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`LLM response invalid, retrying (${attempt + 1}/${maxRetries})...`);
    }
  }
}
```

### 1E. German Error Messages

Replace any remaining English error messages in `server/routes/goethe.js` with German equivalents.

---

## PHASE 2: Client UI Rebuilds (AFTER PHASE 1)

### 2A. Shared Exam Components

Create reusable components in `client/src/components/goethe/shared/`:
- `ExamInstructionScreen.jsx` — Shows module name, time, rules, "Prüfung starten" button
- `ExamTimer.jsx` — Countdown timer with warning at 5 min remaining
- `TeilTabs.jsx` — Navigate between Teile within a module
- `ProgressBar.jsx` — Questions answered / total questions
- `QuestionRenderer.jsx` — Renders the right input type based on `qType`: MCQ radio, R/F chips, Ja/Nein, Zuordnung matching, Lückentext gaps, "Wer sagt was?" table, Kurzantwort text input

### 2B. Rebuild GoetheLesenRoom.jsx

- Fetch the FORMAT for the selected level to know how many Teile exist
- Show Teil tabs (e.g., B1 = 5 tabs, A2 = 4 tabs, C1 = 3 tabs)
- Each Teil generates its passage + questions on demand
- Use QuestionRenderer for the correct question type per Teil
- For Zuordnung (matching): situations on left, Anzeigen cards on right, drag-and-drop or dropdown
- For Lückentext (C1): render text with numbered `____` gaps and a word/sentence bank

### 2C. Rebuild GoetheHoerenRoom.jsx

- Play server-generated TTS audio (not browser SpeechSynthesis)
- Enforce `maxPlays` per Teil (disable play button after max reached)
- Show "Pause — Sie haben 30 Sekunden Zeit" between first and second listen
- For "Wer sagt was?" (B1 Teil 4): render a matrix table
- For Kurzantwort (C1 Teil 2): render text input fields
- Audio player with waveform visualization

### 2D. Rebuild GoetheSchreibenRoom.jsx

- Show Aufgabe tabs (A2: 2, B1: 3, B2: 2, C1: 2)
- Live word counter with color coding
- Redemittel sidebar (collapsible)
- For C1 Aufgabe 1: display a generated Grafik/chart description
- Evaluation shows: band letters, examiner commentary, inline errors, model answer

### 2E. Rebuild GoetheSprechenRoom.jsx

- Push-to-talk dialogue with speech indicator (pulsing circle when AI speaks)
- Chat bubble layout for conversation transcript
- "Partner startet" button so AI opens first
- B1 Teil 2: 5-slide visual structure with "Nächste Folie" navigation
- B2/C1 Teil 1: topic card with countdown timer
- Full evaluation display at end

---

## PHASE 3: Polish & Full Exam Mode (AFTER PHASE 2)

### 3A. Full Mock Exam Mode
- Sequential: Lesen → Hören → (Pause) → Schreiben → Sprechen
- Timers for each module
- Final Ergebnisbericht with all 4 module scores, pass/fail, Prädikate

### 3B. Topic Sets for A2, B2, C1
- A2: 10-12 concrete everyday topics with A2-level vocabulary
- B2: 12-15 societal/professional topics with advanced vocabulary
- C1: 10-12 academic/complex topics with near-native vocabulary

### 3C. WebRTC Live Voice Client
- Connect to the `/goethe/realtime-token` endpoint
- Full duplex audio conversation
- Live transcript display
- Record for final evaluation

---

## CONSTRAINTS (same as before)
- Do NOT rewrite files from scratch; enhance what exists
- Use `gpt-4o-mini` for generation, `gpt-4o` for evaluation
- Use `tts-1-hd` for German audio
- All German text must be grammatically perfect
- Read from `goetheExamFormat.js` FORMAT config — never hardcode format details in prompts

Start with Phase 1. Do 1A first (rewrite prompts to use FORMAT), then 1B (TTS), then 1C (rubrics).
