require("dotenv").config();
const { transcribeAudio } = require("./services/groqService");
const fs = require("fs");

async function test() {
  try {
    const audio = fs.readFileSync("../../audio.m4a");
    const result = await transcribeAudio(audio, "audio/m4a", "audio.m4a");
    console.log("Transcription length:", result.text.length);
    console.log("Words array length:", result.words ? result.words.length : 0);
    if (result.words && result.words.length > 0) {
      console.log("First word:", result.words[0]);
    } else {
      console.log("NO WORDS RETURNED BY GROQ API!");
      console.dir(result);
    }
  } catch (err) {
    console.error(err);
  }
}

test();
