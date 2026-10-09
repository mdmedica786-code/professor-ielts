import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { ClipboardCheck, Coffee, Printer, PlayCircle, XCircle, CheckCircle2, Loader2, Clock, RotateCcw } from 'lucide-react';
import { LesenExam } from './GoetheLesenRoom';
import { HoerenExam } from './GoetheHoerenRoom';
import { SchreibenExam } from './GoetheSchreibenRoom';
import { SprechenExam } from './GoetheSprechenRoom';
import { useGoetheFormat } from './shared/useGoetheFormat';
import { usePersistentState, clearPersisted } from './shared/usePersistentState';
import { setExamMode } from './shared/useExamMode';
import { formatClock } from './shared/useCountdown';
import { playEndChime } from './shared/examSounds';

const STATE_KEY = 'goethe:mock:state';
const MODULE_PREFIX = 'goethe:mock:m:';
const PAUSE_MINUTES = 15;
const LEVELS = ['A2', 'B1', 'B2', 'C1'];

const MODULES = {
  lesen: { label: 'Lesen', Component: LesenExam },
  hoeren: { label: 'Hören', Component: HoerenExam },
  schreiben: { label: 'Schreiben', Component: SchreibenExam },
  sprechen: { label: 'Sprechen', Component: SprechenExam },
};
const SEQUENCE = ['lesen', 'hoeren', 'pause', 'schreiben', 'sprechen', 'report'];
const INITIAL = { step: 'intro', level: null, results: {}, pauseEndsAt: null, startedAt: null, saved: false };

const clock = () => Date.now();
const nextStep = (step) => SEQUENCE[SEQUENCE.indexOf(step) + 1] || 'report';

function praedikatFor(result) {
  if (!result || !result.passed) return 'Nicht bestanden';
  return getPraedikat(result.points100).label.replace(' (Bestanden)', '');
}

