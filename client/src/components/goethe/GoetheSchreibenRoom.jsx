import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { redemittelFor } from '../../data/goethe/goetheWritingRedemittel';
import { PenLine, Send, RotateCcw, Loader2, AlertCircle, AlertTriangle, BookMarked, X, Sparkles, ChevronRight } from 'lucide-react';
import ExamModeToggle from './shared/ExamModeToggle';
import ExamTimer from './shared/ExamTimer';
import { useCountdown } from './shared/useCountdown';
import ExamSetupBar from './shared/ExamSetupBar';
import ExamInstructionScreen from './shared/ExamInstructionScreen';
import BilingualInstructionBanner from './shared/BilingualInstructionBanner';
import TeilTabs from './shared/TeilTabs';
import { useExamMode } from './shared/useExamMode';
import { useGoetheFormat } from './shared/useGoetheFormat';
import { usePersistentState } from './shared/usePersistentState';
import WritingChart from './WritingChart';
import WritingEvaluation from './WritingEvaluation';

const GERMAN_CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü', '„', '“'];

const countWords = (text) => (text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);

/** Task text sent to the examiner (everything the candidate saw). */
function taskPrompt(task) {
  return [
    task.scenario,
    task.stimulus ? `Impuls: ${task.stimulus}` : '',
    task.chart ? `Grafik: ${task.chart.title} — ${task.chart.description || task.chart.data.map((d) => `${d.label}: ${d.value}`).join(', ')}` : '',
    task.instructions,
    ...(task.bulletPoints || []).map((b) => `- ${b}`),
  ]
    .filter(Boolean)
    .join('\n');
}

function WordCounter({ count, range }) {
  const [min, max] = range;
  const knockOut = Math.floor(min * 0.5);
  const tone = count < knockOut ? 'text-rose-700 bg-rose-50 border-rose-200' : count < min * 0.9 ? 'text-amber-800 bg-amber-50 border-amber-200' : count > max * 1.5 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200';
  return (
    <span className={`px-2.5 py-1 rounded-lg border text-xs font-extrabold tabular-nums ${tone}`} aria-live="polite">
      {count} / {min === max ? `ca. ${min}` : `${min}–${max}`} Wörter
    </span>
  );
}

