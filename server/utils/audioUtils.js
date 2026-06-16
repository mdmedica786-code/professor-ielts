/**
 * Audio format utility helpers.
 */

const MIME_MAP = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
};

/**
 * Get MIME type from filename extension.
 * @param {string} filename
 * @returns {string} MIME type string
 */
function getMimeType(filename) {
  const ext = "." + filename.split(".").pop().toLowerCase();
  return MIME_MAP[ext] || "audio/wav";
}

/**
 * Get file extension from MIME type.
 * @param {string} mimeType
 * @returns {string} File extension including dot
 */
function getExtension(mimeType) {
  const reversed = Object.fromEntries(
    Object.entries(MIME_MAP).map(([k, v]) => [v, k])
  );
  return reversed[mimeType] || ".wav";
}

module.exports = { getMimeType, getExtension, MIME_MAP };
