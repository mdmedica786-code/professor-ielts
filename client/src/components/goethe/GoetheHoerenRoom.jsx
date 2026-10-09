import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { Headphones, Send, RotateCcw, Loader2, AlertCircle, ChevronRight, FileSpreadsheet, CheckCheck, ScrollText } from 'lucide-react';
import ExamModeToggle from './shared/ExamModeToggle';
import ExamTimer from './shared/ExamTimer';
import { useCountdown } from './shared/useCountdown';
import ExamSetupBar from './shared/ExamSetupBar';
import ExamInstructionScreen from './shared/ExamInstructionScreen';
import BilingualInstructionBanner from './shared/BilingualInstructionBanner';
import TeilTabs from './shared/TeilTabs';
import QuestionPalette from './shared/QuestionPalette';
import QuestionRenderer, { WerSagtWasMatrix } from './shared/QuestionRenderer';
import AnswerSheet from './shared/AnswerSheet';
import ModuleResultCard from './shared/ModuleResultCard';
import AudioPlayerWithLimits from './shared/AudioPlayerWithLimits';
import { useExamMode } from './shared/useExamMode';
import { useGoetheFormat } from './shared/useGoetheFormat';
import { useReceptiveExam, summarizeModule } from './shared/useReceptiveExam';
import { usePersistentState } from './shared/usePersistentState';

/** Groups questions by Hörtext (segment) for multi-text parts. */
function groupBySegment(questions, segments) {
  if (!segments || segments.length <= 1) return [{ label: null, questions }];
  return segments.map((seg, i) => ({
    label: `${seg.label}${seg.context ? ` · ${seg.context}` : ''}`,
    questions: questions.filter((q) => q.segment === i + 1),
  }));
}

