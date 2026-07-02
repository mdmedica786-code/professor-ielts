// Shared IELTS band helpers used by the Writing and Reading graders.

/**
 * Coerce a model-provided score into a valid IELTS band: a number clamped to
 * 0–9 and snapped to the nearest 0.5. Returns null when the value is missing or
 * non-numeric so callers can detect a malformed grade instead of propagating NaN.
 */
function normalizeBand(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const clamped = Math.min(9, Math.max(0, n));
  return Math.round(clamped * 2) / 2;
}

/** Arithmetic mean of an array of bands, rounded to the nearest 0.5. */
function meanBand(values) {
  const nums = values.filter((v) => typeof v === "number" && !Number.isNaN(v));
  if (nums.length === 0) return 0;
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  return Math.round(mean * 2) / 2;
}

// Percentage-correct → band thresholds. These approximate the official IELTS
// raw-score (/40) conversion tables, expressed as fractions so they work for
// practice sets of any length. Academic and General Training differ: GT texts
// are easier, so GT requires a higher percentage for the same band.
// Each entry is [minFractionCorrect, band], highest first.
const READING_BANDS = {
  academic: [
    [0.975, 9.0], [0.925, 8.5], [0.875, 8.0], [0.825, 7.5], [0.75, 7.0],
    [0.675, 6.5], [0.575, 6.0], [0.475, 5.5], [0.375, 5.0], [0.325, 4.5],
    [0.25, 4.0], [0.2, 3.5], [0.15, 3.0], [0.1, 2.5],
  ],
  general: [
    [1.0, 9.0], [0.975, 8.5], [0.925, 8.0], [0.9, 7.5], [0.85, 7.0],
    [0.8, 6.5], [0.75, 6.0], [0.675, 5.5], [0.575, 5.0], [0.475, 4.5],
    [0.375, 4.0], [0.3, 3.5], [0.225, 3.0], [0.15, 2.5],
  ],
};

/**
 * Convert a reading raw score to an estimated band.
 * @param {number} correct - number of correct answers
 * @param {number} total - number of questions
 * @param {'academic'|'general'} module
 * @returns {number} band 0–9 (0.5 steps)
 */
function readingBand(correct, total, module = "academic") {
  if (!total || total <= 0) return 0;
  const frac = Math.max(0, Math.min(1, correct / total));
  const table = READING_BANDS[module] || READING_BANDS.academic;
  for (const [minFrac, band] of table) {
    if (frac >= minFrac) return band;
  }
  return 2.0;
}

// IELTS Listening raw-score (/40) → band conversion. Same scale for Academic and
// GT. Expressed as fractions so single-section practice (10 Qs) maps the same
// curve as the full test (40 Qs). Each entry is [minFractionCorrect, band],
// highest first. Derived from the official Cambridge raw-score conversion.
const LISTENING_BANDS = [
  [1.000, 9.0], // 40
  [0.950, 8.5], // 38–39
  [0.875, 8.0], // 35–37
  [0.825, 7.5], // 33–34
  [0.750, 7.0], // 30–32
  [0.675, 6.5], // 27–29
  [0.575, 6.0], // 23–26
  [0.500, 5.5], // 20–22
  [0.400, 5.0], // 16–19
  [0.350, 4.5], // 14–15
  [0.300, 4.0], // 12–13
  [0.250, 3.5], // 10–11
  [0.200, 3.0], // 8–9
  [0.150, 2.5], // 6–7
  [0.100, 2.0], // 4–5
];

/**
 * Convert a listening raw score to an estimated band.
 * @param {number} correct - number of correct answers
 * @param {number} total - number of questions
 * @returns {number} band 0–9 (0.5 steps)
 */
function listeningBand(correct, total) {
  if (!total || total <= 0) return 0;
  const frac = Math.max(0, Math.min(1, correct / total));
  for (const [minFrac, band] of LISTENING_BANDS) {
    if (frac >= minFrac) return band;
  }
  return 2.0;
}

module.exports = { normalizeBand, meanBand, readingBand, listeningBand };
