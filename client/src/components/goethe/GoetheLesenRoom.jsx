import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { BookOpenText, Send, RotateCcw, Loader2, AlertCircle, ChevronRight, FileSpreadsheet, CheckCheck } from 'lucide-react';
import ExamModeToggle from './shared/ExamModeToggle';
import ExamTimer from './shared/ExamTimer';
import { useCountdown } from './shared/useCountdown';
import ExamSetupBar from './shared/ExamSetupBar';
import ExamInstructionScreen from './shared/ExamInstructionScreen';
import BilingualInstructionBanner from './shared/BilingualInstructionBanner';
import TeilTabs from './shared/TeilTabs';
import QuestionPalette from './shared/QuestionPalette';
import QuestionRenderer from './shared/QuestionRenderer';
import AnswerSheet from './shared/AnswerSheet';
import ModuleResultCard from './shared/ModuleResultCard';
import { HighlighterToolbar } from './shared/TextHighlighter';
import { useExamMode } from './shared/useExamMode';
import { useGoetheFormat } from './shared/useGoetheFormat';
import { useReceptiveExam, summarizeModule } from './shared/useReceptiveExam';
import ReadingDocument from './ReadingDocument';

const SHOWN_IN_DOCUMENT = new Set(['lueckentext_woerter', 'lueckentext_saetze']);