function RedemittelDrawer({ register, level, onInsert, onClose }) {
  const categories = redemittelFor(register, level);
  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 animate-float-in" aria-label="Redemittel">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
          <BookMarked className="w-4 h-4" /> Redemittel · {register}
        </p>
        <button type="button" onClick={onClose} aria-label="Redemittel schließen" className="p-1 rounded-lg hover:bg-amber-100">
          <X className="w-4 h-4 text-amber-900" />
        </button>
      </div>
      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {categories.map((cat) => (
          <div key={cat.id}>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
              {cat.title} <span className="font-semibold normal-case text-amber-700/70">· {cat.en}</span>
            </p>
            <div className="mt-1 flex flex-col gap-1">
              {cat.phrases.map((p) => (
                <button
                  key={p.de}
                  type="button"
                  onClick={() => onInsert(p.de)}
                  title={`Einfügen · ${p.en}`}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-200/70 text-sm"
                >
                  <span className="font-semibold text-slate-900">{p.de}</span>
                  <span className="block text-[11px] text-slate-500">{p.en}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/**
 * mock: { persistKey, onComplete(result) } when the room runs inside the full
 * Modellprüfung — tasks, texts and evaluations are kept in sessionStorage.
 */
export function SchreibenExam({ level, onLevelChange, mock = null }) {
  const { saveEvaluation, studentName } = useApp();
  const { isExam, isLearn } = useExamMode();
  const { format, error: formatError } = useGoetheFormat(level);
  const schreiben = format?.schreiben;
  const pk = mock?.persistKey || null;
  const keyOf = (name) => (pk ? `${pk}:${name}` : null);

  const [topic, setTopic] = useState('');
  const [started, setStarted] = usePersistentState(keyOf('started'), false);
  const [finished, setFinished] = usePersistentState(keyOf('finished'), false);
  const [paused, setPaused] = useState(false);
  const [activeNr, setActiveNr] = usePersistentState(keyOf('activeNr'), 1);
  const [tasks, setTasks] = usePersistentState(keyOf('tasks'), {});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [essays, setEssays] = usePersistentState(keyOf('essays'), {});
  const [evaluations, setEvaluations] = usePersistentState(keyOf('evaluations'), {});
  const [evaluating, setEvaluating] = useState({});
  const [evalErrors, setEvalErrors] = useState({});
  const [showRedemittel, setShowRedemittel] = useState(false);
  const textareaRef = useRef(null);
  const inflight = useRef({});

  const aufgabe = schreiben?.aufgaben.find((a) => a.nr === activeNr);
  const task = tasks[activeNr];
  const essay = essays[activeNr] || '';
  const evaluation = evaluations[activeNr];
  const wordCount = countWords(essay);

  const moduleTotal = useMemo(() => {
    if (!schreiben) return null;
    const done = schreiben.aufgaben.filter((a) => evaluations[a.nr]);
    if (!done.length) return null;
    const points = Math.round(done.reduce((s, a) => s + (evaluations[a.nr].totalPoints || 0), 0) * 100) / 100;
    const max = finished ? 100 : done.reduce((s, a) => s + a.maxPoints, 0);
    const points100 = Math.round((points / max) * 100);
    return { points, max, points100, passed: points100 >= 60, complete: finished || done.length === schreiben.aufgaben.length };
  }, [schreiben, evaluations, finished]);

  const generate = (nr) => {
    if (inflight.current[nr]) return;
    inflight.current[nr] = true;
    setLoading((s) => ({ ...s, [nr]: true }));
    setErrors((s) => ({ ...s, [nr]: null }));
    api
      .post('/goethe/writing/generate', { level, topic, taskNumber: nr })
      .then((res) => {
        if (!res.data?.success) throw new Error(res.data?.error);
        setTasks((s) => ({ ...s, [nr]: res.data.data }));
      })
      .catch((err) =>
        setErrors((s) => ({ ...s, [nr]: err.response?.data?.error || err.message || 'Die Schreibaufgabe konnte nicht erstellt werden.' }))
      )
      .finally(() => {
        inflight.current[nr] = false;
        setLoading((s) => ({ ...s, [nr]: false }));
      });
  };

  useEffect(() => {
    if (started && schreiben && !tasks[activeNr] && !loading[activeNr] && !errors[activeNr]) generate(activeNr);
    // generate is recreated each render; the guards above prevent duplicate requests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, activeNr, schreiben, tasks, loading, errors]);

  const evaluate = async (nr) => {
    const t = tasks[nr];
    const text = essays[nr] || '';
    if (!t || !text.trim()) return null;
    setEvaluating((s) => ({ ...s, [nr]: true }));
    setEvalErrors((s) => ({ ...s, [nr]: null }));
    try {
      const res = await api.post('/goethe/evaluate-writing', {
        level,
        taskNumber: nr,
        prompt: taskPrompt(t),
        response: text,
        studentName: studentName || 'Student',
      });
      if (!res.data?.success) throw new Error(res.data?.error);
      setEvaluations((s) => ({ ...s, [nr]: res.data.data }));
      if (!mock) saveEvaluation(res.data.data, { kind: 'goethe-schreiben', module: level, question: t.title });
      return res.data.data;
    } catch (err) {
      setEvalErrors((s) => ({ ...s, [nr]: err.response?.data?.error || err.message || 'Fehler bei der Textauswertung.' }));
      return null;
    } finally {
      setEvaluating((s) => ({ ...s, [nr]: false }));
    }
  };

  const submitAll = async () => {
    if (!schreiben || finished) return;
    const pending = schreiben.aufgaben.filter((a) => !evaluations[a.nr] && (essays[a.nr] || '').trim() && tasks[a.nr]);
    await Promise.all(pending.map((a) => evaluate(a.nr)));
    setFinished(true);
  };

  const timer = useCountdown((schreiben?.timeMinutes || 60) * 60, {
    running: started && !finished && !(isLearn && paused),
    onExpire: () => {
      if (isExam) submitAll();
    },
    persistKey: keyOf('timer'),
  });

  // Inside the Modellprüfung: hand the module result to the exam shell.
  useEffect(() => {
    if (!mock || !finished) return;
    mock.onComplete(moduleTotal ? { points100: moduleTotal.points100, passed: moduleTotal.passed, points: moduleTotal.points } : { points100: 0, passed: false, points: 0 });
    // Report once per finished module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const start = () => {
    timer.reset((schreiben?.timeMinutes || 60) * 60);
    setStarted(true);
    setActiveNr(1);
  };

  const restart = () => {
    setTasks({});
    setErrors({});
    setEssays({});
    setEvaluations({});
    setEvalErrors({});
    setStarted(false);
    setFinished(false);
  };

  const setEssay = (text) => setEssays((s) => ({ ...s, [activeNr]: text }));

  const insertAtCursor = (snippet) => {
    const el = textareaRef.current;
    if (!el) return setEssay(essay + snippet);
    const start = el.selectionStart ?? essay.length;
    const end = el.selectionEnd ?? essay.length;
    const needsSpace = start > 0 && !/\s$/.test(essay.slice(0, start)) && snippet.length > 1;
    const insert = (needsSpace ? ' ' : '') + snippet;
    setEssay(essay.slice(0, start) + insert + essay.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  if (formatError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> {formatError}
      </div>
    );
  }
  if (!schreiben) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Prüfungsformat wird geladen …
      </div>
    );
  }

  const tabs = schreiben.aufgaben.map((a) => ({
    key: a.nr,
    label: `Aufgabe ${a.nr}`,
    title: `${a.label} · ${a.maxPoints} P.`,
    status: evaluations[a.nr] ? 'done' : loading[a.nr] || evaluating[a.nr] ? 'loading' : 'idle',
  }));

  const [minW] = aufgabe?.words || [0];
  const belowKnockout = wordCount > 0 && wordCount < Math.floor(minW * 0.5);
  const locked = Boolean(evaluation) || finished;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <PenLine className="w-3.5 h-3.5" /> Goethe-Zertifikat {level} · Schreiben
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">Schriftlicher Ausdruck</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExamModeToggle locked={Boolean(mock) || (started && !finished)} />
          {started && (
            <ExamTimer secondsLeft={timer.secondsLeft} running={!paused && !finished} canPause={isLearn && !finished} onToggle={() => setPaused((p) => !p)} />
          )}
          {started && !finished && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Alle Aufgaben jetzt abgeben und bewerten lassen?')) submitAll();
              }}
              disabled={Object.values(evaluating).some(Boolean)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {Object.values(evaluating).some(Boolean) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Abgeben
            </button>
          )}
          {started && !mock && (
            <button type="button" onClick={restart} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Neu
            </button>
          )}
        </div>
      </div>

      {!started ? (
        <>
          {!mock && <ExamSetupBar level={level} onLevelChange={onLevelChange} topic={topic} onTopicChange={setTopic} />}
          <ExamInstructionScreen
            level={level}
            moduleName="Schreiben"
            timeMinutes={schreiben.timeMinutes}
            parts={schreiben.aufgaben.map((a) => ({
              key: a.nr,
              label: `Aufgabe ${a.nr}`,
              title: a.label,
              detail: `${a.words[0] === a.words[1] ? `ca. ${a.words[0]}` : `${a.words[0]}–${a.words[1]}`} Wörter · ${a.maxPoints} Punkte · ~${a.timeHintMinutes} Min.`,
            }))}
            rules={[
              `${schreiben.aufgaben.length} Aufgaben, ${schreiben.timeMinutes} Minuten, zusammen 100 Punkte.`,
              'Bearbeiten Sie alle Leitpunkte und achten Sie auf Textsorte und Register.',
              'Unter 50 % der Mindestwortzahl wird die Aufgabe mit 0 Punkten bewertet (Band E).',
              isExam ? 'Prüfungsmodus: keine Hilfen, Bewertung erst bei der Abgabe.' : 'Lernmodus: Redemittel, Übersetzungen und sofortige Bewertung pro Aufgabe.',
            ]}
            onStart={start}
          />
        </>
      ) : (
        <>
          {moduleTotal && (finished || moduleTotal.complete) && (
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ergebnis · Schreiben {level}</p>
                <p className="text-3xl font-extrabold tabular-nums">
                  {moduleTotal.points100} <span className="text-base text-slate-300">/ 100 Punkte</span>
                </p>
              </div>
              <span className={`px-4 py-2 rounded-xl text-sm font-extrabold ${moduleTotal.passed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                {moduleTotal.passed ? getPraedikat(moduleTotal.points100).label : 'Nicht bestanden'}
              </span>
            </div>
          )}

          <TeilTabs items={tabs} activeKey={activeNr} onChange={(k) => setActiveNr(k)} />

          {errors[activeNr] && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-wrap items-center gap-3">
              <AlertCircle className="w-4 h-4" /> {errors[activeNr]}
              <button type="button" onClick={() => generate(activeNr)} className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold">
                Erneut versuchen
              </button>
            </div>
          )}

          {!task && !errors[activeNr] && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 flex flex-col items-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <p className="text-sm font-semibold">Aufgabe {activeNr} wird erstellt …</p>
            </div>
          )}

          {task && aufgabe && (
            <div className="grid gap-5 lg:grid-cols-[2fr_3fr] items-start">
              {/* Task sheet */}
              <section className="flex flex-col gap-4 lg:sticky lg:top-4">
                <BilingualInstructionBanner level={level} module="schreiben" teil={aufgabe.nr} title={aufgabe.label} instruction={task.instructions} />
                <div className="rounded-2xl border border-slate-300 bg-[#fffef9] p-5 flex flex-col gap-3">
                  <p className="text-[15px] text-slate-800 leading-relaxed">{task.scenario}</p>
                  {task.stimulus && (
                    <blockquote className="border-l-4 border-sky-400 bg-white rounded-r-xl px-4 py-3 text-sm text-slate-700 italic leading-relaxed">{task.stimulus}</blockquote>
                  )}
                  {task.chart && <WritingChart chart={task.chart} />}
                  {task.bulletPoints?.length > 0 && (
                    <ul className="space-y-1.5">
                      {task.bulletPoints.map((b) => (
                        <li key={b} className="flex gap-2 text-sm font-semibold text-slate-900">
                          <span className="text-sky-600">▸</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                    Register: {aufgabe.register} · Richtzeit ~{aufgabe.timeHintMinutes} Min. · max. {aufgabe.maxPoints} Punkte
                  </p>
                </div>
                {isLearn && (task.sampleStarters?.length > 0 || task.rubricHighlight) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Hinweise
                    </p>
                    {task.rubricHighlight && <p className="text-amber-900">{task.rubricHighlight}</p>}
                    {task.sampleStarters?.map((s) => (
                      <button key={s} type="button" disabled={locked} onClick={() => insertAtCursor(s)} className="block text-left text-slate-800 hover:underline">
                        „{s}“
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Editor & feedback */}
              <section className="flex flex-col gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <WordCounter count={wordCount} range={aufgabe.words} />
                    <div className="flex flex-wrap items-center gap-1">
                      {GERMAN_CHARS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          disabled={locked}
                          onClick={() => insertAtCursor(c)}
                          className="w-7 h-7 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm font-bold text-slate-700"
                        >
                          {c}
                        </button>
                      ))}
                      {isLearn && !locked && (
                        <button
                          type="button"
                          onClick={() => setShowRedemittel((v) => !v)}
                          aria-pressed={showRedemittel}
                          className="ml-1 px-2.5 h-7 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 flex items-center gap-1"
                        >
                          <BookMarked className="w-3.5 h-3.5" /> Redemittel
                        </button>
                      )}
                    </div>
                  </div>

                  {belowKnockout && !locked && (
                    <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      Unter 50 % der Mindestwortzahl ({Math.floor(minW * 0.5)} Wörter) führt zum Abbruch der Aufgabe (Band E = 0 Punkte).
                    </p>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={essay}
                    readOnly={locked}
                    onChange={(e) => setEssay(e.target.value)}
                    spellCheck={false}
                    lang="de"
                    rows={14}
                    placeholder="Schreiben Sie hier Ihren Text …"
                    aria-label={`Text für Aufgabe ${aufgabe.nr}`}
                    className="w-full p-4 rounded-xl border border-slate-300 text-[15px] leading-relaxed text-slate-900 font-serif resize-y focus:outline-none focus:ring-2 focus:ring-sky-400 read-only:bg-slate-50"
                  />

                  {evalErrors[activeNr] && <p className="text-sm text-rose-700 font-semibold">{evalErrors[activeNr]}</p>}

                  <div className="flex flex-wrap justify-end gap-2">
                    {isLearn && !locked && (
                      <button
                        type="button"
                        onClick={() => evaluate(activeNr)}
                        disabled={!essay.trim() || evaluating[activeNr]}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {evaluating[activeNr] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {evaluating[activeNr] ? 'Prüfer bewertet …' : `Aufgabe ${aufgabe.nr} bewerten lassen`}
                      </button>
                    )}
                    {schreiben.aufgaben.some((a) => a.nr === activeNr + 1) && (
                      <button
                        type="button"
                        onClick={() => setActiveNr(activeNr + 1)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5"
                      >
                        Weiter zu Aufgabe {activeNr + 1} <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {showRedemittel && isLearn && !locked && (
                  <RedemittelDrawer register={aufgabe.register} level={level} onInsert={insertAtCursor} onClose={() => setShowRedemittel(false)} />
                )}

                {evaluating[activeNr] && !evaluation && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-3 text-sm text-slate-600">
                    <Loader2 className="w-5 h-5 animate-spin text-sky-600" /> Die Prüferin liest Ihren Text und vergibt Bänder A–E …
                  </div>
                )}
                {evaluation && <WritingEvaluation evaluation={evaluation} essay={essay} />}
                {finished && !evaluation && (
                  <p className="text-sm text-slate-500">Zu dieser Aufgabe wurde kein Text abgegeben (0 Punkte).</p>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function GoetheSchreibenRoom() {
  const { goetheLevel, setGoetheLevel } = useApp();
  const level = ['A2', 'B1', 'B2', 'C1'].includes(goetheLevel) ? goetheLevel : 'B1';
  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-7xl mx-auto text-left animate-float-in">
      <SchreibenExam key={level} level={level} onLevelChange={setGoetheLevel} />
    </div>
  );
}