function Transcript({ test }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-800"
      >
        <span className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-slate-500" /> Transkript
        </span>
        <span className="text-xs text-slate-500">{open ? 'ausblenden' : 'anzeigen'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 text-sm">
          {test.utterances.map((u, i) => {
            const newSegment = i === 0 || u.segment !== test.utterances[i - 1].segment;
            return (
              <div key={i}>
                {newSegment && test.segments?.length > 1 && (
                  <p className="mt-3 mb-1 text-xs font-extrabold uppercase tracking-wider text-slate-400">{test.segments[u.segment - 1]?.label}</p>
                )}
                <p className="leading-relaxed">
                  <span className="font-bold text-slate-900">{u.speaker}: </span>
                  <span className="text-slate-700">{u.text}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * mock: { persistKey, onComplete(result) } when the room runs inside the full
 * Modellprüfung — progress is kept in sessionStorage and setup controls hide.
 */
export function HoerenExam({ level, onLevelChange, mock = null }) {
  const { saveEvaluation } = useApp();
  const { isExam, isLearn } = useExamMode();
  const { format, error: formatError } = useGoetheFormat(level);
  const hoeren = format?.hoeren;
  const pk = mock?.persistKey || null;
  const keyOf = (name) => (pk ? `${pk}:${name}` : null);
  const exam = useReceptiveExam('hoeren', level, { persistKey: keyOf('exam') });

  const [topic, setTopic] = useState('');
  const [started, setStarted] = usePersistentState(keyOf('started'), false);
  const [finished, setFinished] = usePersistentState(keyOf('finished'), false);
  const [paused, setPaused] = useState(false);
  const [activeTeil, setActiveTeil] = usePersistentState(keyOf('activeTeil'), 1);
  const [showSheet, setShowSheet] = useState(false);
  const [playsUsed, setPlaysUsed] = usePersistentState(keyOf('plays'), {});
  const [audioPlaying, setAudioPlaying] = useState(false);

  const part = hoeren?.parts.find((p) => p.teil === activeTeil);
  const test = exam.tests[activeTeil];
  const teilAnswers = exam.answers[activeTeil] || {};
  const teilResult = exam.results[activeTeil];
  const summary = useMemo(() => summarizeModule(hoeren, exam.results, { final: finished }), [hoeren, exam.results, finished]);

  const handleSubmitAll = async () => {
    if (!hoeren || finished) return;
    try {
      await exam.submit(hoeren.parts.map((p) => p.teil));
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Fehler bei der Auswertung.');
      return;
    }
    setFinished(true);
    setShowSheet(false);
  };

  const timer = useCountdown((hoeren?.timeMinutes || 40) * 60, {
    running: started && !finished && !(isLearn && paused),
    onExpire: () => {
      if (isExam) handleSubmitAll();
    },
    persistKey: keyOf('timer'),
  });

  useEffect(() => {
    if (!finished || !summary) return;
    if (mock) {
      mock.onComplete({ points100: summary.points100, passed: summary.passed, raw: summary.raw, maxRaw: summary.maxRaw });
      return;
    }
    saveEvaluation(
      {
        kind: 'goethe-hoeren',
        level,
        rawScore: summary.raw,
        maxRaw: summary.maxRaw,
        scaledPoints100: summary.points100,
        praedikat: summary.passed ? getPraedikat(summary.points100).label : 'Nicht bestanden',
        passed: summary.passed,
      },
      { kind: 'goethe-hoeren', module: level, question: `Goethe Hören ${level}` }
    );
    // Save once per finished exam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // Generate the active Teil (audio is rendered on the server) and prefetch the next one.
  useEffect(() => {
    if (!started || !hoeren) return;
    const { tests, loading, errors, generate } = exam;
    if (!tests[activeTeil] && !loading[activeTeil] && !errors[activeTeil]) generate(activeTeil, topic);
    const next = hoeren.parts.find((p) => p.teil === activeTeil + 1);
    if (tests[activeTeil] && next && !tests[next.teil] && !loading[next.teil] && !errors[next.teil] && !finished) {
      generate(next.teil, topic);
    }
  }, [started, activeTeil, hoeren, exam, topic, finished]);

  const start = () => {
    timer.reset((hoeren?.timeMinutes || 40) * 60);
    setStarted(true);
    setFinished(false);
    setActiveTeil(1);
  };

  const restart = () => {
    exam.reset();
    setPlaysUsed({});
    setStarted(false);
    setFinished(false);
    setShowSheet(false);
  };

  const confirmSubmit = () => {
    const open = hoeren.parts.reduce((sum, p) => sum + (p.count - Object.values(exam.answers[p.teil] || {}).filter((v) => String(v).trim()).length), 0);
    if (open > 0 && !window.confirm(`Sie haben noch ${open} Aufgaben ohne Antwort. Wirklich abgeben?`)) return;
    handleSubmitAll();
  };

  const switchTeil = (teil) => {
    if (audioPlaying) return;
    setActiveTeil(teil);
    setShowSheet(false);
  };

  if (formatError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> {formatError}
      </div>
    );
  }
  if (!hoeren) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Prüfungsformat wird geladen …
      </div>
    );
  }

  const tabs = hoeren.parts.map((p) => ({
    key: p.teil,
    label: `Teil ${p.teil}`,
    title: `${p.title} · ${p.maxPlays}×`,
    status: exam.results[p.teil] ? 'done' : exam.loading[p.teil] ? 'loading' : 'idle',
    answered: Object.values(exam.answers[p.teil] || {}).filter((v) => String(v).trim()).length,
    total: p.count,
  }));

  const playsDone = (playsUsed[activeTeil] || 0) >= (part?.maxPlays || 1);
  const isWerSagtWas = part?.qType === 'wer_sagt_was';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-violet-50 text-violet-800 text-xs font-bold border border-violet-200">
            <Headphones className="w-3.5 h-3.5" /> Goethe-Zertifikat {level} · Hören
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">Hörverstehen</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExamModeToggle locked={Boolean(mock) || (started && !finished)} />
          {started && (
            <ExamTimer secondsLeft={timer.secondsLeft} running={!paused && !finished} canPause={isLearn && !finished} onToggle={() => setPaused((p) => !p)} />
          )}
          {started && !finished && (
            <button
              type="button"
              onClick={confirmSubmit}
              disabled={exam.submitting || audioPlaying}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {exam.submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
            moduleName="Hören"
            timeMinutes={hoeren.timeMinutes}
            parts={hoeren.parts.map((p) => ({
              key: p.teil,
              label: `Teil ${p.teil}`,
              title: p.title,
              detail: `Aufgaben ${p.from}–${p.to} · ${p.maxPlays === 1 ? 'einmal' : 'zweimal'} hören`,
            }))}
            rules={[
              `${hoeren.maxRaw} Aufgaben in ${hoeren.parts.length} Teilen, ca. ${hoeren.timeMinutes} Minuten.`,
              'Jeder Hörtext darf nur so oft gehört werden, wie angegeben. Zurückspulen ist nicht möglich.',
              'Lösen Sie die Aufgaben während des Hörens. Nach jedem Durchgang haben Sie 30 Sekunden Zeit.',
              `Bestanden ab 60 Punkten und mindestens ${hoeren.passRaw} richtigen Aufgaben.`,
              'Benutzen Sie Kopfhörer und stellen Sie die Lautstärke vorher ein.',
            ]}
            onStart={start}
          />
        </>
      ) : (
        <>
          {finished && (
            <ModuleResultCard moduleLabel="Hören" level={level} summary={summary}>
              <div className="mt-4">
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

          <TeilTabs items={tabs} activeKey={activeTeil} onChange={switchTeil} />
          {audioPlaying && <p className="text-xs font-semibold text-slate-500">Während der Hörtext läuft, können Sie den Teil nicht wechseln.</p>}

          {showSheet ? (
            <AnswerSheet moduleLabel={`Hören ${level}`} parts={hoeren.parts} tests={exam.tests} answers={exam.answers} results={exam.results} />
          ) : (
            <>
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
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                  <p className="text-sm font-semibold text-center">
                    Teil {activeTeil} ({part?.title}) wird erstellt und vertont … das dauert etwa 30–60 Sekunden.
                  </p>
                </div>
              )}

              {test && part && (
                <div className="grid gap-5 lg:grid-cols-[2fr_3fr] items-start">
                  <section className="flex flex-col gap-4 lg:sticky lg:top-4">
                    <BilingualInstructionBanner
                      level={level}
                      module="hoeren"
                      teil={part.teil}
                      title={part.title}
                      instruction={part.instruction}
                      from={part.from}
                      to={part.to}
                    />
                    <AudioPlayerWithLimits
                      key={test.token}
                      audioData={test.audioData}
                      mimeType={test.audioMimeType || 'audio/mpeg'}
                      maxPlays={part.maxPlays}
                      isLearn={isLearn}
                      utterances={test.utterances}
                      level={level}
                      initialPlaysUsed={playsUsed[activeTeil] || 0}
                      onStatusChange={({ playsUsed: used, playing }) => {
                        setAudioPlaying(playing);
                        setPlaysUsed((s) => ({ ...s, [activeTeil]: used }));
                      }}
                    />
                    {test.optionBank?.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Auswahl a–{test.optionBank.at(-1).label}</p>
                        <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          {test.optionBank.map((o) => (
                            <li key={o.label} className="flex gap-2">
                              <span className="font-extrabold w-4">{o.label}</span>
                              <span className="text-slate-700">{o.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <QuestionPalette questions={test.questions} answers={teilAnswers} flags={exam.flags[activeTeil]} results={teilResult?.breakdown} onJump={(n) => document.getElementById(`goethe-q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
                    </div>
                    {(teilResult || (isLearn && playsDone)) && test.utterances?.length > 0 && <Transcript test={test} />}
                  </section>

                  <section className="flex flex-col gap-4">
                    {teilResult && (
                      <p className="text-sm font-bold text-slate-700">
                        Teil {part.teil}: {teilResult.correctCount} von {teilResult.totalQuestions} richtig
                      </p>
                    )}
                    {isWerSagtWas ? (
                      <WerSagtWasMatrix
                        questions={test.questions}
                        answers={teilAnswers}
                        onChange={(n, v) => exam.setAnswer(activeTeil, n, v)}
                        disabled={Boolean(teilResult)}
                        results={teilResult?.breakdown}
                      />
                    ) : (
                      groupBySegment(test.questions, test.segments).map((group) => (
                        <div key={group.label || 'all'} className="flex flex-col gap-3">
                          {group.label && <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mt-1">{group.label}</h3>}
                          {group.questions.map((q) => (
                            <QuestionRenderer
                              key={q.number}
                              question={q}
                              value={teilAnswers[q.number]}
                              onChange={(v) => exam.setAnswer(activeTeil, q.number, v)}
                              disabled={Boolean(teilResult)}
                              result={teilResult?.breakdown?.find((r) => r.number === q.number)}
                              isLearn={isLearn}
                              optionBank={test.optionBank}
                              flagged={Boolean(exam.flags[activeTeil]?.[q.number])}
                              onToggleFlag={() => exam.toggleFlag(activeTeil, q.number)}
                            />
                          ))}
                        </div>
                      ))
                    )}

                    <div className="flex flex-wrap justify-end gap-2">
                      {isLearn && !teilResult && (
                        <button
                          type="button"
                          onClick={() => exam.submit([activeTeil]).catch((err) => alert(err.response?.data?.error || 'Fehler bei der Auswertung.'))}
                          disabled={exam.submitting || audioPlaying}
                          className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCheck className="w-4 h-4" /> Teil {part.teil} prüfen
                        </button>
                      )}
                      {hoeren.parts.some((p) => p.teil === activeTeil + 1) && (
                        <button
                          type="button"
                          disabled={audioPlaying}
                          onClick={() => {
                            switchTeil(activeTeil + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
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

export default function GoetheHoerenRoom() {
  const { goetheLevel, setGoetheLevel } = useApp();
  const level = ['A2', 'B1', 'B2', 'C1'].includes(goetheLevel) ? goetheLevel : 'B1';
  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-7xl mx-auto text-left animate-float-in">
      <HoerenExam key={level} level={level} onLevelChange={setGoetheLevel} />
    </div>
  );
}
