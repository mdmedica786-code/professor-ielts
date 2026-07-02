/**
 * mediaStorage.js — offloads generated TTS audio to Cloudinary so it isn't shipped
 * as multi-MB base64 (which blows past Firestore's 1 MiB doc limit and chokes
 * localStorage). Returns a durable URL you can persist for resume + play.
 *
 * Setup: `npm i cloudinary` in server/, then set CLOUDINARY_URL in server/.env
 * (Cloudinary dashboard → "API Environment variable"). No credit card needed for
 * the free tier. If CLOUDINARY_URL is unset OR the package isn't installed, every
 * function no-ops (returns null) so the caller can fall back to inline base64.
 */
let cloudinary = null;
try {
  cloudinary = require("cloudinary").v2; // auto-configures from CLOUDINARY_URL
} catch {
  console.warn('mediaStorage: "cloudinary" not installed — audio will fall back to base64. Run `npm i cloudinary`.');
}

const ENABLED = !!(cloudinary && process.env.CLOUDINARY_URL);

/** True when uploads will actually happen. */
function storageEnabled() {
  return ENABLED;
}

/**
 * Upload an audio Buffer and return its https URL (or null to signal fallback).
 * @param {Buffer} buffer   mp3 audio
 * @param {string} publicId stable id, e.g. `listening/<testId>/s1u3`
 */
async function uploadAudio(buffer, publicId) {
  if (!ENABLED) return null;
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // Cloudinary treats audio as "video"
        folder: "bandlogic/listening",
        public_id: publicId,
        format: "mp3",
        overwrite: true,
      },
      (err, result) => {
        if (err) {
          console.warn("Cloudinary upload failed:", err.message);
          return resolve(null); // fall back to base64
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete everything under a prefix (e.g. an old test's audio) — call from your
 * cleanup cron. Cloudinary's free tier is generous, but test audio is disposable.
 * @param {string} prefix e.g. `bandlogic/listening/<testId>`
 */
async function deleteByPrefix(prefix) {
  if (!ENABLED) return;
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix, { resource_type: "video" });
  } catch (err) {
    console.warn("Cloudinary cleanup failed:", err.message);
  }
}

module.exports = { storageEnabled, uploadAudio, deleteByPrefix };
