const { OpenAI } = require("openai");
const IELTS_WRITING_EXAMINER_PROMPT = require("../prompts/ieltsWritingExaminer");
const { WRITING_TASK1_DESCRIPTORS, WRITING_TASK2_DESCRIPTORS } = require("../prompts/bandDescriptors");
const { normalizeBand, meanBand } = require("../utils/bands");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Few-shot calibration: one Band 5 and one Band 8 example to anchor the scoring range.
const WRITING_FEW_SHOT = [
  {
    role: "user",
    content: `MODULE: Academic\nTASK: Task 2 (minimum 250 words)\nWORD COUNT (already counted — trust this): 198 words\n\nTASK PROMPT:\n"""\nSome people believe that universities should focus on providing academic skills rather than preparing students for employment. To what extent do you agree or disagree?\n"""\n\nSTUDENT'S RESPONSE:\n"""\nNowadays many people think that university should teach only academic things but I think it is important to also prepare for jobs. In my opinion both are important.\n\nFirstly, academic skills is very important because students need to learn theory and knowledge. For example if someone study medicine they need to know about the body and diseases. Without this knowledge they cannot become a good doctor.\n\nSecondly, preparing for employment is also necessary. Many students after graduation they cannot find job because they don't have practical skills. Companies want people who can work immediately not just people who know theory.\n\nIn conclusion I believe that university should provide both academic and employment skills. This way students can be successful in their career.\n"""\n\nAssess this response now against the four IELTS Writing criteria. Return ONLY valid JSON matching the contract.`
  },
  {
    role: "assistant",
    content: JSON.stringify({
      tr: 5.5, cc: 5.5, lr: 5.0, gra: 5.0,
      verdict: "An underweight essay that addresses the topic but with underdeveloped ideas, limited vocabulary, and frequent grammatical errors.",
      criteria: {
        tr: { good: ["Addresses both sides of the argument: \"I think it is important to also prepare for jobs\""], weak: ["Under the 250-word minimum at 198 words; ideas are stated but barely developed with only one basic example"], note: "Position is present but ideas lack extension and the essay is significantly under length — caps TR near 5.5." },
        cc: { good: ["Basic paragraph structure with introduction, two body paragraphs, and conclusion"], weak: ["Progression is formulaic ('Firstly...Secondly...In conclusion'); no cohesive devices beyond these"], note: "Organised but mechanical — paragraphs lack internal cohesion, keeping this at 5.5." },
        lr: { good: ["Some topic vocabulary: \"academic skills\", \"practical skills\", \"graduation\""], weak: ["Repetitive — 'important' used multiple times; very limited range with no less-common items or paraphrase"], note: "Adequate for the task but no flexibility — Band 5." },
        gra: { good: ["Some correct simple sentences: \"Companies want people who can work immediately\""], weak: ["Frequent errors: \"academic skills is\" (agreement), \"if someone study\" (conditional), \"they cannot find job\" (missing article)"], note: "Basic forms only; complex attempts have errors — Band 5." }
      },
      mistakes: [
        { cat: "grammar", said: "academic skills is very important", fix: "academic skills are very important", why: "Plural subject requires plural verb." },
        { cat: "grammar", said: "if someone study medicine", fix: "if someone studies medicine", why: "Third person singular requires -s in present simple." },
        { cat: "grammar", said: "they cannot find job", fix: "they cannot find a job", why: "Countable singular nouns need an article." },
        { cat: "task", said: "In conclusion I believe that university should provide both", fix: "The conclusion merely restates the thesis without synthesis", why: "A stronger conclusion should weigh the arguments or propose how to balance both." },
        { cat: "cohesion", said: "Firstly...Secondly...In conclusion", fix: "Use varied linking: 'Moreover', 'In addition', 'On the other hand'", why: "Mechanical sequencing limits CC; varied cohesive devices show flexibility." }
      ],
      improvedVersion: "In recent years, there has been growing debate about whether universities should prioritise academic learning or employment readiness. While academic knowledge forms the foundation of higher education, I firmly believe that institutions must also equip students with practical skills to succeed in the modern workforce.\n\nOn the one hand, academic skills remain indispensable. Students pursuing disciplines such as medicine or engineering require a thorough grounding in theory before they can apply their knowledge in practice. A medical student, for instance, must understand anatomy and pathology before treating patients. Without this theoretical base, professional competence would be impossible.\n\nOn the other hand, employers increasingly report that graduates lack the practical capabilities needed in the workplace. Communication skills, teamwork, and problem-solving are rarely taught in traditional lectures, yet they are precisely what organisations value most. Universities that integrate internships, case studies, and industry projects into their curricula produce graduates who can contribute immediately rather than requiring extensive on-the-job training.\n\nIn conclusion, academic rigour and employability are not mutually exclusive. Universities that blend theoretical depth with real-world application best serve their students, producing well-rounded professionals who are both knowledgeable and workplace-ready.",
      plan: { target: 6.0, focus: "Develop ideas with specific examples and extend arguments to meet the word count.", drills: [
        { area: "tr", task: "For each body paragraph, write a topic sentence, explain the idea, give a specific example, and explain why the example supports your point (TEEL structure)." },
        { area: "gra", task: "Practise subject-verb agreement by writing 10 sentences with plural/singular subjects daily and self-checking." },
        { area: "lr", task: "Learn 5 academic linking phrases per week (e.g., 'furthermore', 'consequently', 'in contrast') and use each in a practice essay." }
      ]}
    })
  }
];

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
async function evaluateWriting({ essay, prompt, taskType, module, imageBase64, model = "gpt-4o" }) {
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
    model,
    messages: [
      { role: "system", content: IELTS_WRITING_EXAMINER_PROMPT },
      { role: "system", content: taskType === 1 ? WRITING_TASK1_DESCRIPTORS : WRITING_TASK2_DESCRIPTORS },
      ...WRITING_FEW_SHOT,
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