function LesenExam({ level, onLevelChange }) {
  const { saveEvaluation } = useApp();
  const { isExam, isLearn } = useExamMode();
  const { format, error: formatError } = useGoetheFormat(level);
  const lesen = format?.lesen;
  const exam = useReceptiveExam('lesen', level);

  const [topic, setTopic] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeTeil, setActiveTeil] = useState(1);
  const [showSheet, setShowSheet] = useState(false);
  const [highlights, setHighlights] = useState({});
  const [tool, setTool] = useState('yellow');

  const part = lesen?.parts.find((p) => p.teil === activeTeil);
  const test = exam.tests[activeTeil];
  const teilAnswers = exam.answers[activeTeil] || {};
  const teilResult = exam.results[activeTeil];
  const summary = useMemo(() => summarizeModule(lesen, exam.results, { final: finished }), [lesen, exam.results, finished]);

  const handleSubmitAll = async () => {
    if (!lesen || finished) return;
    const teile = lesen.parts.map((p) => p.teil);
    try {
      await exam.submit(teile);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Fehler bei der Auswertung.');
      return;
    }
    setFinished(true);
    setShowSheet(false);
  };

  const timer = useCountdown((lesen?.timeMinutes || 60) * 60, {
    running: started && !finished && !(isLearn && paused),
    onExpire: () => {
      if (isExam) handleSubmitAll();
    },
  });

  // Persist the module result once all Teile are evaluated.
  useEffect(() => {
    if (!finished || !summary) return;
    saveEvaluation(
      {
        kind: 'goethe-lesen',
        level,
        rawScore: summary.raw,
        maxRaw: summary.maxRaw,
        scaledPoints100: summary.points100,
        praedikat: summary.passed ? getPraedikat(summary.points100).label : 'Nicht bestanden',
        passed: summary.passed,
      },
      { kind: 'goethe-lesen', module: level, question: `Goethe Lesen ${level}` }
    );
    // Save once per finished exam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Generate the active Teil on demand and prefetch the next one.
  useEffect(() => {
    if (!started || !lesen) return;
    const { tests, loading, errors, generate } = exam;
    if (!tests[activeTeil] && !loading[activeTeil] && !errors[activeTeil]) generate(activeTeil, topic);
    const next = lesen.parts.find((p) => p.teil === activeTeil + 1);
    if (tests[activeTeil] && next && !tests[next.teil] && !loading[next.teil] && !errors[next.teil] && !finished) {
      generate(next.teil, topic);
    }
  }, [started, activeTeil, lesen, exam, topic, finished]);

  const start = () => {
    timer.reset((lesen?.timeMinutes || 60) * 60);
    setStarted(true);
    setFinished(false);
    setActiveTeil(1);
  };

  const restart = () => {
    exam.reset();
    setHighlights({});
    setStarted(false);
    setFinished(false);
    setShowSheet(false);
  };

  const jumpTo = (n) => document.getElementById(`goethe-q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const confirmSubmit = () => {
    const open = lesen.parts.reduce((sum, p) => sum + (p.count - Object.values(exam.answers[p.teil] || {}).filter((v) => String(v).trim()).length), 0);
    if (open > 0 && !window.confirm(`Sie haben noch ${open} Aufgaben ohne Antwort. Wirklich abgeben?`)) return;
    handleSubmitAll();
  };

  if (formatError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> {formatError}
      </div>
    );
  }
  if (!lesen) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Prüfungsformat wird geladen …
      </div>
    );
  }

  const tabs = lesen.parts.map((p) => ({
    key: p.teil,
    label: `Teil ${p.teil}`,
    title: p.title,
    status: exam.results[p.teil] ? 'done' : exam.loading[p.teil] ? 'loading' : 'idle',
    answered: Object.values(exam.answers[p.teil] || {}).filter((v) => String(v).trim()).length,
    total: p.count,
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <BookOpenText className="w-3.5 h-3.5" /> Goethe-Zertifikat {level} · Lesen
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">Leseverstehen</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExamModeToggle locked={started && !finished} />
          {started && (
            <ExamTimer secondsLeft={timer.secondsLeft} running={!paused && !finished} canPause={isLearn && !finished} onToggle={() => setPaused((p) => !p)} />
          )}
          {started && !finished && (
            <button
              type="button"
              onClick={confirmSubmit}
              disabled={exam.submitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {exam.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Abgeben
            </button>
          )}
          {started && (
            <button type="button" onClick={restart} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> Neu
            </button>
          )}
        </div>
      </div>

      {!started ? (
        <>
          <ExamSetupBar level={level} onLevelChange={onLevelChange} topic={topic} onTopicChange={setTopic} />
          <ExamInstructionScreen
            level={level}
            moduleName="Lesen"
            timeMinutes={lesen.timeMinutes}
            parts={lesen.parts.map((p) => ({ key: p.teil, label: `Teil ${p.teil}`, title: p.title, detail: `Aufgaben ${p.from}–${p.to}` }))}
            rules={[
              `${lesen.maxRaw} Aufgaben in ${lesen.parts.length} Teilen, ${lesen.timeMinutes} Minuten.`,
              `Bestanden ab 60 Punkten und mindestens ${lesen.passRaw} richtigen Aufgaben.`,
              'Sie können zwischen den Teilen frei wechseln und Textstellen markieren.',
              isExam ? 'Prüfungsmodus: Der Timer läuft ohne Pause; bei 0:00 wird automatisch abgegeben.' : 'Lernmodus: Übersetzungen, Pause und sofortige Kontrolle pro Teil.',
            ]}
            onStart={start}
          />
        </>
      ) : (
        <>
          {finished && (
            <ModuleResultCard moduleLabel="Lesen" level={level} summary={summary}>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSheet((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4" /> {showSheet ? 'Aufgaben anzeigen' : 'Antwortbogen anzeigen'}
                </button>
              </div>
            </ModuleResultCard>
          )}

          <TeilTabs items={tabs} activeKey={activeTeil} onChange={(k) => { setActiveTeil(k); setShowSheet(false); }} />

          {showSheet ? (
            <AnswerSheet moduleLabel={`Lesen ${level}`} parts={lesen.parts} tests={exam.tests} answers={exam.answers} results={exam.results} />
          ) : (
            <>
              {!finished && (
                <button
                  type="button"
                  onClick={() => setShowSheet(true)}
                  className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Antwortbogen-Vorschau
                </button>
              )}

              {exam.errors[activeTeil] && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex flex-wrap items-center gap-3">
                  <AlertCircle className="w-4 h-4" /> {exam.errors[activeTeil]}
                  <button type="button" onClick={() => exam.generate(activeTeil, topic)} className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold">
                    Erneut versuchen
                  </button>
                </div>
              )}

              {!test && !exam.errors[activeTeil] && (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 flex flex-col items-center gap-3 text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-sm font-semibold">Teil {activeTeil} ({part?.title}) wird erstellt … das dauert etwa 20–40 Sekunden.</p>
                </div>
              )}

              {test && part && (
                <div className="grid gap-5 lg:grid-cols-[55fr_45fr] items-start">
                  {/* Left: document */}
                  <section className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto rounded-2xl bg-slate-100 border border-slate-200 p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Lesetext · Teil {part.teil}</span>
                      <HighlighterToolbar tool={tool} onToolChange={setTool} onClear={() => setHighlights({})} />
                    </div>
                    <ReadingDocument
                      part={part}
                      test={test}
                      answers={teilAnswers}
                      onAnswer={(n, v) => exam.setAnswer(activeTeil, n, v)}
                      disabled={Boolean(teilResult)}
                      results={teilResult}
                      highlights={highlights}
                      onHighlightsChange={setHighlights}
                      tool={tool}
                    />
                  </section>

                  {/* Right: tasks */}
                  <section className="flex flex-col gap-4">
                    <BilingualInstructionBanner
                      level={level}
                      module="lesen"
                      teil={part.teil}
                      title={part.title}
                      instruction={part.instruction}
                      from={part.from}
                      to={part.to}
                    />
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <QuestionPalette
                        questions={test.questions}
                        answers={teilAnswers}
                        flags={exam.flags[activeTeil]}
                        results={teilResult?.breakdown}
                        onJump={jumpTo}
                      />
                    </div>
                    {teilResult && (
                      <p className="text-sm font-bold text-slate-700">
                        Teil {part.teil}: {teilResult.correctCount} von {teilResult.totalQuestions} richtig
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      {test.questions.map((q) => (
                        <QuestionRenderer
                          key={q.number}
                          question={q}
                          value={teilAnswers[q.number]}
                          onChange={(v) => exam.setAnswer(activeTeil, q.number, v)}
                          disabled={Boolean(teilResult)}
                          result={teilResult?.breakdown?.find((r) => r.number === q.number)}
                          isLearn={isLearn}
                          sentences={test.sentences}
                          flagged={Boolean(exam.flags[activeTeil]?.[q.number])}
                          onToggleFlag={() => exam.toggleFlag(activeTeil, q.number)}
                        />
                      ))}
                      {SHOWN_IN_DOCUMENT.has(part.qType) && !teilResult && (
                        <p className="text-xs text-slate-500">Tipp: Sie können die Lücken auch direkt im Text links ausfüllen.</p>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      {isLearn && !teilResult && (
                        <button
                          type="button"
                          onClick={() => exam.submit([activeTeil]).catch((err) => alert(err.response?.data?.error || 'Fehler bei der Auswertung.'))}
                          disabled={exam.submitting}
                          className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center gap-1.5"
                        >
                          <CheckCheck className="w-4 h-4" /> Teil {part.teil} prüfen
                        </button>
                      )}
                      {lesen.parts.some((p) => p.teil === activeTeil + 1) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTeil(activeTeil + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5"
                        >
                          Weiter zu Teil {activeTeil + 1} <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function GoetheLesenRoom() {
  const { goetheLevel, setGoetheLevel } = useApp();
  const level = ['A2', 'B1', 'B2', 'C1'].includes(goetheLevel) ? goetheLevel : 'B1';
  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-7xl mx-auto text-left animate-float-in">
      <LesenExam key={level} level={level} onLevelChange={setGoetheLevel} />
    </div>
  );
}
