const { execSync } = require('child_process');
const PDF_PATH = '../../client/public/audio/80 IELTS Listening Tests.pdf';
const fullText = execSync(`python -c "import PyPDF2; reader = PyPDF2.PdfReader(r'${PDF_PATH}'); print('\\n'.join(p.extract_text() for p in reader.pages))"`, { maxBuffer: 1024 * 1024 * 100 }).toString();

const answerKeyIndex = fullText.lastIndexOf('TEST  69');
const questionsText = fullText.substring(0, answerKeyIndex);

const matches = [...fullText.matchAll(/TEST.*?(\d+)/g)];
const str = matches[0][0];
console.log('Str:', str, 'Codes:', [...str].map(c => c.charCodeAt(0)));
