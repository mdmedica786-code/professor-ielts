# Full Test Mode — Code Review (Claude)

Reviewed: `SpeakingFullTest.jsx`, `WritingFullTest.jsx`, `ReadingFullTest.jsx`, `ListeningFullTest.jsx`, the four `*Room.jsx` wrappers, `SectionPicker.jsx`, and the `testMode` wiring in `AppContext.jsx`. Line refs are exact.

**Direct answers to your four questions first:**

1. **Timers** are cleaned up correctly (every `setInterval` has a `clearInterval` in the effect return). **MediaRecorder is not** — `SpeakingFullTest` leaves the mic stream open if you leave mid-recording (H2).
2. **Race conditions:** the sequential API calls themselves are ordered fine, but the **timer auto-submit retriggers in an infinite loop** if evaluation fails exactly at 00:00 (H1), and Speaking's blob handling relies on fragile closure timing (M2).
3. **Breaking test state by navigating away:** yes — leaving mid-test loses all progress *and* (Speaking) leaks the mic; there's no autosave or "are you sure?" guard (H2, M4).
4. **Optimizations/refactor:** parallelize the independent evaluations, use one interval instead of recreating it every second, store the recorder in a ref, and bill a full test as one unit (H3, M1, M3).

Good news up front: `testMode` **is** in the `AppContext` `useMemo` deps (line 224), so entering/exiting test mode works; submit buttons are guarded against manual double-clicks; and `ListeningPlayer` already revokes its object URLs on unmount.

---

## HIGH

### H1 — Infinite auto-resubmit loop when evaluation fails at time-up
**Files:** `WritingFullTest.jsx:33-41` + `:107`, `ReadingFullTest.jsx:30-38` + `:165`, `ListeningFullTest.jsx:22-30` + `:103`.

The timer effect is:
```js
} else if (phase === 'test' && timeLeft === 0) {
  submitTest();           // or handleSubmit()
}
```
…and every `submitTest` catch block does `setPhase('test')`. So at `timeLeft === 0`: time-up → `submitTest()` → error → `setPhase('test')` → effect re-runs (phase is `test`, time is still `0`) → `submitTest()` again → **loop**. Because `timeLeft` can't increase, this hammers `/api/evaluate*` as fast as it can round-trip — burning usage credits and money on every iteration. It triggers reliably when the timer expires with empty/short input (server 400) or any transient error.

