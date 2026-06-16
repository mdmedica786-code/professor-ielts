/**
 * Time, date, and score formatting utilities.
 */

/**
 * Format seconds to MM:SS display.
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format ISO timestamp to readable date.
 */
export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format ISO timestamp to readable date + time.
 */
export function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a duration in seconds to human readable.
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Format a score to one decimal place.
 */
export function formatScore(score) {
  if (score == null) return '—';
  return Number(score).toFixed(1);
}

/**
 * Generate a unique ID based on timestamp.
 */
export function generateId() {
  return `eval-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
