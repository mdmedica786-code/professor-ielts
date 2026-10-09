import { useCallback, useRef, useState } from 'react';
import api from '../../../api/client';
import { usePersistentState } from './usePersistentState';

const ENDPOINTS = {
  lesen: { generate: '/goethe/reading/generate', evaluate: '/goethe/reading/evaluate' },
  hoeren: { generate: '/goethe/listening/generate', evaluate: '/goethe/listening/evaluate' },
};

/**
 * Per-Teil state for a receptive module (Lesen / Hören): on-demand
 * generation, answers, flags, per-Teil evaluation and module totals.
 * With `persistKey` (mock exam) tests, answers, flags and results survive a
 * refresh; Hörtext audio is not stored (too large), so a restored Hören Teil
 * falls back to browser speech.
 */
const withoutAudio = (tests) =>
  Object.fromEntries(Object.entries(tests).map(([k, t]) => [k, t ? { ...t, audioData: null } : t]));

export function useReceptiveExam(module, level, { persistKey = null } = {}) {
  const key = (name) => (persistKey ? `${persistKey}:${name}` : null);
  const [tests, setTests] = usePersistentState(key('tests'), {}, { serialize: withoutAudio });
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [answers, setAnswers] = usePersistentState(key('answers'), {});
  const [flags, setFlags] = usePersistentState(key('flags'), {});
  const [results, setResults] = usePersistentState(key('results'), {});
  const [submitting, setSubmitting] = useState(false);
  const inflight = useRef({});
  const generation = useRef(0);

  const generate = useCallback(
    async (teil, topic) => {
      if (inflight.current[teil]) return inflight.current[teil];
      const gen = generation.current;
      setLoading((s) => ({ ...s, [teil]: true }));
      setErrors((s) => ({ ...s, [teil]: null }));
      const request = api
        .post(ENDPOINTS[module].generate, { level, topic, partNumber: teil })
        .then((res) => {
          if (gen !== generation.current) return null;
          if (!res.data?.success) throw new Error(res.data?.error || 'Fehler beim Erstellen des Prüfungsteils.');
          setTests((s) => ({ ...s, [teil]: res.data.data }));
          return res.data.data;
        })
        .catch((err) => {
          if (gen === generation.current) {
            setErrors((s) => ({ ...s, [teil]: err.response?.data?.error || err.message || 'Verbindung zum Server fehlgeschlagen.' }));
          }
          return null;
        })
        .finally(() => {
          delete inflight.current[teil];
          if (gen === generation.current) setLoading((s) => ({ ...s, [teil]: false }));
        });
      inflight.current[teil] = request;
      return request;
    },
    [module, level, setTests]
  );

  const setAnswer = useCallback(
    (teil, number, value) => {
      setAnswers((s) => ({ ...s, [teil]: { ...(s[teil] || {}), [number]: value } }));
    },
    [setAnswers]
  );

  const toggleFlag = useCallback(
    (teil, number) => {
      setFlags((s) => ({ ...s, [teil]: { ...(s[teil] || {}), [number]: !s[teil]?.[number] } }));
    },
    [setFlags]
  );

  const evaluateTeil = useCallback(
    async (teil, test, teilAnswers) => {
      const res = await api.post(ENDPOINTS[module].evaluate, { token: test.token, answers: teilAnswers || {}, level });
      if (!res.data?.success) throw new Error(res.data?.error || 'Fehler bei der Auswertung.');
      setResults((s) => ({ ...s, [teil]: res.data.data }));
      return res.data.data;
    },
    [module, level, setResults]
  );

  /** Evaluates the given Teile that are loaded and not yet evaluated. */
  const submit = useCallback(
    async (teile) => {
      setSubmitting(true);
      try {
        const pending = teile.filter((t) => tests[t] && !results[t]);
        const out = await Promise.all(pending.map((t) => evaluateTeil(t, tests[t], answers[t])));
        return out;
      } finally {
        setSubmitting(false);
      }
    },
    [tests, results, answers, evaluateTeil]
  );

  const reset = useCallback(() => {
    generation.current += 1;
    inflight.current = {};
    setTests({});
    setLoading({});
    setErrors({});
    setAnswers({});
    setFlags({});
    setResults({});
  }, [setTests, setAnswers, setFlags, setResults]);

  return { tests, loading, errors, answers, flags, results, submitting, generate, setAnswer, toggleFlag, submit, reset };
}

/**
 * Module totals from per-Teil results, using the official Bestehensgrenze.
 * With `final`, Teile that were never answered count as 0 of their items
 * (as on the real answer sheet).
 */
export function summarizeModule(moduleFormat, results, { final = false } = {}) {
  if (!moduleFormat) return null;
  const done = moduleFormat.parts.filter((p) => results[p.teil]);
  if (!done.length && !final) return null;
  const raw = done.reduce((s, p) => s + (results[p.teil].correctCount || 0), 0);
  const maxRaw = final ? moduleFormat.maxRaw : done.reduce((s, p) => s + p.count, 0);
  const complete = final || done.length === moduleFormat.parts.length;
  const points100 = maxRaw ? Math.round((raw / maxRaw) * 100) : 0;
  const passRaw = complete ? moduleFormat.passRaw : Math.ceil((moduleFormat.passRaw / moduleFormat.maxRaw) * maxRaw);
  return { raw, maxRaw, points100, passRaw, complete, passed: points100 >= 60 && raw >= passRaw, teileDone: done.length };
}
