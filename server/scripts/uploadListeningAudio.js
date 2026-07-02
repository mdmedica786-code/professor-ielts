/**
 * uploadListeningAudio.js
 * Batch pipeline for the "80 IELTS Listening Tests" audio:
 *   raw audio -> ffmpeg (mp3 96k mono, ~halves size) -> Cloudinary CDN
 *             -> audio_url written to Supabase (or audio_urls.json if no Supabase yet)
 *
 * Uses the SAME Cloudinary account your mediaStorage.js already uses
 * (CLOUDINARY_URL in server/.env) and the ffmpeg-static binary already in deps.
 *
 * File naming it understands (case-insensitive), e.g.:
 *   Test 01 Section 1.mp3 / test1_s2.wav / T01-P3.m4a   -> test 1, section N
 *   Test 01.mp3 / test-12-full.mp3                      -> test 1, full-test audio
 *
 * Usage:
 *   node uploadListeningAudio.js --dir "../../listening_audio"            # dry run (prints plan)
 *   node uploadListeningAudio.js --dir "../../listening_audio" --go      # transcode + upload
 *   node uploadListeningAudio.js --dir ... --go --no-transcode           # already-small mp3s
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const ffmpeg = require("ffmpeg-static");
const cloudinary = require("cloudinary").v2; // auto-config from CLOUDINARY_URL

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};

const DIR = path.resolve(__dirname, opt("dir", "../../listening_audio"));
const GO = flag("go");
const TRANSCODE = !flag("no-transcode");
const DECK_SLUG = opt("deck-slug", "80-listening-tests");
const AUDIO_EXT = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".wma"]);

// ---------- filename -> { test, section|null } ----------
function classify(name) {
  const base = name.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const t = base.match(/(?:test|t)\s*[-_ ]?0*(\d{1,3})/i);
  if (!t) return null;
  // Since 80 IELTS Listening Tests uses 80 independent "Tests" (each being 1 section),
  // we just map TEST X to test X, with no explicit section in the filename.
  return { test: parseInt(t[1], 10), section: null };
}

// ---------- transcode ----------
function toMp3(src) {
  if (!TRANSCODE) return src;
  const out = path.join(os.tmpdir(), `bl_${path.basename(src).replace(/\.[^.]+$/, "")}.mp3`);
  execFileSync(ffmpeg, ["-y", "-i", src, "-ac", "1", "-b:a", "96k", "-map_metadata", "-1", out], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  return out;
}

// ---------- upload ----------
function upload(file, publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      file,
      {
        resource_type: "video", // Cloudinary treats audio as video
        folder: "bandlogic/listening-tests",
        public_id: publicId,
        overwrite: true,
        chunk_size: 6_000_000,
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
  });
}

// ---------- persist ----------
async function persist(entries) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const out = path.join(__dirname, "audio_urls.json");
    fs.writeFileSync(out, JSON.stringify(entries, null, 2));
    console.log(`No Supabase env — URL map saved to ${out} (re-run seed later).`);
    return;
  }
  const { createClient } = require("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: deck, error: deckErr } = await sb
    .from("decks")
    .upsert(
      { slug: DECK_SLUG, title: "80 IELTS Listening Tests", module: "listening", is_published: false },
      { onConflict: "slug" }
    )
    .select()
    .single();
  if (deckErr) throw deckErr;

  for (const e of entries) {
    const { data: test, error: tErr } = await sb
      .from("listening_tests")
      .upsert(
        { deck_id: deck.id, test_number: e.test, title: `Listening Test ${e.test}`, ...(e.section ? {} : { audio_url: e.url }) },
        { onConflict: "deck_id,test_number" }
      )
      .select()
      .single();
    if (tErr) throw tErr;

    if (e.section) {
      const { error: sErr } = await sb
        .from("listening_sections")
        .upsert(
          { test_id: test.id, section_number: e.section, audio_url: e.url },
          { onConflict: "test_id,section_number" }
        );
      if (sErr) throw sErr;
    }
    console.log(`  db: test ${e.test}${e.section ? ` section ${e.section}` : " (full)"} ✓`);
  }
}

// ---------- main ----------
(async () => {
  if (!fs.existsSync(DIR)) {
    console.error(`Audio folder not found: ${DIR}\nPass it with --dir "<path>"`);
    process.exit(1);
  }
  const files = fs
    .readdirSync(DIR)
    .filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => ({ file: path.join(DIR, f), meta: classify(f), name: f }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const known = files.filter((f) => f.meta);
  const unknown = files.filter((f) => !f.meta);

  console.log(`${files.length} audio files in ${DIR}`);
  console.log(`  matched: ${known.length}   unmatched: ${unknown.length}`);
  unknown.forEach((f) => console.log(`  ?? ${f.name} — rename to "Test NN Section N.ext"`));

  if (!GO) {
    known.slice(0, 10).forEach((f) =>
      console.log(`  plan: ${f.name} -> test ${f.meta.test}${f.meta.section ? ` s${f.meta.section}` : " (full)"}`)
    );
    console.log(`\nDry run only. Re-run with --go to transcode + upload.`);
    return;
  }
  if (!process.env.CLOUDINARY_URL) {
    console.error("CLOUDINARY_URL missing in server/.env — same variable mediaStorage.js uses.");
    process.exit(1);
  }

  const entries = [];
  for (const f of known) {
    const id = `test${String(f.meta.test).padStart(2, "0")}${f.meta.section ? `_s${f.meta.section}` : "_full"}`;
    try {
      const mp3 = toMp3(f.file);
      const url = await upload(mp3, id);
      if (mp3 !== f.file) fs.unlinkSync(mp3);
      entries.push({ test: f.meta.test, section: f.meta.section, url });
      console.log(`  up: ${f.name} -> ${id} ✓`);
    } catch (err) {
      console.error(`  FAILED ${f.name}: ${err.message}`);
    }
  }

  await persist(entries);
  console.log(`\nDone: ${entries.length}/${known.length} uploaded.`);
})().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
