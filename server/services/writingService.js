const { OpenAI } = require("openai");
const IELTS_WRITING_EXAMINER_PROMPT = require("../prompts/ieltsWritingExaminer");
const { normalizeBand, meanBand } = require("../utils/bands");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Count words the way IELTS does — whitespace-separated tokens. */
function countWords(text) {
  const t = (text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

const MODULE_LABEL = { academic: "Academic", general: "General Training" };

/**
 * Grade an IELTS Writing response on TR/CC/LR/GRA with gpt-4o-mini.
 *
 * @param {Object} params
 * @param {string} params.essay      - the student's written response
 * @param {string} params.prompt     - the task prompt / question
 * @param {number} params.taskType   - 1 or 2
 * @param {string} params.module     - 'academic' | 'general'
 * @param {string} [params.imageBase64] - optional base64 image data
 * @returns {Promise<Object>} evaluation result (matches WritingEvaluationPanel contract)
 */
async function evaluateWriting({ essay, prompt, taskType, module, imageBase64 }) {
  const wordCount = countWords(essay);
  const minWords = taskType === 1 ? 150 : 250;
  const moduleLabel = MODULE_LABEL[module] || "Academic";

  const userMessage = `MODULE: ${moduleLabel}
TASK: Task ${taskType} (minimum ${minWords} words)
WORD COUNT (already counted — trust this): ${wordCount} words

TASK PROMPT:
"""
${prompt}
"""

STUDENT'S RESPONSE:
"""
${essay}
"""

Assess this response now against the four IELTS Writing criteria. Return ONLY valid JSON matching the contract.`;

  const contentArray = [
    { type: "text", text: userMessage }
  ];

  if (imageBase64) {
    // Determine mime type if possible, or default to png
    const mime = imageBase64.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    contentArray.push({
      type: "image_url",
      image_url: {
        url: `data:${mime};base64,${base64Data}`,
      }
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: IELTS_WRITING_EXAMINER_PROMPT },
      { role: "user", content: contentArray },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const parsed = JSON.parse(response.choices[0].message.content);

  const tr = normalizeBand(parsed.tr);
  const cc = normalizeBand(parsed.cc);
  const lr = normalizeBand(parsed.lr);
  const gra = normalizeBand(parsed.gra);
  if (tr === null || cc === null || lr === null || gra === null) {
    throw new Error(
      `Writing evaluator returned invalid scores (tr=${parsed.tr}, cc=${parsed.cc}, lr=${parsed.lr}, gra=${parsed.gra}). Please try again.`
    );
  }

  // Overall is the official mean of the four criteria, rounded to nearest 0.5.
  // Computed server-side — never trust a model-supplied overall.
  const overallBand = meanBand([tr, cc, lr, gra]);

  return {
    overallBand,
    scores: { tr, cc, lr, gra },
    verdict: parsed.verdict || "",
    criteria: {
      tr: parsed.criteria?.tr || { good: [], weak: [], note: "" },
      cc: parsed.criteria?.cc || { good: [], weak: [], note: "" },
      lr: parsed.criteria?.lr || { good: [], weak: [], note: "" },
      gra: parsed.criteria?.gra || { good: [], weak: [], note: "" },
    },
    mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
    improvedVersion: parsed.improvedVersion || "",
    plan: parsed.plan || { target: overallBand + 0.5, focus: "", drills: [] },
    essay,
    metadata: {
      wordCount,
      minWords,
      underLength: wordCount < minWords,
      taskType,
      module,
      prompt,
      imageBase64,
    },
  };
}

module.exports = { evaluateWriting, countWords };
