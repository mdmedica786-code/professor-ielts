/**
 * IELTS band calculation and score classification helpers.
 */

/**
 * Calculate overall IELTS band from 4 criteria scores.
 * Uses arithmetic mean rounded to nearest 0.5.
 */
export function calculateOverallBand(fc, lr, gra, p) {
  const mean = (fc + lr + gra + p) / 4;
  return Math.round(mean * 2) / 2;
}

/**
 * Get score classification for color coding.
 * @returns {'good'|'okay'|'poor'}
 */
export function getScoreClass(score) {
  if (score >= 7.0) return 'good';
  if (score >= 5.5) return 'okay';
  return 'poor';
}

/**
 * Get CSS classes for a score badge.
 */
export function getScoreBadgeClass(score) {
  const cls = getScoreClass(score);
  return `score-badge score-${cls}`;
}

/**
 * Get color values for a score (used in SVG gauges).
 */
export function getScoreColor(score) {
  if (score >= 7.0) return { main: '#059669', light: '#ecfdf5', border: '#a7f3d0' };
  if (score >= 5.5) return { main: '#d97706', light: '#fffbeb', border: '#fde68a' };
  return { main: '#e11d48', light: '#fff1f2', border: '#fecdd3' };
}

/**
 * Get band descriptor text.
 */
export function getBandDescriptor(band) {
  const descriptors = {
    9.0: 'Expert',
    8.5: 'Very Good',
    8.0: 'Very Good',
    7.5: 'Good',
    7.0: 'Good',
    6.5: 'Competent',
    6.0: 'Competent',
    5.5: 'Modest',
    5.0: 'Modest',
    4.5: 'Limited',
    4.0: 'Limited',
    3.5: 'Extremely Limited',
    3.0: 'Extremely Limited',
  };
  return descriptors[band] || 'N/A';
}

/**
 * Get criteria full name.
 */
export function getCriteriaName(key) {
  const names = {
    fc: 'Fluency & Coherence',
    lr: 'Lexical Resource',
    gra: 'Grammatical Range & Accuracy',
    p: 'Pronunciation',
    // Writing criteria
    tr: 'Task Achievement / Response',
    cc: 'Coherence & Cohesion',
  };
  return names[key] || key.toUpperCase();
}

/**
 * Get criteria short name.
 */
export function getCriteriaShort(key) {
  const shorts = {
    fc: 'FC',
    lr: 'LR',
    gra: 'GRA',
    p: 'P',
    tr: 'TR',
    cc: 'CC',
  };
  return shorts[key] || key.toUpperCase();
}
