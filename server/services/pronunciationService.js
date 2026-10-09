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

// Locales accepted from callers. Prosody assessment is only offered by Azure
// for English, so it is enabled for en-* only.
const SUPPORTED_LANGUAGES = new Set(['en-US', 'en-GB', 'de-DE']);
const TICKS_PER_SECOND = 10_000_000; // Azure offsets/durations are in 100-ns ticks
const LONG_PAUSE_SECONDS = 1.0;

function sanitizeLanguage(language) {
  return SUPPORTED_LANGUAGES.has(language) ? language : 'en-US';
}

/** Overall scores + per-word details (with timing) from one recognition result. */
function parseRecognitionResult(result) {
  const pronunciationResult = sdk.PronunciationAssessmentResult.fromResult(result);
  const scores = {
    accuracy: pronunciationResult.accuracyScore || 0,
    fluency: pronunciationResult.fluencyScore || 0,
    completeness: pronunciationResult.completenessScore || 0,
    prosody: pronunciationResult.prosodyScore || 0,
  };
  const words = [];
  try {
    const jsonStr = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult);
    if (jsonStr) {
      const json = JSON.parse(jsonStr);

      // Fallback: extract overall scores directly from JSON if the SDK wrapper failed
      const overallPron = json?.NBest?.[0]?.PronunciationAssessment;
      if (overallPron) {
        scores.accuracy = scores.accuracy || overallPron.AccuracyScore || 0;
        scores.fluency = scores.fluency || overallPron.FluencyScore || 0;
        scores.completeness = scores.completeness || overallPron.CompletenessScore || 0;
        scores.prosody = scores.prosody || overallPron.ProsodyScore || 0;
      }

      for (const w of json?.NBest?.[0]?.Words || []) {
        const wordDetail = {
          word: w.Word,
          accuracy: w.PronunciationAssessment?.AccuracyScore || 0,
          error: w.PronunciationAssessment?.ErrorType || 'None',
          offset: w.Offset,
          duration: w.Duration,
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
  return { scores, words };
}

/**
 * Combines the segments of a continuous recognition: scores are weighted by
 * the number of words per segment; pauses and speech rate come from the
 * word timings.
 */
function aggregateSegments(segments) {
  const spoken = segments.filter((seg) => seg.words.length);
  const totalWords = spoken.reduce((n, seg) => n + seg.words.length, 0);
  if (!totalWords) return null;
  const weighted = (key) =>
    Math.round((spoken.reduce((sum, seg) => sum + seg.scores[key] * seg.words.length, 0) / totalWords) * 10) / 10;

  const words = spoken.flatMap((seg) => seg.words);
  const timed = words.filter((w) => Number.isFinite(w.offset) && Number.isFinite(w.duration));
  const longPauses = [];
  for (let i = 1; i < timed.length; i++) {
    const gap = (timed[i].offset - (timed[i - 1].offset + timed[i - 1].duration)) / TICKS_PER_SECOND;
    if (gap >= LONG_PAUSE_SECONDS) {
      longPauses.push({ afterWord: timed[i - 1].word, seconds: Math.round(gap * 10) / 10 });
    }
  }
  const speakingSeconds = timed.length
    ? (timed[timed.length - 1].offset + timed[timed.length - 1].duration - timed[0].offset) / TICKS_PER_SECOND
    : 0;

  return {
    scores: {
      accuracy: weighted('accuracy'),
      fluency: weighted('fluency'),
      completeness: weighted('completeness'),
      prosody: weighted('prosody'),
    },
    words,
    timing: {
      speakingSeconds: Math.round(speakingSeconds * 10) / 10,
      wordsPerMinute: speakingSeconds > 0 ? Math.round((timed.length / speakingSeconds) * 60) : 0,
      longPauses,
    },
  };
}

/** Runs continuous recognition over the whole recording (no 30-second / first-pause limit). */
function recognizeContinuously(recognizer, timeoutMs) {
  return new Promise((resolve) => {
    const segments = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      recognizer.stopContinuousRecognitionAsync(
        () => {
          recognizer.close();
          resolve(segments);
        },
        () => {
          recognizer.close();
          resolve(segments);
        }
      );
    };
    const timer = setTimeout(() => {
      console.warn('Azure continuous recognition timed out — using segments so far');
      finish();
    }, timeoutMs);

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) segments.push(parseRecognitionResult(e.result));
    };
    recognizer.canceled = (_s, e) => {
      if (e.reason === sdk.CancellationReason.Error) console.warn('Azure Speech canceled:', e.errorDetails);
      finish();
    };
    recognizer.sessionStopped = () => finish();
    recognizer.startContinuousRecognitionAsync(
      () => {},
      (err) => {
        console.error('Azure Speech error:', err);
        finish();
      }
    );
  });
}

/** Final result object shared by the single-shot and continuous paths. */
function buildResult({ scores, words, timing = null, language }) {
  const { accuracy, fluency, completeness, prosody } = scores;

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

  return {
    band,
    method: 'azure-speech-sdk',
    language,
    accuracy,
    fluency,
    completeness,
    prosody,
    descriptor,
    mispronounced,
    wordCount: words.length,
    words,
    ...(timing ? { timing } : {}),
  };
}

/**
 * Score pronunciation using Azure Cognitive Services Speech SDK.
 *
 * @param {Buffer} audioBuffer - WAV/WebM audio buffer
 * @param {string} transcript - The reference text the student should have said
 * @param {string} filename - Original filename (used for mime detection)
 * @param {Array} [_transcriptWords] - Unused; kept for existing callers
 * @param {Object} [options]
 * @param {string} [options.language='en-US'] - Recognition locale ('en-US' | 'en-GB' | 'de-DE')
 * @param {boolean} [options.continuous=false] - Assess the whole recording instead of
 *   only the first utterance (needed for answers longer than one sentence/pause)
 * @returns {Promise<Object|null>} Pronunciation scores or null if unavailable
 */
async function scorePronunciation(audioBuffer, transcript, filename, _transcriptWords = null, options = {}) {
  const language = sanitizeLanguage(options.language);
  const continuous = Boolean(options.continuous);
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
    speechConfig.speechRecognitionLanguage = language;

    // Configure pronunciation assessment
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      transcript,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // enable miscue detection
    );
    if (language.startsWith('en')) pronunciationConfig.enableProsodyAssessment = true;

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

    if (continuous) {
      // 16 kHz 16-bit mono: 32 000 bytes per second of audio.
      const audioSeconds = wavBuffer.length / 32000;
      const segments = await recognizeContinuously(recognizer, Math.max(30000, audioSeconds * 2000 + 20000));
      const combined = aggregateSegments(segments);
      if (!combined) {
        console.warn('Azure Speech recognized no words in the recording');
        return null;
      }
      return buildResult({ ...combined, language });
    }

    return new Promise((resolve) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close();

          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            const { scores, words } = parseRecognitionResult(result);
            // Word timings are internal for the single-shot (IELTS) path.
            const publicWords = words.map(({ offset, duration, ...w }) => w); // eslint-disable-line no-unused-vars
            resolve(buildResult({ scores, words: publicWords, language }));
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

module.exports = { scorePronunciation, aggregateSegments, sanitizeLanguage };
