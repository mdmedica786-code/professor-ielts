/**
 * compare-models.js — quality check before trusting the cheaper free-tier grader.
 *
 * Grades the same sample answers with gpt-4o and gpt-4o-mini and prints the band
 * each gives, plus the difference. Run it with YOUR key (it reads server/.env):
 *
 *     cd server && node compare-models.js
 *
 * Look at the "Δ overall" column: if it's mostly 0.0–0.5, gpt-4o-mini is safe for
 * the free tier. If you see frequent 1.0+ swings, keep gpt-4o (set
 * FREE_EVAL_MODEL=gpt-4o on Render) or improve the prompt first.
 */
require("dotenv").config();
const { evaluateTranscript } = require("./services/openaiService");

const SAMPLES = [
  {
    label: "Part 1 — basic",
    part: 1,
    question: "Do you enjoy cooking?",
    transcript:
      "Um yeah I like cooking very much. I cook every day because um my mother she teach me when I was young. I like to make the rice and chicken. Sometimes I am cooking with my sister also. It is very enjoy for me.",
  },
  {
    label: "Part 1 — mid",
    part: 1,
    question: "How do you usually spend your weekends?",
    transcript:
      "Well, on weekends I usually try to relax because my weekdays are quite busy. I often meet my friends for coffee, and sometimes we go to the cinema. If the weather is nice, I like to go for a walk in the park near my house.",
  },
  {
    label: "Part 2 — mid/high",
    part: 2,
    question: "Describe a skill you would like to learn.",
    transcript:
      "I'd like to talk about learning to play the guitar. I've wanted to learn it since I was a teenager, mainly because I find music really relaxing and I admire people who can play an instrument. I think it would take a lot of practice and patience, but it would be rewarding to be able to play my favourite songs.",
  },
  {
    label: "Part 3 — high",
    part: 3,
    question: "How has technology changed the way people communicate?",
    transcript:
      "Well, technology has fundamentally transformed how we interact. Twenty years ago people relied almost entirely on face-to-face conversations or phone calls, whereas nowadays we have a whole spectrum of digital channels. One significant shift is that communication has become much more asynchronous, which is convenient but has arguably eroded the depth of our conversations. That said, it has enabled people to maintain relationships across vast distances, so it's a double-edged sword.",
  },
];

const overall = (e) => Math.round(((e.fc + e.lr + e.gra) / 3) * 2) / 2;

async function gradeBoth(s) {
  const [big, mini] = await Promise.all([
    evaluateTranscript(s.transcript, s.question, s.part, "gpt-4o"),
    evaluateTranscript(s.transcript, s.question, s.part, "gpt-4o-mini"),
  ]);
  return { big, mini, oBig: overall(big), oMini: overall(mini) };
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing — add it to server/.env first.");
    process.exit(1);
  }
  console.log("\nSample".padEnd(20), "4o (fc/lr/gra=ovr)".padEnd(24), "mini (fc/lr/gra=ovr)".padEnd(24), "Δ overall");
  console.log("-".repeat(82));

  const deltas = [];
  for (const s of SAMPLES) {
    try {
      const { big, mini, oBig, oMini } = await gradeBoth(s);
      const d = Math.abs(oBig - oMini);
      deltas.push(d);
      const bigStr = `${big.fc}/${big.lr}/${big.gra}=${oBig}`;
      const miniStr = `${mini.fc}/${mini.lr}/${mini.gra}=${oMini}`;
      console.log(s.label.padEnd(20), bigStr.padEnd(24), miniStr.padEnd(24), `${d.toFixed(1)}`);
    } catch (e) {
      console.log(s.label.padEnd(20), "ERROR:", e.message);
    }
  }

  if (deltas.length) {
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const max = Math.max(...deltas);
    console.log("-".repeat(82));
    console.log(`Avg |Δ overall|: ${avg.toFixed(2)} band   Max |Δ|: ${max.toFixed(1)} band`);
    console.log(
      avg <= 0.5
        ? "→ gpt-4o-mini tracks gpt-4o closely. Safe for the free tier."
        : "→ Noticeable divergence. Consider keeping gpt-4o for the free tier (FREE_EVAL_MODEL=gpt-4o) or refining the prompt."
    );
  }
  console.log("");
})();