**Fix — one interval + a one-shot auto-submit guard (also fixes M1):**
```js
const autoSubmitted = useRef(false);

// tick: single interval, only recreated when phase changes
useEffect(() => {
  if (phase !== 'test') return;
  const id = setInterval(() => {
    setTimeLeft(t => (t <= 1 ? 0 : t - 1));
  }, 1000);
  return () => clearInterval(id);
}, [phase]);

// auto-submit exactly once at 00:00
useEffect(() => {
  if (phase === 'test' && timeLeft === 0 && !autoSubmitted.current) {
    autoSubmitted.current = true;
    submitTest();
  }
}, [phase, timeLeft]);
```
On a failed time-up submit, the user lands back on `test` with the error shown and can press Submit manually (that path isn't ref-gated), but the loop is gone.

### H2 — Mic/MediaRecorder not stopped on unmount (Speaking)
**File:** `SpeakingFullTest.jsx:65-100`. `stopRecording` stops the tracks, but there is **no unmount cleanup**. If the user taps "Exit Test Mode", switches section, or navigates to History while recording, the component unmounts with the `MediaRecorder` still live — the **mic stays on** (recording indicator stays lit) until the page is closed. Classic resource leak, and a privacy red flag.

**Fix — store the recorder in a ref and stop it on unmount:**
```js
const recorderRef = useRef(null);
// in startRecording: recorderRef.current = mr;  (and drop the useState for mediaRecorder)
useEffect(() => () => {
  const mr = recorderRef.current;
  if (mr && mr.state !== 'inactive') mr.stop();
  mr?.stream?.getTracks().forEach(t => t.stop());
}, []);
```

### H3 — A full test silently multiplies usage and can 402 mid-test
**Files:** the `evaluateAll`/`submitTest` loops + server metering.
Each sub-call goes through `checkUsage`, so one full test costs the user **multiple credits**: Speaking = **3** `/api/evaluate` calls, Writing = **2**, Reading = **3 generate + 3 evaluate**, Listening = **1 (heavy) generate + 1 evaluate**. A free user has 3 credits — so a single full Speaking or Reading test **exhausts or exceeds the quota**, and worse, the limit can hit *between parts*: the user records all of Part 1/2/3 (or writes for 40 minutes), then evaluation 402s halfway and the effort is lost. (Also note `/api/reading` runs `checkUsage` at the mount **and** again inside `routes/reading.js` on `/evaluate` — looks double-metered; worth confirming.)

**Fix (product decision):** treat a full test as **one billable unit** — e.g. check quota once before `phase = 'test'`, then have the sub-calls skip `checkUsage` (a trusted internal flag/header), or gate Full Test Mode to Pro, or give full tests their own daily allowance. At minimum, **pre-flight the quota** before letting the user start so they never lose a 40-minute effort to a mid-test paywall.

---

## MEDIUM

### M1 — Timers recreate their interval every second
All four timer effects list `timeLeft` in their deps (`[phase, timeLeft]` / `[isRecording, prepTimeLeft]`), so the interval is torn down and rebuilt on every tick. It works but it's wasteful and fragile. The H1 fix above (deps `[phase]`, functional updates) resolves it; apply the same shape to Speaking's `recordingTime`/`prepTimeLeft` timers.

### M2 — Speaking relies on closure timing to collect the three blobs
**File:** `SpeakingFullTest.jsx:75-84, 102-134`. Part 3's blob is passed to `evaluateAll(blob)` directly (good), but Part 1/2 are read from `recordings` state inside a closure created in `startRecording`. It happens to work because Part 3's recorder is created after the earlier `setRecordings` have flushed — but it's load-bearing timing. **Refactor:** accumulate blobs in a ref (`blobsRef.current = { part1, part2, part3 }`) and pass that object into `evaluateAll`, so it never depends on render/closure ordering.

### M3 — Parallelize the independent evaluations
Speaking does `await res1; await res2; await res3` and Writing does `await res1; await res2`. These are independent and can run with `Promise.all` to cut the wait roughly 2–3×:
```js
const [res1, res2, res3] = await Promise.all([
  evaluateSpeaking({ audioFile: f1, questionText: p1Text, questionPart: 1, studentName }),
  evaluateSpeaking({ audioFile: f2, questionText: p2Text, questionPart: 2, studentName }),
  evaluateSpeaking({ audioFile: f3, questionText: p3Text, questionPart: 3, studentName }),
]);
```
(Reading's *generation* is intentionally sequential for the progress UI — fine — but its three `evaluateReading` calls can parallelize.) Watch provider rate limits; 2–3 concurrent is safe.

### M4 — No autosave or navigation guard for a 40–60 minute test
Navigating away, a sidebar click, or a refresh wipes all answers/essays — including a test that cost an AI generation to create. Add (a) a `beforeunload` confirm while `phase === 'test'`, and (b) lightweight autosave of `essay1/essay2` / `answers` to `localStorage`, restored on mount. This is the difference between a forgivable misclick and a lost hour.

### M5 — `testMode` is global; reset it defensively
`testMode` lives in context and is only set by `SectionPicker.pick()` and the Exit buttons. I didn't find a concrete broken path (SectionPicker always sets it), but to be safe against future navigation entry points, reset `testMode` to `'practice'` inside `setSection`/on leaving a section so a stale `'full'` can never carry into another module.

---

## LOW / polish

- **L1** `SpeakingFullTest` keeps `mediaRecorder` in `useState` — prefer a ref (avoids re-renders and the stale-closure surface). Folded into the H2 fix.
- **L2** Listening "no pausing" isn't enforced — `ListeningPlayer` still shows a working pause button. If strict mode matters, pass a `strict`/`disablePause` prop.
- **L3** Listening's 40-minute timer starts when the test mounts, not when the audio starts — a user who reads instructions first loses clock time. Consider starting the timer on first play.
- **L4** `new File([recordings.part1], …)` (Speaking `:109/119`) throws if a blob is missing. Add a guard that all three parts recorded before `evaluateAll`.
- **L5** Reading re-implements the band table client-side (`:108-136`) although the server already has `utils/bands.js`. Two copies will drift — return/centralize one.
- **L6** The combined reports replace real per-part feedback with placeholders ("Combined fluency", empty `weak`/`note`). The full-test report is therefore *less* useful than a single practice eval. Consider merging the actual `good`/`weak`/`mistakes` from each part instead of discarding them.

---

## What's already solid
- Every timer has a cleanup return (no interval leaks).
- `testMode` is correctly in the `useMemo` deps — enter/exit works.
- Manual double-submit is guarded (`evaluating`/`submitting`/`phase` checks) on Reading & Listening.
- `ListeningPlayer` revokes its blob URLs on unmount.
- Reading generation shows staged progress ("Passage 2 of 3"), good for a 1–2 min wait.

## Suggested fix order
1. **H1** (stops a real money-burning loop) and **H2** (mic leak) — small, contained.
2. **H3** — decide the billing model for full tests before this ships widely.
3. **M4** (autosave/guard) and **M2** (blob ref) — protect the user's effort and de-risk Speaking.
4. Sweep M1/M3/L-items.

Want me to apply H1 + H2 across the four files? They're surgical and I can do them in one pass.
