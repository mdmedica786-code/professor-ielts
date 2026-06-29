/**
 * Azure Cognitive Services Speech SDK — Pronunciation Assessment
 *
 * Replaces the old Python pronunciation proxy. Runs directly in Node.js.
 * Requires env vars: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
 *
 * Free tier: 5 hours/month of speech-to-text (plenty for hundreds of students).
 */

let sdk;
try {
  sdk = require('microsoft-cognitiveservices-speech-sdk');
} catch {
  sdk = null;
  console.warn('Azure Speech SDK not installed. Run: npm install microsoft-cognitiveservices-speech-sdk');
}

const SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'eastus';

const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');

/**
 * Convert any audio buffer (WebM/MP4/Ogg) to 16kHz 16-bit PCM WAV.
 * This matches Azure Speech SDK's native requirements.
 */
async function convertToWav(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-f', 'wav',
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      'pipe:1'
    ]);

    const chunks = [];
    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    
    let errorLog = '';
    ffmpeg.stderr.on('data', (chunk) => errorLog += chunk.toString());

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('FFmpeg error:', errorLog);
        return reject(new Error(`FFmpeg exited with code ${code}`));
      }
      resolve(Buffer.concat(chunks));
    });

    ffmpeg.on('error', reject);
    ffmpeg.stdin.on('error', (e) => reject(new Error(`ffmpeg stdin: ${e.message}`)));

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

/**
 * Map Azure's 0–100 pronunciation accuracy to an IELTS 0–9 band.
 */
function accuracyToBand(accuracy) {
  if (accuracy >= 95) return 9.0;
  if (accuracy >= 90) return 8.5;
  if (accuracy >= 85) return 8.0;
  if (accuracy >= 80) return 7.5;
  if (accuracy >= 73) return 7.0;
  if (accuracy >= 65) return 6.5;
  if (accuracy >= 55) return 6.0;
  if (accuracy >= 45) return 5.5;
  if (accuracy >= 35) return 5.0;
  return 4.5;
}

/**
 * Score pronunciation using Azure Cognitive Services Speech SDK.
 *
 * @param {Buffer} audioBuffer - WAV/WebM audio buffer
 * @param {string} transcript - The reference text the student should have said
 * @param {string} filename - Original filename (used for mime detection)
 * @returns {Promise<Object|null>} Pronunciation scores or null if unavailable
 */
async function scorePronunciation(audioBuffer, transcript, filename) {
  if (!sdk) {
    console.log('Azure Speech SDK not available — skipping pronunciation scoring');
    return null;
  }

  if (!SPEECH_KEY) {
    console.log('AZURE_SPEECH_KEY not set — skipping pronunciation scoring');
    return null;
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
    speechConfig.speechRecognitionLanguage = 'en-US';

    // Configure pronunciation assessment
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      transcript,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // enable miscue detection
    );
    pronunciationConfig.enableProsodyAssessment = true;

    // Convert the incoming audio (usually WebM from browser) to raw 16kHz WAV
    // because Node.js Azure Speech SDK doesn't natively support WebM unpacking.
    const wavBuffer = await convertToWav(audioBuffer);

    // Create audio config from buffer (default format is 16kHz 16bit PCM)
    const pushStream = sdk.AudioInputStream.createPushStream();
    
    pushStream.write(wavBuffer);
    pushStream.close();
    const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);

    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
    pronunciationConfig.applyTo(recognizer);

    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();

          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);

            let accuracy = pronunciationResult.accuracyScore || 0;
            let fluency = pronunciationResult.fluencyScore || 0;
            let completeness = pronunciationResult.completenessScore || 0;
            let prosody = pronunciationResult.prosodyScore || 0;

            // Extract per-word details and overall scores from JSON for safety
            const words = [];
            try {
              const jsonStr = result.properties.getProperty(
                sdk.PropertyId.SpeechServiceResponse_JsonResult
              );
              if (jsonStr) {
                const json = JSON.parse(jsonStr);
                
                // Fallback: extract overall scores directly from JSON if the SDK wrapper failed
                const overallPron = json?.NBest?.[0]?.PronunciationAssessment;
                if (overallPron) {
                  accuracy = accuracy || overallPron.AccuracyScore || 0;
                  fluency = fluency || overallPron.FluencyScore || 0;
                  completeness = completeness || overallPron.CompletenessScore || 0;
                  prosody = prosody || overallPron.ProsodyScore || 0;
                }

                const nbestWords = json?.NBest?.[0]?.Words || [];
                for (const w of nbestWords) {
                  const wordDetail = {
                    word: w.Word,
                    accuracy: w.PronunciationAssessment?.AccuracyScore || 0,
                    error: w.PronunciationAssessment?.ErrorType || 'None',
                  };
                  // Add phoneme details if available
                  if (w.Phonemes && w.Phonemes.length > 0) {
                    wordDetail.phonemes = w.Phonemes.map((p) => ({
                      phoneme: p.Phoneme,
                      accuracy: p.PronunciationAssessment?.AccuracyScore || 0,
                    }));
                  }
                  words.push(wordDetail);
                }
              }
            } catch (e) {
              console.error('Error parsing word-level results:', e.message);
            }

            // Identify mispronounced words (accuracy < 60)
            const mispronounced = words
              .filter((w) => w.accuracy < 60 && w.error !== 'Omission')
              .map((w) => ({
                word: w.word,
                accuracy: w.accuracy,
                phonemes: w.phonemes || [],
              }));

            const band = accuracyToBand(accuracy);

            let descriptor;
            if (band >= 8.5) descriptor = 'Excellent pronunciation — clear and natural throughout.';
            else if (band >= 7.5) descriptor = 'Very good pronunciation — easily understood with only minor issues.';
            else if (band >= 6.5) descriptor = 'Good pronunciation — generally clear; some words need sharper articulation.';
            else if (band >= 5.5) descriptor = 'Acceptable pronunciation — understandable but noticeable issues affect clarity.';
            else descriptor = 'Pronunciation needs work — listener effort required for many words.';

            resolve({
              band,
              method: 'azure-speech-sdk',
              accuracy,
              fluency,
              completeness,
              prosody,
              descriptor,
              mispronounced,
              wordCount: words.length,
              words,
            });
          } else {
            console.warn('Azure Speech recognition failed:', result.reason, result.errorDetails);
            resolve(null);
          }
        },
        (err) => {
          recognizer.close();
          console.error('Azure Speech error:', err);
          resolve(null); // Don't reject — graceful fallback
        }
      );
    });
  } catch (err) {
    console.error('Azure pronunciation scoring error:', err.message);
    return null;
  }
}

module.exports = { scorePronunciation };
