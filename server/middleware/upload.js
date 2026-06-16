const multer = require("multer");

// Single source of truth for audio upload handling. The 25MB ceiling matches
// the OpenAI Whisper request limit. Multer parses the multipart body FIRST so
// that downstream middleware (validateAudio) and route handlers can read
// req.file. Mount as: app.use(path, upload.single("audio"), validateAudio, route)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload, MAX_FILE_SIZE };
