/**
 * srs.js — Spaced-Repetition engine for the BandLogic Vocabulary mini-app.
 *
 * Ports the two algorithms Anki uses:
 *   • FSRS  (Free Spaced Repetition Scheduler, v4.5) — the modern default.
 *           Models each card with Stability (S) + Difficulty (D) and schedules
 *           to a target retention (default 90%).
 *   • SM-2  (SuperMemo-2 / classic Anki) — ease-factor based.
 *
 * Both expose the same 4-button grading used by Anki:
 *   1 = Again   2 = Hard   3 = Good   4 = Easy
 *
 * The engine is deterministic and runs entirely on the client; the server only
 * stores the resulting card state (Firestore). `schedule()` returns the updated
 * scheduling fields, and `previewIntervals()` powers the under-button labels.
 *
 * A "card" carries an algorithm-agnostic scheduling superset:
 *   state       : 'new' | 'learning' | 'review' | 'relearning'
 *   due         : ISO string  (when the card is next due)
 *   last_review : ISO string | null
 *   reps, lapses, step (learning-step index)
 *   stability, difficulty   (FSRS)
 *   ease, interval          (SM-2 / shared display interval in days)
 */

export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };
export const RATING_LABELS = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

// ─── FSRS-4.5 constants ──────────────────────────────────────────────
// Power forgetting curve: R(t,S) = (1 + FACTOR * t/S) ^ DECAY
const DECAY = -0.5;
const FACTOR = 19 / 81; // = 0.9^(1/DECAY) - 1, so R(S,S) === 0.9

// Default optimized weights (FSRS-4.5). Users can re-optimize, but these are
// the community defaults shipped with Anki.
export const FSRS_DEFAULT_W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
  1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407,
  2.9466, 0.5034, 0.6567,
];

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const MIN_STABILITY = 0.01;

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

