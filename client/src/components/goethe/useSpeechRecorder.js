import { useEffect, useRef, useState } from 'react';

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
}

/**
 * Push-to-talk recorder. While recording, the browser's speech recognition
 * (where available) shows live German captions; the authoritative transcript
 * comes from Whisper on the server after stop().
 * stop() resolves with { blob, filename, url } (url for later playback).
 */
export function useSpeechRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [liveCaption, setLiveCaption] = useState('');
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const resolveRef = useRef(null);

  const cleanup = () => {
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      // already stopped
    }
    recognitionRef.current = null;
  };

  useEffect(() => cleanup, []);

  const start = async () => {
    setError(null);
    setLiveCaption('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const filename = type.includes('mp4') ? 'antwort.m4a' : 'antwort.webm';
        cleanup();
        resolveRef.current?.({ blob, filename, url: URL.createObjectURL(blob) });
        resolveRef.current = null;
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = 'de-DE';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          let text = '';
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
          setLiveCaption(text);
        };
        rec.onerror = () => {};
        try {
          rec.start();
          recognitionRef.current = rec;
        } catch {
          // live captions are optional
        }
      }
    } catch {
      cleanup();
      setError('Mikrofonzugriff nicht möglich. Bitte erlauben Sie den Zugriff im Browser oder nutzen Sie die Texteingabe.');
    }
  };

  const stop = () =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      setRecording(false);
      if (!recorder || recorder.state === 'inactive') return resolve(null);
      resolveRef.current = resolve;
      recorder.stop();
    });

  return { recording, seconds, liveCaption, error, start, stop };
}
