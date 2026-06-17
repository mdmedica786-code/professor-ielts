import axios from 'axios';

// API base resolution:
//  - Web dev:   VITE_API_BASE_URL is unset -> "/api" (Vite proxies to :3001).
//  - Mobile/APK: VITE_API_BASE_URL is the hosted backend ORIGIN (no trailing
//    "/api"), e.g. https://professor-ielts-api.onrender.com. We append "/api".
// The OpenAI key lives ONLY on that backend — it is never shipped in the app.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = RAW_BASE ? `${RAW_BASE.replace(/\/+$/, '')}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 180000, // 3 min — evaluation pipeline can take time
});

/**
 * Transcribe audio via OpenAI Whisper (server-side).
 * @param {File|Blob} audioFile
 */
export async function transcribeAudio(audioFile) {
  const form = new FormData();
  form.append('audio', audioFile);
  const { data } = await api.post('/transcribe', form);
  return data;
}

/**
 * Full IELTS evaluation — audio or text mode.
 * @param {Object} params
 * @param {File|Blob|null} params.audioFile
 * @param {string} params.transcript (used if no audioFile)
 * @param {string} params.questionText
 * @param {number} params.questionPart
 * @param {string} params.studentName
 */
export async function evaluateSpeaking({
  audioFile,
  transcript,
  questionText,
  questionPart,
  studentName,
}) {
  const form = new FormData();
  if (audioFile) {
    form.append('audio', audioFile);
  }
  if (transcript) {
    form.append('transcript', transcript);
  }
  form.append('questionText', questionText || 'General question');
  form.append('questionPart', String(questionPart || 1));
  form.append('studentName', studentName || 'Student');
  const { data } = await api.post('/evaluate', form);
  return data;
}

/**
 * Generate IELTS questions for a topic.
 * @param {string} topic
 */
export async function generatePrompts(topic) {
  const { data } = await api.post('/generate-prompts', { topic });
  return data;
}

/**
 * Grade an IELTS Writing response on TR/CC/LR/GRA.
 * @param {Object} params
 * @param {string} params.module    'academic' | 'general'
 * @param {number} params.taskType  1 | 2
 * @param {string} params.prompt    the task prompt
 * @param {string} params.essay     the student's written response
 * @param {string} params.studentName
 */
export async function evaluateWriting({ module, taskType, prompt, essay, studentName }) {
  const { data } = await api.post('/evaluate-writing', {
    module: module || 'academic',
    taskType: taskType || 2,
    prompt: prompt || '',
    essay: essay || '',
    studentName: studentName || 'Student',
  });
  return data;
}

/**
 * Generate a reading passage + question set (optionally from a supplied passage).
 * @param {Object} params { module, difficulty, topic, passage, questionsHint, count }
 */
export async function generateReading(params) {
  const { data } = await api.post('/reading/generate', params);
  return data;
}

/**
 * Mark a reading attempt. Send back the opaque token from generateReading plus
 * a { questionId: answer } map.
 * @param {Object} params { token, answers, studentName }
 */
export async function evaluateReading({ token, answers, studentName }) {
  const { data } = await api.post('/reading/evaluate', {
    token,
    answers: answers || {},
    studentName: studentName || 'Student',
  });
  return data;
}

/**
 * Generate an IELTS Listening test (full 4-section or single 10-Q section).
 * The server runs TTS for every utterance — expect ~30–90s for a single
 * section and several minutes for a full test, depending on length.
 * @param {Object} params { size, whichSection, topic, difficulty }
 */
export async function generateListening(params) {
  const { data } = await api.post('/listening/generate', params);
  return data;
}

/**
 * Mark a listening attempt. Send back the opaque token from generateListening
 * plus a { questionId: answer } map.
 * @param {Object} params { token, answers, studentName }
 */
export async function evaluateListening({ token, answers, studentName }) {
  const { data } = await api.post('/listening/evaluate', {
    token,
    answers: answers || {},
    studentName: studentName || 'Student',
  });
  return data;
}

/**
 * Health check.
 */
export async function healthCheck() {
  const { data } = await api.get('/health');
  return data;
}

export default api;
