const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server/data/extracted_tests/test_full_1.json');
const testData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const answers = {
  // Section 1
  "1": { answer: "café", acceptableAnswers: ["cafe"] },
  "2": { answer: "9 am", acceptableAnswers: ["nine am", "9 o'clock", "nine o'clock"] },
  "3": { answer: "5 km", acceptableAnswers: ["five km", "5 kilometers", "five kilometers", "5 kilometres", "five kilometres"] },
  "4": { answer: "a barcode", acceptableAnswers: ["barcode", "a bar code", "bar code", "a bar-code", "bar-code"] },
  "5": { answer: "website", acceptableAnswers: ["web site"] },
  "6": { answer: "1.50", acceptableAnswers: ["1.5"] },
  "7": { answer: "MAUGHAN", acceptableAnswers: [] },
  "8": { answer: "01444 732900", acceptableAnswers: [] },
  "9": { answer: "guiding", acceptableAnswers: ["guide"] },
  "10": { answer: "taking photos", acceptableAnswers: ["take photos", "photographs", "taking photographs"] },

  // Section 2
  "11": { answer: "sharks", acceptableAnswers: [] },
  "12": { answer: "old fishing village", acceptableAnswers: ["Old Fishing Village"] },
  "13": { answer: "shopping", acceptableAnswers: [] },
  "14": { answer: "water fountain", acceptableAnswers: ["fountain", "a fountain", "a water fountain"] },
  "15": { answer: "student card", acceptableAnswers: ["a student card"] },
  "16": { answer: "50 minutes", acceptableAnswers: ["fifty minutes", "50 mins", "fifty mins"] },
  "17": { answer: "museum", acceptableAnswers: ["the museum", "a museum"] },
  "18": { answer: "tourist office", acceptableAnswers: ["the tourist office"] },
  "19": { answer: "rainwear", acceptableAnswers: ["rain wear", "rain-wear"] },
  "20": { answer: "e-ticket", acceptableAnswers: ["e ticket", "an e-ticket"] },

  // Section 3
  "21": { answer: "C", acceptableAnswers: [] },
  "22": { answer: "A", acceptableAnswers: [] },
  "23": { answer: "B", acceptableAnswers: [] },
  "24": { answer: "A", acceptableAnswers: [] },
  "25": { answer: "C", acceptableAnswers: [] },
  "26": { answer: "B", acceptableAnswers: [] },
  "27": { answer: "senior management", acceptableAnswers: ["management", "managers", "senior managers"] },
  "28": { answer: "project request", acceptableAnswers: ["a project request"] },
  "29": { answer: "meeting", acceptableAnswers: ["a meeting"] },
  "30": { answer: "conference call", acceptableAnswers: ["a conference call"] },

  // Section 4
  "31": { answer: "29,000 years", acceptableAnswers: ["29000 years"] },
  "32": { answer: "southern Europe", acceptableAnswers: ["south Europe"] },
  "33": { answer: "water", acceptableAnswers: [] },
  "34": { answer: "minerals", acceptableAnswers: [] },
  "35": { answer: "white gold", acceptableAnswers: [] },
  "36": { answer: "china stone", acceptableAnswers: [] },
  "37": { answer: "cooling down", acceptableAnswers: ["cooling"] },
  "38": { answer: "windows", acceptableAnswers: [] },
  "39": { answer: "volcanic ash", acceptableAnswers: [] },
  "40": { answer: "harbours", acceptableAnswers: ["harbors"] }
};

testData.sections.forEach(section => {
  section.questions.forEach(q => {
    const ansData = answers[q.number.toString()];
    if (ansData) {
      q.answer = ansData.answer;
      q.acceptableAnswers = ansData.acceptableAnswers;
    }
  });
});

fs.writeFileSync(filePath, JSON.stringify(testData, null, 2), 'utf8');
console.log('Successfully added answers to test_full_1.json!');
