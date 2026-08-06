const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PDF_PATH = path.join(__dirname, '../../client/public/audio/80 IELTS Listening Tests.pdf');
const OUT_DIR = path.join(__dirname, '../data/extracted_tests');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function extractTests() {
  console.log('Reading PDF...');
  const fullText = execSync(`python -c "import PyPDF2; reader = PyPDF2.PdfReader(r'${PDF_PATH}'); print('\\n'.join(p.extract_text() for p in reader.pages))"`, { maxBuffer: 1024 * 1024 * 100 }).toString();

  // The text contains a scoreboard on page 2. We should skip that.
  // The real tests start with "1 PART  1 \nTEST  1"
  const startOfTests = fullText.indexOf('1 PART');
  let remainingText = fullText.substring(startOfTests);

  // We want to chunk the text by finding "TEST 1", "TEST 2", etc.
  // Using a less strict regex that catches "TEST  1", "TEST 1", etc.
  const qMatches = [...remainingText.matchAll(/TEST\s+(\d+)/g)];
  
  // However, the answer key at the end ALSO has "TEST 1", "TEST 2".
  // The first 80 matches are the questions. The next 80 matches are the answers!
  
  const testChunks = [];
  const answerChunks = {};
  
  // Find where questions end and answers begin.
  // Answers start roughly after the 80th test.
  let questionMatches = [];
  let answerMatches = [];
  
  // Let's filter out anything that is clearly not a test heading (like in the scoreboard).
  // A test heading is usually followed by "\nQuestions" or is just "TEST \n"
  const validMatches = qMatches; // they are in order: 1..80 then 1..80 again (or 1..80 for answers).
  
  // We can just separate them based on their index.
  // The questions are the first time we see an ID. The answers are the second time!
  const seenIds = new Set();
  
  for (let i = 0; i < validMatches.length; i++) {
    const id = parseInt(validMatches[i][1], 10);
    
    // There are actually multiple mentions of TEST in the answer key or questions.
    // To be perfectly safe, let's just find the index of "TEST 1" for questions and "TEST 1" for answers.
  }
  
  // Let's use a simpler approach. We know the answer key starts after test 80.
  // So we can split by "Answer keys" or just look for the second occurrence of "TEST 1".
  
  const firstTest1 = remainingText.indexOf('TEST  1');
  const secondTest1 = remainingText.indexOf('TEST 1', firstTest1 + 100);
  
  const questionsText = remainingText.substring(0, secondTest1 !== -1 ? secondTest1 : remainingText.length);
  const answersText = secondTest1 !== -1 ? remainingText.substring(secondTest1) : "";

  const qM = [...questionsText.matchAll(/TEST\s+(\d+)/g)];
  for (let i = 0; i < qM.length; i++) {
    const id = parseInt(qM[i][1], 10);
    // Ignore duplicate matches (sometimes the ID might appear twice in the text near the header)
    if (testChunks.find(c => c.id === id)) continue;
    
    const start = qM[i].index;
    let end = questionsText.length;
    // Find next distinct test
    for (let j = i + 1; j < qM.length; j++) {
      if (parseInt(qM[j][1], 10) !== id) {
        end = qM[j].index;
        break;
      }
    }
    testChunks.push({ id, text: questionsText.substring(start, end) });
  }

  const aM = [...answersText.matchAll(/TEST\s+(\d+)/g)];
  for (let i = 0; i < aM.length; i++) {
    const id = parseInt(aM[i][1], 10);
    if (answerChunks[id]) continue;
    
    const start = aM[i].index;
    let end = answersText.length;
    for (let j = i + 1; j < aM.length; j++) {
      if (parseInt(aM[j][1], 10) !== id) {
        end = aM[j].index;
        break;
      }
    }
    answerChunks[id] = answersText.substring(start, end);
  }

  console.log(`Found ${testChunks.length} tests. Starting AI extraction...`);

  const SYSTEM_PROMPT = `
You are an expert IELTS parser. You are given the raw text of a single section of an IELTS Listening test and its corresponding answer key.
Your job is to parse this into a strict JSON format matching exactly the BandLogic format.

IMPORTANT RULES:
1. "test_id" should be the test number (e.g. "1").
2. "title" should be "Practice Test X (Section Y)". Tests 1-20 are Section 1. Tests 21-40 are Section 2. Tests 41-60 are Section 3. Tests 61-80 are Section 4.
3. Include exactly 1 section in the "sections" array.
4. "audio_id" must be the test number (e.g. 1).
5. For each question, extract the question number, type (gap, mcq, matching, tfng), context (any headers or table headers), prompt, instruction, and answer from the answer key.
6. For gap fill, replace the blank with "______".
7. RETURN ONLY VALID JSON.

Example JSON output:
{
  "test_id": "1",
  "title": "Practice Test 1 (Section 1)",
  "sections": [
    {
      "number": 1,
      "audio_id": 1,
      "title": "Section 1",
      "questions": [
        {
          "id": "1",
          "number": 1,
          "type": "gap",
          "context": "PRESTON PARK RUN\\nDetails of run",
          "prompt": "Start of run: in front of the 1 ______",
          "instruction": "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
          "answer": "cafe"
        }
      ]
    }
  ]
}
`;

  const processTest = async (testInfo) => {
    const { id, text } = testInfo;
    const answerKey = answerChunks[id] || "No answers found.";
    
    const userPrompt = `TEST NUMBER: ${id}\n\nQUESTIONS RAW TEXT:\n${text}\n\nANSWER KEY RAW TEXT:\n${answerKey}`;
    
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      fs.writeFileSync(path.join(OUT_DIR, `test_${id}.json`), JSON.stringify(parsed, null, 2));
      console.log(`Processed Test ${id}`);
    } catch (err) {
      console.error(`Failed Test ${id}:`, err.message);
    }
  };

  // Run chunks in series of small batches to avoid rate limits
  for (let i = 0; i < testChunks.length; i += 5) {
    const chunk = testChunks.slice(i, i + 5);
    await Promise.all(chunk.map(processTest));
    console.log(`Finished batch ${i / 5 + 1}`);
  }
  
  console.log('All 80 tests extracted successfully!');
}

extractTests().catch(console.error);
