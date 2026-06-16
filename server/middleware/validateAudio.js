const ALLOWED_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "video/webm", // MediaRecorder sometimes outputs video/webm with audio
];

const ALLOWED_EXTENSIONS = [".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac", ".mpeg"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Groq limit)

/**
 * Middleware to validate uploaded audio files.
 */
function validateAudio(req, res, next) {
  if (!req.file) {
    // No file is okay — might be text-only mode
    return next();
  }

  // Check file size
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(413).json({
      success: false,
      error: `File too large (${(req.file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 25MB.`,
    });
  }

  // Check extension
  const ext = "." + req.file.originalname.split(".").pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
    });
  }

  // Check MIME type (lenient — browsers sometimes report wrong types)
  const mime = req.file.mimetype?.toLowerCase();
  if (mime && !ALLOWED_TYPES.includes(mime) && !mime.startsWith("audio/") && !mime.startsWith("video/webm")) {
    console.warn(`Unexpected MIME type: ${mime} for file ${req.file.originalname}`);
    // Don't reject — just warn. Extension check is more reliable.
  }

  next();
}

module.exports = validateAudio;
