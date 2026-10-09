import { useSyncExternalStore } from 'react';

/**
 * Global Prüfungsmodus / Lernmodus switch shared by all Goethe rooms.
 * 'pruefung' = strict exam conditions (official timer, no hints)
 * 'lern'     = guided mode (translations, Redemittel, pause, hints)
 */
const STORAGE_KEY = 'goethe:examMode';
const listeners = new Set();

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'pruefung' ? 'pruefung' : 'lern';
  } catch {
    return 'lern';
  }
}

let currentMode = readStored();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setExamMode(mode) {
  currentMode = mode === 'pruefung' ? 'pruefung' : 'lern';
  try {
    localStorage.setItem(STORAGE_KEY, currentMode);
  } catch {
    // storage unavailable (private mode) — keep the in-memory value
  }
  listeners.forEach((l) => l());
}

export function useExamMode() {
  const mode = useSyncExternalStore(subscribe, () => currentMode, () => 'lern');
  return { mode, isExam: mode === 'pruefung', isLearn: mode !== 'pruefung', setMode: setExamMode };
}