export const DEFAULT_SETTINGS = {
  algorithm: 'fsrs', // 'fsrs' | 'sm2'
  requestRetention: 0.9, // FSRS target retention
  maximumInterval: 365 * 10, // cap (days)
  w: FSRS_DEFAULT_W,
  // Learning / relearning steps in minutes (used by both algorithms for
  // sub-day scheduling, Anki-style).
  learningSteps: [1, 10],
  relearningSteps: [10],
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ─── FSRS core maths ─────────────────────────────────────────────────

/** Retrievability of a card with stability S after t days. */
export function forgettingCurve(t, S) {
  return Math.pow(1 + FACTOR * (t / S), DECAY);
}

/** Interval (days) that brings retrievability down to `retention`. */
function fsrsInterval(S, retention, maxInterval) {
  const days = (S / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1);
  return clamp(Math.round(days), 1, maxInterval);
}

function initStability(w, grade) {
  return Math.max(w[grade - 1], MIN_STABILITY);
}

function initDifficulty(w, grade) {
  return clamp(w[4] - Math.exp(w[5] * (grade - 1)) + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function nextDifficulty(w, D, grade) {
  const next = D - w[6] * (grade - 3);
  // Mean-reversion toward the Again-difficulty anchor (w[4]).
  const reverted = w[7] * w[4] + (1 - w[7]) * next;
  return clamp(reverted, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function nextStabilityRecall(w, D, S, R, grade) {
  const hardPenalty = grade === RATING.HARD ? w[15] : 1;
  const easyBonus = grade === RATING.EASY ? w[16] : 1;
  const inc =
    Math.exp(w[8]) *
    (11 - D) *
    Math.pow(S, -w[9]) *
    (Math.exp(w[10] * (1 - R)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(S * (1 + inc), MIN_STABILITY);
}

function nextStabilityForget(w, D, S, R) {
  const sMin = Math.max(
    w[11] *
      Math.pow(D, -w[12]) *
      (Math.pow(S + 1, w[13]) - 1) *
      Math.exp(w[14] * (1 - R)),
    MIN_STABILITY
  );
  return sMin;
}

// ─── FSRS scheduler ──────────────────────────────────────────────────

function scheduleFsrs(card, grade, settings, now) {
  const w = settings.w || FSRS_DEFAULT_W;
  const retention = settings.requestRetention ?? 0.9;
  const maxInt = settings.maximumInterval ?? 36500;

  const out = {
    reps: (card.reps || 0) + 1,
    lapses: card.lapses || 0,
    last_review: now.toISOString(),
  };

  const isNew = !card.state || card.state === 'new' || card.stability == null;

  let S, D;
  if (isNew) {
    // First exposure — seed S and D from the grade.
    S = initStability(w, grade);
    D = initDifficulty(w, grade);
  } else {
    const t = card.last_review
      ? Math.max(0, (now - new Date(card.last_review)) / DAY_MS)
      : 0;
    const R = forgettingCurve(t, card.stability);
    D = nextDifficulty(w, card.difficulty, grade);
    if (grade === RATING.AGAIN) {
      S = nextStabilityForget(w, card.difficulty, card.stability, R);
      out.lapses = (card.lapses || 0) + 1;
    } else {
      S = nextStabilityRecall(w, card.difficulty, card.stability, R, grade);
    }
  }

  out.stability = S;
  out.difficulty = D;

  // Map the interval into Anki-style states. Sub-day intervals become learning
  // / relearning steps shown in minutes; >=1 day graduates to review.
  const intervalDays = fsrsInterval(S, retention, maxInt);

  if (grade === RATING.AGAIN) {
    const stepMin = (settings.relearningSteps || [10])[0] || 10;
    out.state = 'relearning';
    out.step = 0;
    out.interval = 0;
    out.due = new Date(now.getTime() + stepMin * MIN_MS).toISOString();
  } else if (intervalDays < 1) {
    const steps = settings.learningSteps || [10];
    const stepMin = steps[steps.length - 1] || 10;
    out.state = 'learning';
    out.step = 0;
    out.interval = 0;
    out.due = new Date(now.getTime() + stepMin * MIN_MS).toISOString();
  } else {
    out.state = 'review';
    out.step = 0;
    out.interval = intervalDays;
    out.due = new Date(now.getTime() + intervalDays * DAY_MS).toISOString();
  }

  return out;
}

// ─── SM-2 scheduler (classic Anki variant) ───────────────────────────

const SM2_DEFAULTS = {
  startEase: 2.5,
  minEase: 1.3,
  easyBonus: 1.3,
  hardFactor: 1.2,
  graduatingInterval: 1, // days (Good on a new card)
  easyInterval: 4, // days (Easy on a new card)
  lapseFactor: 0, // new interval after a lapse = old * lapseFactor
};

function scheduleSm2(card, grade, settings, now) {
  const cfg = { ...SM2_DEFAULTS, ...(settings.sm2 || {}) };
  const maxInt = settings.maximumInterval ?? 36500;

  const out = {
    reps: (card.reps || 0) + 1,
    lapses: card.lapses || 0,
    last_review: now.toISOString(),
    ease: card.ease || cfg.startEase,
    stability: card.stability ?? null,
    difficulty: card.difficulty ?? null,
  };

  const isNew = !card.state || card.state === 'new';
  const prevInterval = card.interval || 0;

  if (isNew || card.state === 'learning') {
    // Learning phase.
    if (grade === RATING.AGAIN) {
      out.state = 'learning';
      out.interval = 0;
      out.due = new Date(now.getTime() + (settings.learningSteps?.[0] || 1) * MIN_MS).toISOString();
      return out;
    }
    if (grade === RATING.HARD) {
      out.state = 'learning';
      out.interval = 0;
      out.due = new Date(now.getTime() + (settings.learningSteps?.[settings.learningSteps.length - 1] || 10) * MIN_MS).toISOString();
      return out;
    }
    // Good → graduate; Easy → graduate with easy interval.
    const interval = grade === RATING.EASY ? cfg.easyInterval : cfg.graduatingInterval;
    out.state = 'review';
    out.interval = clamp(interval, 1, maxInt);
    out.due = new Date(now.getTime() + out.interval * DAY_MS).toISOString();
    return out;
  }

  // Review / relearning phase.
  let ease = card.ease || cfg.startEase;

  if (grade === RATING.AGAIN) {
    ease = Math.max(cfg.minEase, ease - 0.2);
    out.ease = ease;
    out.lapses = (card.lapses || 0) + 1;
    out.state = 'relearning';
    out.interval = 0;
    out.due = new Date(now.getTime() + (settings.relearningSteps?.[0] || 10) * MIN_MS).toISOString();
    // Remember the post-lapse interval for when it graduates again.
    out._postLapseInterval = Math.max(1, Math.round(prevInterval * cfg.lapseFactor));
    return out;
  }

  if (card.state === 'relearning') {
    // Any non-Again answer graduates back to review.
    out.ease = ease;
    out.state = 'review';
    out.interval = clamp(Math.max(1, card._postLapseInterval || 1), 1, maxInt);
    out.due = new Date(now.getTime() + out.interval * DAY_MS).toISOString();
    return out;
  }

  let interval;
  if (grade === RATING.HARD) {
    ease = Math.max(cfg.minEase, ease - 0.15);
    interval = prevInterval * cfg.hardFactor;
  } else if (grade === RATING.GOOD) {
    interval = prevInterval * ease;
  } else {
    // Easy
    ease = ease + 0.15;
    interval = prevInterval * ease * cfg.easyBonus;
  }

  out.ease = ease;
  out.state = 'review';
  out.interval = clamp(Math.max(1, Math.round(interval)), 1, maxInt);
  out.due = new Date(now.getTime() + out.interval * DAY_MS).toISOString();
  return out;
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Compute the next scheduling state for a card given a 1–4 rating.
 * Returns ONLY the scheduling fields to merge back onto the card.
 */
export function schedule(card, grade, settings = DEFAULT_SETTINGS, now = new Date()) {
  const algo = settings.algorithm === 'sm2' ? scheduleSm2 : scheduleFsrs;
  return algo(card, grade, settings, now);
}

/** Human-readable interval label for a button preview. */
export function formatInterval(card, sched) {
  if (sched.state === 'learning' || sched.state === 'relearning') {
    const ms = new Date(sched.due) - new Date(card._now || Date.now());
    const mins = Math.max(1, Math.round(ms / MIN_MS));
    if (mins < 60) return `${mins}m`;
    return `${Math.round(mins / 60)}h`;
  }
  const d = sched.interval;
  if (d < 30) return `${d}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

/** Compute the four button previews without mutating the card. */
export function previewIntervals(card, settings = DEFAULT_SETTINGS, now = new Date()) {
  const out = {};
  for (const g of [RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY]) {
    const sched = schedule(card, g, settings, now);
    out[g] = formatInterval({ ...card, _now: now.getTime() }, sched);
  }
  return out;
}

/** Is this card due now? */
export function isDue(card, now = new Date()) {
  if (!card.due) return true; // never reviewed → due
  return new Date(card.due) <= now;
}

/** Fresh scheduling state for a brand-new card. */
export function newCardState(now = new Date()) {
  return {
    state: 'new',
    due: now.toISOString(),
    last_review: null,
    reps: 0,
    lapses: 0,
    step: 0,
    stability: null,
    difficulty: null,
    ease: SM2_DEFAULTS.startEase,
    interval: 0,
  };
}

/** Bucket counts for the dashboard. */
export function deckStats(cards, now = new Date()) {
  const s = { total: cards.length, new: 0, learning: 0, review: 0, due: 0 };
  for (const c of cards) {
    if (!c.state || c.state === 'new') s.new += 1;
    else if (c.state === 'learning' || c.state === 'relearning') s.learning += 1;
    else s.review += 1;
    if (isDue(c, now)) s.due += 1;
  }
  return s;
}

/**
 * Build a true Anki-style study queue from a deck's card array.
 *
 * Priority order (matches Anki desktop):
 *   1. Learning / relearning cards that are due now (sorted by due time asc)
 *   2. New cards (capped by newPerDay - todayNewShown, in deck order by default)
 *   3. Review cards due today (capped by revPerDay - todayRevShown, optional shuffle)
 *
 * Cards are interleaved using Anki's mixing ratio (roughly: for every N new cards,
 * show a review card). We use a simple alternating approach that matches AnkiDroid.
 *
 * @param {object[]}  cards            - All cards in the deck (progress-hydrated)
 * @param {object}    deckConf         - { newPerDay, revPerDay, newOrder, learningSteps, relearningSteps }
 * @param {object}    dailyCounters    - { newShown, revShown } — already shown today
 * @param {Date}      [now]
 * @returns {object[]}  Ordered queue of card objects ready for study
 */
export function buildSessionQueue(cards, deckConf, dailyCounters = {}, now = new Date()) {
  const newPerDay   = deckConf.newPerDay  ?? 20;
  const revPerDay   = deckConf.revPerDay  ?? 100;
  const newShown    = dailyCounters.newShown  ?? 0;
  const revShown    = dailyCounters.revShown  ?? 0;

  const newRemaining = Math.max(0, newPerDay  - newShown);
  const revRemaining = Math.max(0, revPerDay  - revShown);

  // ── 1. Learning / relearning due NOW ──────────────────────────────────
  const learningNow = cards
    .filter(c => (c.state === 'learning' || c.state === 'relearning') && isDue(c, now))
    .sort((a, b) => new Date(a.due) - new Date(b.due));

  // ── 2. New cards ───────────────────────────────────────────────────────
  let newCards = cards.filter(c => !c.state || c.state === 'new');
  // newOrder 0 = random shuffle, 1 = order added (default)
  if (deckConf.newOrder === 0) newCards = _shuffle(newCards);
  newCards = newCards.slice(0, newRemaining);

  // ── 3. Review cards due today ──────────────────────────────────────────
  let reviewCards = cards
    .filter(c => c.state === 'review' && isDue(c, now))
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, revRemaining);

  // ── 4. Interleave: learning first, then alternate new/review ──────────
  // Anki's mixing: roughly show a new card every ~7 reviews.
  // Simple approach: interleave new and review 1:1, then append learning at front.
  const interleaved = _interleave(newCards, reviewCards);
  return [...learningNow, ...interleaved];
}

/** Compute how many cards of each type are currently due (for deck list display). */
export function getDeckDueCounts(cards, deckConf, dailyCounters = {}, now = new Date()) {
  const newPerDay   = deckConf.newPerDay  ?? 20;
  const revPerDay   = deckConf.revPerDay  ?? 100;
  const newShown    = dailyCounters.newShown  ?? 0;
  const revShown    = dailyCounters.revShown  ?? 0;

  const newRemaining = Math.max(0, newPerDay  - newShown);
  const revRemaining = Math.max(0, revPerDay  - revShown);

  const newCount      = Math.min(newRemaining, cards.filter(c => !c.state || c.state === 'new').length);
  const learningCount = cards.filter(c => (c.state === 'learning' || c.state === 'relearning') && isDue(c, now)).length;
  const reviewCount   = Math.min(revRemaining, cards.filter(c => c.state === 'review' && isDue(c, now)).length);

  return { new: newCount, learning: learningCount, review: reviewCount };
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _interleave(newCards, reviewCards) {
  const result = [];
  const n = Math.max(newCards.length, reviewCards.length);
  for (let i = 0; i < n; i++) {
    if (i < reviewCards.length) result.push(reviewCards[i]);
    if (i < newCards.length)    result.push(newCards[i]);
  }
  return result;
}
