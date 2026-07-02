const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

const pdfPath = path.resolve("../../../Kiran_Makkar's_Speaking_Cue_Cards_May_Aug_2023_Final_Version_22.pdf");

async function extract() {
  try {
    let dataBuffer = fs.readFileSync(pdfPath);
    let data = await pdf(dataBuffer);
    
    // Write the raw text to a temporary file so we can analyze the structure
    const outPath = path.resolve('./makkar_raw.txt');
    fs.writeFileSync(outPath, data.text);
    console.log(`Successfully extracted ${data.numpages} pages.`);
    console.log(`Raw text saved to ${outPath}`);
  } catch (error) {
    console.error("Error extracting PDF:", error);
  }
}

extract();
