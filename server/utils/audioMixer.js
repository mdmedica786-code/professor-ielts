/**
 * Exam-room realism for generated Hörtexte: overlays a looped background
 * noise track (server/assets/noise/<scene>.mp3) at low volume and adds a
 * slight room reverb, using the bundled ffmpeg-static binary.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const NOISE_DIR = path.join(__dirname, "..", "assets", "noise");
const AMBIENT_SCENES = ["none", "cafe", "street", "office", "station"];
const DEFAULT_NOISE_VOLUME = 0.12; // ~10–15 % of the voice level

function resolveFfmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const bundled = require("ffmpeg-static");
    if (bundled && fs.existsSync(bundled)) return bundled;
  } catch {
    /* fall through to system ffmpeg */
  }
  return "ffmpeg";
}

function sanitizeScene(scene) {
  const s = String(scene || "").trim().toLowerCase();
  return AMBIENT_SCENES.includes(s) ? s : "none";
}

/** Noise file for a scene (mp3/wav/ogg), or null if none is installed. */
function noiseFileFor(scene) {
  if (scene === "none") return null;
  for (const ext of ["mp3", "wav", "ogg", "m4a"]) {
    const file = path.join(NOISE_DIR, `${scene}.${ext}`);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(resolveFfmpegPath(), args);
    const chunks = [];
    let errorLog = "";
    proc.stdout.on("data", (c) => chunks.push(c));
    proc.stderr.on("data", (c) => (errorLog += c.toString()));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited with code ${code}: ${errorLog}`))
    );
  });
}

/**
 * @param {string} base64Mp3 - TTS audio (base64 mp3)
 * @param {string} scene - 'cafe' | 'street' | 'office' | 'station' | 'none'
 * @param {{ noiseVolume?: number, reverb?: boolean }} [options]
 * @returns {Promise<string>} mixed audio as base64 mp3; the input unchanged
 *   when there is nothing to do or mixing fails (never throws).
 */
async function mixAmbience(base64Mp3, scene, { noiseVolume = DEFAULT_NOISE_VOLUME, reverb = true } = {}) {
  if (!base64Mp3) return base64Mp3;
  const s = sanitizeScene(scene);
  const noiseFile = noiseFileFor(s);
  if (s !== "none" && !noiseFile) console.warn(`Ambient noise for scene "${s}" not found in ${NOISE_DIR} — mixing without noise`);
  if (!noiseFile && !reverb) return base64Mp3;

  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "goethe-mix-"));
  const voiceFile = path.join(dir, "voice.mp3");
  try {
    await fs.promises.writeFile(voiceFile, Buffer.from(base64Mp3, "base64"));
    const volume = Math.min(Math.max(Number(noiseVolume) || DEFAULT_NOISE_VOLUME, 0), 0.3);

    // Slight early reflections: two short, quiet echoes (exam-room loudspeaker).
    const voiceChain = reverb ? "aecho=0.85:0.8:35|70:0.18|0.09" : "anull";
    const args = ["-hide_banner", "-loglevel", "error", "-i", voiceFile];
    let filter;
    if (noiseFile) {
      // Loop the noise track endlessly; the mix ends with the voice track.
      args.push("-stream_loop", "-1", "-i", noiseFile);
      filter =
        `[0:a]aresample=24000,aformat=channel_layouts=mono,${voiceChain}[v];` +
        `[1:a]aresample=24000,aformat=channel_layouts=mono,volume=${volume},afade=t=in:d=1.5[n];` +
        `[v][n]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.95[out]`;
    } else {
      filter = `[0:a]${voiceChain}[out]`;
    }
    args.push("-filter_complex", filter, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "64k", "-ar", "24000", "-ac", "1", "-f", "mp3", "pipe:1");

    const mixed = await runFfmpeg(args);
    return mixed.length ? mixed.toString("base64") : base64Mp3;
  } catch (err) {
    console.warn("Ambient mixing failed, returning clean audio:", err.message);
    return base64Mp3;
  } finally {
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { mixAmbience, sanitizeScene, resolveFfmpegPath, AMBIENT_SCENES, NOISE_DIR };
