/**
 * calibrate.js — measures how close the AI grader is to human examiner bands.
 *
 * Runs every sample in server/calibration/samples.json through the real grading
 * functions and reports Mean Absolute Error (MAE), bias (does it over/under-score),
 * and how often it lands within ±0.5 / ±1.0 of the human band.
 *
 * Run it with your key (reads server/.env):
 *     cd server && node calibrate.js
 *     cd server && CALIBRATE_MODEL=gpt-4o-mini node calibrate.js   # check the free tier
 *
 * TARGET for shipping confidence: overall MAE ≤ 0.5 and ≥ 80% of samples within ±0.5.
 *
 * ⚠️ The samples shipped here are PLACEHOLDERS so the harness runs out of the box.
 *    Replace them with REAL examiner-marked answers the model has never seen
 *    (official published sample responses with their band commentary, or your own
 *    human-marked submissions) — otherwise the numbers are meaningless.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { evaluateTranscript } = require("./services/openaiService");
const { evaluateWriting } = require("./services/writingService");

const MODEL = process.env.CALIBRATE_MODEL || "gpt-4o";
const round5 = (n) => Math.round(n * 2) / 2;

// Criteria we compare per section (pronunciation needs audio, so it's excluded).
const CRITERIA = {
  speaking: ["fc", "lr", "gra", "overall"],
  writing: ["tr", "cc", "lr", "gra", "overall"],
};

async function gradeSample(s) {
  if (s.section === "speaking") {
    const r = await evaluateTranscript(s.text, s.questionText, s.part || 1, MODEL);
    const overall = round5((r.fc + r.lr + r.gra) / 3);
    return { fc: r.fc, lr: r.lr, gra: r.gra, overall };
  }
  if (s.section === "writing") {
    const r = await evaluateWriting({
      essay: s.text,
      prompt: s.prompt,
      taskType: s.taskType || 2,
      module: s.module || "academic",
      model: MODEL,
    });
    return { ...r.scores, overall: r.overallBand };
  }
  throw new Error(`Unknown section "${s.section}"`);
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing — add it to server/.env first.");
    process.exit(1);
  }

  const file = path.join(__dirname, "calibration", "samples.json");
  const samples = JSON.parse(fs.readFileSync(file, "utf8"));
  const anyPlaceholder = samples.some((s) => s._placeholder);

  console.log(`\nCalibrating grader model: ${MODEL}   (${samples.length} samples)\n`);
  console.log("id".padEnd(28), "section".padEnd(9), "human→model (overall)".padEnd(24), "Δ");
  console.log("-".repeat(74));

  // criterion -> { absSum, signedSum, n, within05, within10 }  (overall tracked too)
  const agg = {};
  const bump = (crit, model, human) => {
    const d = model - human;
    const a = (agg[crit] ||= { absSum: 0, signedSum: 0, n: 0, w05: 0, w10: 0 });
    a.absSum += Math.abs(d); a.signedSum += d; a.n += 1;
    if (Math.abs(d) <= 0.5) a.w05 += 1;
    if (Math.abs(d) <= 1.0) a.w10 += 1;
  };

  for (const s of samples) {
    try {
      const model = await gradeSample(s);
      for (const crit of CRITERIA[s.section]) {
        if (s.human?.[crit] != null && model?.[crit] != null) bump(crit, model[crit], s.human[crit]);
      }
      const dOverall = (model.overall - s.human.overall).toFixed(1);
      console.log(
        String(s.id).padEnd(28),
        s.section.padEnd(9),
        `${s.human.overall} → ${model.overall}`.padEnd(24),
        `${dOverall > 0 ? "+" : ""}${dOverall}`
      );
    } catch (e) {
      console.log(String(s.id).padEnd(28), s.section.padEnd(9), "ERROR:", e.message);
    }
  }

  console.log("\nPer-criterion accuracy");
  console.log("-".repeat(74));
  console.log("criterion".padEnd(12), "MAE".padEnd(8), "bias".padEnd(10), "≤0.5".padEnd(8), "≤1.0");
  for (const [crit, a] of Object.entries(agg)) {
    if (!a.n) continue;
    const mae = (a.absSum / a.n).toFixed(2);
    const bias = (a.signedSum / a.n).toFixed(2);
    const p05 = `${Math.round((a.w05 / a.n) * 100)}%`;
    const p10 = `${Math.round((a.w10 / a.n) * 100)}%`;
    console.log(crit.padEnd(12), mae.padEnd(8), `${bias > 0 ? "+" : ""}${bias}`.padEnd(10), p05.padEnd(8), p10);
  }

  const o = agg.overall;
  if (o?.n) {
    const mae = o.absSum / o.n;
    const pct05 = o.w05 / o.n;
    console.log("\n" + "=".repeat(74));
    console.log(
      `OVERALL: MAE ${mae.toFixed(2)} band · ${Math.round(pct05 * 100)}% within ±0.5 · bias ${(o.signedSum / o.n).toFixed(2)}`
    );
    const pass = mae <= 0.5 && pct05 >= 0.8;
    console.log(
      pass
        ? "✅ Within target (MAE ≤ 0.5, ≥80% within ±0.5). Grader is trustworthy."
        : "⚠️ Below target. Tune the few-shot/prompt (bias > 0 = over-scoring, < 0 = under-scoring), then re-run."
    );
    if (Math.abs(o.signedSum / o.n) >= 0.3) {
      console.log(`   Note: consistent ${o.signedSum > 0 ? "over" : "under"}-scoring — adjust the anchor examples toward the human bands.`);
    }
  }

  if (anyPlaceholder) {
    console.log("\n⚠️  These are PLACEHOLDER samples — replace them with real, unseen examiner-marked answers before trusting these numbers.");
  }
  console.log("");
})();
