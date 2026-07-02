const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, 'listening_raw.txt');
const OUT_FILE = path.join(__dirname, 'listening_parsed.json');

function parseListening() {
  const rawText = fs.readFileSync(RAW_FILE, 'utf-8');

  // Split into content vs answers
  // Looking at the sample, answers start with "126 Answers"
  // Let's find "Answers" followed by "TEST 1"
  const answersMatch = rawText.match(/Answers\s*\n+TEST\s*1/i);
  if (!answersMatch) {
    console.error("Could not find the start of the Answer Key!");
    return;
  }

  const questionsText = rawText.substring(0, answersMatch.index);
  const answersText = rawText.substring(answersMatch.index);

  const tests = [];

  // Parse questions
  // Each test starts with something like "1 TEST 1" or "1 PART 1\nTEST 1" or "2 TEST 2"
  const testRegex = /(?:\d+\s+)?TEST\s+(\d+)/gi;
  let match;
  let testStartIndices = [];

  while ((match = testRegex.exec(questionsText)) !== null) {
    // Only capture if it's really the start of a test (it's preceded by a number or PART or at the start of line)
    // To be safe, let's just collect all matches and filter out false positives if they are too close
    testStartIndices.push({
      testNum: parseInt(match[1]),
      index: match.index
    });
  }

  // Deduplicate or verify we have exactly 80. Some "TEST 1" might appear inside text.
  // We can assume each test section is bounded by the next test.
  const validTestIndices = [];
  let expectedTest = 1;
  for (const t of testStartIndices) {
    if (t.testNum === expectedTest) {
      validTestIndices.push(t);
      expectedTest++;
    }
  }

  if (validTestIndices.length !== 80) {
    console.warn(`Found ${validTestIndices.length} tests instead of 80! Expected test: ${expectedTest}`);
  }

  for (let i = 0; i < validTestIndices.length; i++) {
    const start = validTestIndices[i].index;
    const end = (i + 1 < validTestIndices.length) ? validTestIndices[i + 1].index : questionsText.length;
    
    let content = questionsText.substring(start, end);
    // Clean up footers like "Proper English School | 90 770 -99-77"
    content = content.replace(/Proper English School\s*\|\s*[\d\-\s]+/g, '');
    // Clean up page numbers if any standalone numbers exist
    content = content.replace(/^\s*\d+\s*$/gm, '');
    
    tests.push({
      id: `listening_test_${validTestIndices[i].testNum}`,
      testNumber: validTestIndices[i].testNum,
      // Grouping: Section 1 is Tests 1-20, Section 2 is 21-40, etc.
      section: Math.ceil(validTestIndices[i].testNum / 20),
      rawContent: content.trim(),
      answers: {}
    });
  }

  // Parse answers
  const ansTestRegex = /TEST\s+(\d+)/gi;
  let ansStartIndices = [];
  while ((match = ansTestRegex.exec(answersText)) !== null) {
    ansStartIndices.push({
      testNum: parseInt(match[1]),
      index: match.index
    });
  }

  const validAnsIndices = [];
  expectedTest = 1;
  for (const t of ansStartIndices) {
    if (t.testNum === expectedTest) {
      validAnsIndices.push(t);
      expectedTest++;
    }
  }

  for (let i = 0; i < validAnsIndices.length; i++) {
    const start = validAnsIndices[i].index;
    const end = (i + 1 < validAnsIndices.length) ? validAnsIndices[i + 1].index : answersText.length;
    
    let block = answersText.substring(start, end);
    const testNum = validAnsIndices[i].testNum;
    
    const lines = block.split('\n');
    let answersObj = {};
    for (let line of lines) {
      // match "1 answer", "10 answer"
      const ansMatch = line.match(/^\s*(\d+)\s+(.+)/);
      if (ansMatch) {
        let qNum = parseInt(ansMatch[1]);
        let ansText = ansMatch[2].trim();
        // Sometimes answer is "22 / 23 words", handle it.
        answersObj[qNum] = ansText;
      }
    }
    
    let testObj = tests.find(t => t.testNumber === testNum);
    if (testObj) {
      testObj.answers = answersObj;
    }
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(tests, null, 2));
  console.log(`Successfully parsed ${tests.length} tests and saved to listening_parsed.json`);
}

parseListening();
