const axios = require("axios");
const FormData = require("form-data");

const PRONUNCIATION_URL =
  process.env.PYTHON_PRONUNCIATION_URL || "http://localhost:8000";

/**
 * Send audio + transcript to the Python pronunciation pipeline for scoring.
 *
 * @param {Buffer} audioBuffer - Raw audio file buffer
 * @param {string} transcript - Transcript text from Groq
 * @param {string} filename - Original filename
 * @param {Array} groqWords - Word timestamps from Whisper
 * @returns {Promise<Object|null>} Pronunciation scores or null if service unavailable
 */
async function scorePronunciation(audioBuffer, transcript, filename, groqWords) {
  try {
    // Check if the Python service is available
    await axios.get(`${PRONUNCIATION_URL}/health`, { timeout: 3000 });
  } catch {
    console.log(
      "Pronunciation service unavailable — skipping acoustic scoring"
    );
    return null;
  }

  try {
    const form = new FormData();
    form.append("audio", audioBuffer, {
      filename: filename,
      contentType: "audio/wav",
    });
    form.append("transcript", transcript);
    form.append("words", JSON.stringify(groqWords || []));

    const response = await axios.post(`${PRONUNCIATION_URL}/evaluate`, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 min timeout for MFA + scoring
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      console.error(
        "Pronunciation service error:",
        response.data?.error || "Unknown error"
      );
      return null;
    }
  } catch (err) {
    console.error("Pronunciation service call failed:", err.message);
    return null;
  }
}

module.exports = { scorePronunciation };