function Stepper({ step, results }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Prüfungsablauf">
      {SEQUENCE.filter((s) => s !== 'report').map((s, i) => {
        const done = s === 'pause' ? SEQUENCE.indexOf(step) > SEQUENCE.indexOf('pause') : Boolean(results[s]);
        const active = s === step;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className="w-4 h-px bg-slate-300" aria-hidden="true" />}
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                active ? 'bg-slate-900 text-white border-slate-900' : done ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white text-slate-500 border-slate-200'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              {done && !active && <CheckCircle2 className="w-3.5 h-3.5" />}
              {s === 'pause' ? 'Pause' : MODULES[s].label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function PauseScreen({ endsAt, onDone }) {
  const [now, setNow] = useState(clock);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      const t = clock();
      setNow(t);
      if (t >= endsAt) {
        clearInterval(id);
        playEndChime();
        doneRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const left = Math.max(0, Math.round((endsAt - now) / 1000));
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-card p-10 flex flex-col items-center gap-4 text-center">
      <Coffee className="w-12 h-12 text-amber-500" />
      <h2 className="text-2xl font-extrabold text-slate-900">Pause vor dem Modul Schreiben</h2>
      <p className="text-slate-600 max-w-lg">
        Lesen und Hören sind abgeschlossen. Wie in der echten Prüfung haben Sie jetzt {PAUSE_MINUTES} Minuten Pause. Danach beginnt das Modul Schreiben.
      </p>
      <p className="font-mono text-5xl font-extrabold tabular-nums text-slate-900" role="timer" aria-label={`Restliche Pause ${formatClock(left)}`}>
        {formatClock(left)}
      </p>
      <button type="button" onClick={onDone} className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold">
        <PlayCircle className="w-4 h-4" /> Pause beenden und mit Schreiben beginnen
      </button>
    </div>
  );
}

function FinalReport({ level, results, startedAt, candidateName, onRestart }) {
  const modules = ['lesen', 'hoeren', 'schreiben', 'sprechen'];
  const total = modules.reduce((s, m) => s + (results[m]?.points100 || 0), 0);
  const allPassed = modules.every((m) => results[m]?.passed);
  const overall = allPassed ? getPraedikat(total / 4).label.replace(' (Bestanden)', '') : 'Nicht bestanden';
  const date = new Date(startedAt || clock()).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });

  const print = () => {
    document.body.classList.add('printing-certificate');
    const cleanup = () => {
      document.body.classList.remove('printing-certificate');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="print-area rounded-3xl border-2 border-slate-800 bg-[#fffef9] p-6 md:p-10 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500">Ergebnisbericht · Modellprüfung</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">Goethe-Zertifikat {level} — Übungsprüfung</h2>
          </div>
          <div className="text-right text-sm text-slate-700">
            <p>
              <span className="font-bold">Kandidat/in:</span> {candidateName || '—'}
            </p>
            <p>
              <span className="font-bold">Datum:</span> {date}
            </p>
          </div>
        </div>

        <table className="w-full mt-6 text-sm md:text-base">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-300">
              <th className="py-2 font-bold">Modul</th>
              <th className="py-2 font-bold text-right">Punkte</th>
              <th className="py-2 font-bold pl-6">Prädikat</th>
              <th className="py-2 font-bold text-right">Ergebnis</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => {
              const r = results[m];
              return (
                <tr key={m} className="border-b border-slate-200">
                  <td className="py-3 font-bold text-slate-900">{MODULES[m].label}</td>
                  <td className="py-3 text-right font-mono font-bold tabular-nums">{r ? r.points100 : 0} / 100</td>
                  <td className="py-3 pl-6 text-slate-800">{praedikatFor(r)}</td>
                  <td className={`py-3 text-right font-bold ${r?.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                    <span className="inline-flex items-center gap-1">
                      {r?.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {r?.passed ? 'bestanden' : 'nicht bestanden'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 font-extrabold text-slate-900">Gesamt</td>
              <td className="pt-4 text-right font-mono font-extrabold tabular-nums">{total} / 400</td>
              <td className="pt-4 pl-6 font-extrabold text-slate-900">{overall}</td>
              <td className={`pt-4 text-right font-extrabold ${allPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
                {allPassed ? 'Alle Module bestanden' : 'Nicht alle Module bestanden'}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 grid gap-3 md:grid-cols-2 text-xs text-slate-600">
          <p>
            Bewertung: Jedes Modul wird mit 0–100 Punkten bewertet und ist ab 60 Punkten bestanden (Lesen und Hören zusätzlich mit der
            Mindestzahl richtiger Aufgaben). Prädikate: 90–100 sehr gut · 80–89 gut · 70–79 befriedigend · 60–69 ausreichend · unter 60 nicht
            bestanden.
          </p>
          <p className="font-semibold text-slate-700">
            Übungsergebnis dieser App mit KI-Bewertung. Dies ist kein offizielles Zertifikat und keine Prüfungsleistung des Goethe-Instituts.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 no-print">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold">
          <RotateCcw className="w-4 h-4" /> Neue Modellprüfung
        </button>
        <button type="button" onClick={print} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold">
          <Printer className="w-4 h-4" /> Drucken / als PDF speichern
        </button>
      </div>
    </div>
  );
}

/**
 * Vollständige Modellprüfung: Lesen → Hören → 15 min Pause → Schreiben →
 * Sprechen, always in Prüfungsmodus, with progress kept in sessionStorage,
 * then one Ergebnisbericht over all four modules.
 */
export default function GoetheFullMockExam() {
  const { goetheLevel, setGoetheLevel, saveEvaluation, studentName } = useApp();
  const [state, setState] = usePersistentState(STATE_KEY, INITIAL);
  const level = state.level || (LEVELS.includes(goetheLevel) ? goetheLevel : 'B1');
  const { format } = useGoetheFormat(level);

  // Save the overall result once.
  useEffect(() => {
    if (state.step !== 'report' || state.saved) return;
    const modules = ['lesen', 'hoeren', 'schreiben', 'sprechen'];
    const total = modules.reduce((s, m) => s + (state.results[m]?.points100 || 0), 0);
    saveEvaluation(
      {
        kind: 'goethe-modellpruefung',
        level: state.level,
        totalPoints400: total,
        passed: modules.every((m) => state.results[m]?.passed),
        modules: state.results,
      },
      { kind: 'goethe-modellpruefung', module: state.level, question: `Goethe Modellprüfung ${state.level}` }
    );
    setState((s) => ({ ...s, saved: true }));
  }, [state.step, state.saved, state.results, state.level, saveEvaluation, setState]);

  const start = () => {
    clearPersisted(MODULE_PREFIX);
    setExamMode('pruefung');
    setState({ ...INITIAL, step: 'lesen', level, startedAt: clock() });
  };

  const abort = () => {
    if (!window.confirm('Modellprüfung wirklich abbrechen? Alle Antworten gehen verloren.')) return;
    clearPersisted('goethe:mock:');
    setState(INITIAL);
  };

  const completeModule = (module, result) => {
    setState((s) => {
      if (s.step !== module) return s;
      const step = nextStep(module);
      return {
        ...s,
        results: { ...s.results, [module]: result },
        step,
        pauseEndsAt: step === 'pause' ? clock() + PAUSE_MINUTES * 60 * 1000 : s.pauseEndsAt,
      };
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restart = () => {
    clearPersisted('goethe:mock:');
    setState(INITIAL);
  };

  const inProgress = state.step !== 'intro' && state.step !== 'report';
  const Module = MODULES[state.step]?.Component;

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-7xl mx-auto text-left flex flex-col gap-5 animate-float-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
            <ClipboardCheck className="w-3.5 h-3.5" /> Vollständige Modellprüfung · {level}
          </span>
          {state.step !== 'intro' && <div className="mt-2"><Stepper step={state.step} results={state.results} /></div>}
        </div>
        {inProgress && (
          <button type="button" onClick={abort} className="self-start px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> Prüfung abbrechen
          </button>
        )}
      </div>

      {state.step === 'intro' && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-6">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-300">Goethe-Zertifikat · Simulation unter Prüfungsbedingungen</p>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-1">Vollständige Modellprüfung</h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl">
              Alle vier Module nacheinander wie am Prüfungstag, im Prüfungsmodus ohne Hilfen. Am Ende erhalten Sie einen Ergebnisbericht mit Punkten und Prädikaten.
            </p>
          </div>
          <div className="p-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-slate-600 mb-2">Niveaustufe</p>
              <div className="flex gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setGoetheLevel(l)}
                    aria-pressed={level === l}
                    className={`px-4 py-2 rounded-xl text-sm font-extrabold border ${level === l ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 mt-6 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" /> Ablauf
              </h2>
              {format ? (
                <ol className="space-y-2 text-sm">
                  {[
                    ['1', 'Lesen', `${format.lesen.timeMinutes} Min.`],
                    ['2', 'Hören', `ca. ${format.hoeren.timeMinutes} Min.`],
                    ['', 'Pause', `${PAUSE_MINUTES} Min.`],
                    ['3', 'Schreiben', `${format.schreiben.timeMinutes} Min.`],
                    ['4', 'Sprechen', `${format.sprechen.prepMinutes ? `${format.sprechen.prepMinutes} Min. Vorbereitung + ` : ''}ca. ${format.sprechen.timeMinutes} Min. Paarprüfung`],
                  ].map(([n, name, time]) => (
                    <li key={name} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold flex items-center justify-center">{n || '–'}</span>
                      <span className="font-bold text-slate-900 w-24">{name}</span>
                      <span className="text-slate-600">{time}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Format wird geladen …
                </p>
              )}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 mb-3">Wichtige Hinweise</h2>
              <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
                <li>Die Prüfung läuft im Prüfungsmodus: kein Pausieren der Timer, keine Übersetzungen oder Hinweise.</li>
                <li>Jedes Modul wird bei Ablauf der Zeit automatisch abgegeben. Ein abgegebenes Modul kann nicht wiederholt werden.</li>
                <li>Ergebnisse sehen Sie erst im Ergebnisbericht am Ende.</li>
                <li>Ihr Fortschritt bleibt erhalten, wenn Sie die Seite neu laden (in diesem Browser-Tab). Die Timer laufen nicht weiter, solange die Seite geschlossen ist. Bereits erzeugte Hörtexte werden nach dem Neuladen mit der Browser-Sprachausgabe abgespielt.</li>
                <li>Für Hören und Sprechen brauchen Sie Kopfhörer und ein Mikrofon.</li>
              </ul>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={start}
              disabled={!format}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-md disabled:opacity-60"
            >
              <PlayCircle className="w-5 h-5" /> Modellprüfung {level} starten
            </button>
          </div>
        </div>
      )}

      {Module && (
        <Module
          key={state.step}
          level={level}
          onLevelChange={() => {}}
          mock={{ persistKey: `${MODULE_PREFIX}${state.step}`, onComplete: (result) => completeModule(state.step, result) }}
        />
      )}

      {state.step === 'pause' && <PauseScreen endsAt={state.pauseEndsAt || clock()} onDone={() => setState((s) => (s.step === 'pause' ? { ...s, step: 'schreiben' } : s))} />}

      {state.step === 'report' && (
        <FinalReport level={level} results={state.results} startedAt={state.startedAt} candidateName={studentName} onRestart={restart} />
      )}
    </div>
  );
}
