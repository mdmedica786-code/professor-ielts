/**
 * Exam sounds synthesised with the Web Audio API (no audio assets needed).
 */
let ctx = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(c, freq, start, duration, gain = 0.2, type = 'sine') {
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function chord(notes, totalMs) {
  const c = getAudioContext();
  if (!c) return Promise.resolve();
  const t0 = c.currentTime + 0.05;
  notes.forEach(([freq, offset, duration, gain]) => {
    tone(c, freq, t0 + offset, duration, gain);
    tone(c, freq * 2, t0 + offset, duration * 0.5, gain * 0.2); // soft overtone
  });
  return new Promise((resolve) => setTimeout(resolve, totalMs));
}

/** Three-tone announcement gong played before a Hörtext starts. */
export function playGong() {
  return chord(
    [
      [784, 0, 1.3, 0.22],
      [659, 0.45, 1.3, 0.22],
      [523, 0.9, 1.6, 0.24],
    ],
    2400
  );
}

/** Short rising chime: "Du bist dran!" */
export function playTurnChime() {
  return chord(
    [
      [660, 0, 0.35, 0.16],
      [880, 0.14, 0.5, 0.16],
    ],
    700
  );
}

/** Two falling tones: time is over / phase ended. */
export function playEndChime() {
  return chord(
    [
      [880, 0, 0.6, 0.18],
      [587, 0.3, 0.9, 0.2],
    ],
    1300
  );
}
