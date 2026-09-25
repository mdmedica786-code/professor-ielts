import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_WRITING_TASKS } from '../../data/goethe/goetheWritingTasks';
import api from '../../api/client';
import {
  PenLine,
  Clock,
  Send,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ChevronDown,
  Award,
  Check,
} from 'lucide-react';

const GERMAN_CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

export default function GoetheSchreibenRoom() {
  const { studentName, saveEvaluation } = useApp();

  const [activeTaskType, setActiveTaskType] = useState('aufgabe1'); // 'aufgabe1' | 'aufgabe2' | 'aufgabe3'
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [essay, setEssay] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const textareaRef = useRef(null);

  const currentTaskList = GOETHE_WRITING_TASKS[activeTaskType] || [];
  const currentTask = currentTaskList[selectedTaskIndex] || currentTaskList[0];

  // Reset timer on task switch
  useEffect(() => {
    const mins = currentTask?.timeMinutes || 20;
    setTimeLeft(mins * 60);
    setTimerRunning(false);
    setEssay('');
    setEvaluation(null);
    setErrorMsg(null);
    setShowModelAnswer(false);
  }, [activeTaskType, selectedTaskIndex, currentTask?.timeMinutes]);

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWords = currentTask?.targetWords || 80;
  const isSeverelyUnderweight = wordCount > 0 && wordCount < targetWords * 0.5;

  const insertChar = (char) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const updated = essay.substring(0, start) + char + essay.substring(end);
    setEssay(updated);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start + char.length, start + char.length);
    }, 10);
  };

  const handleEvaluate = async () => {
    if (!essay.trim()) {
      setErrorMsg('Bitte schreiben Sie zuerst Ihren Text im Textfeld.');
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/goethe/evaluate-writing', {
        taskNumber: currentTask.taskNumber,
        prompt: currentTask.prompt,
        response: essay,
        studentName: studentName || 'Student',
      });

      if (res.data?.success) {
        setEvaluation(res.data.data);
        setTimerRunning(false);
        // Save to student history
        saveEvaluation(res.data.data, {
          kind: 'goethe-schreiben',
          module: 'B1',
          question: currentTask.title,
        });
      } else {
        setErrorMsg(res.data?.error || 'Fehler bei der Bewertung. Bitte erneut versuchen.');
      }
    } catch (err) {
      console.error('Goethe evaluation error:', err);
      setErrorMsg(err.response?.data?.error || 'Verbindungsfehler zum Server. Bitte versuchen Sie es erneut.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Top Header & Task Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold mb-1.5 border border-amber-200">
            <span>🇩🇪 Goethe-Zertifikat B1</span>
            <span>·</span>
            <span>Schriftlicher Ausdruck (60 Min · 100 Pkt)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            Schreiben Prüfungstraining
          </h1>
        </div>

        {/* Aufgabe 1 / 2 / 3 Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => { setActiveTaskType('aufgabe1'); setSelectedTaskIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTaskType === 'aufgabe1'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aufgabe 1 (~80W · 40P)
          </button>
          <button
            onClick={() => { setActiveTaskType('aufgabe2'); setSelectedTaskIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTaskType === 'aufgabe2'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aufgabe 2 (~80W · 40P)
          </button>
          <button
            onClick={() => { setActiveTaskType('aufgabe3'); setSelectedTaskIndex(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTaskType === 'aufgabe3'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Aufgabe 3 (~40W · 20P)
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Side: Task Selection & Prompt Details (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Preset Task Dropdown */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Prüfungsthema wählen
            </label>
            <div className="flex flex-col gap-2">
              {currentTaskList.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTaskIndex(idx)}
                  className={`p-3 rounded-xl text-left border text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${
                    selectedTaskIndex === idx
                      ? 'border-brand-500 bg-brand-50/60 text-brand-950 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div>{t.title}</div>
                    <span className="text-[11px] text-slate-400 font-normal">{t.topic}</span>
                  </div>
                  {selectedTaskIndex === idx && <Check className="w-4 h-4 text-brand-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Official Prompt Sheet */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                Register: {currentTask.register}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Max. {currentTask.maxPoints} Punkte
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs md:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans">
              {currentTask.prompt}
            </div>

            {/* Leitpunkte Checklist */}
            {currentTask.leitpunkte && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Geforderte Inhaltspunkte (Leitpunkte):
                </span>
                <ul className="space-y-1.5">
                  {currentTask.leitpunkte.map((lp, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                      <span>{lp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Model answer toggle */}
            <button
              onClick={() => setShowModelAnswer(!showModelAnswer)}
              className="mt-2 text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1 self-start"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showModelAnswer ? 'Musterlösung ausblenden' : 'Offizielle B1-Musterlösung ansehen'}</span>
            </button>

            {showModelAnswer && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 animate-fade-in space-y-2">
                <div className="font-bold text-emerald-900">Beispiellösung (Prädikat: Sehr gut):</div>
                <div className="whitespace-pre-line font-mono text-[11px] leading-relaxed">
                  {currentTask.modelAnswer}
                </div>
                {currentTask.modelAnalysis && (
                  <p className="text-[11px] text-emerald-800 italic pt-1 border-t border-emerald-200">
                    {currentTask.modelAnalysis}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Text Editor & Live Evaluation (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
            {/* Editor Toolbar: Timer + Word Count + German Keyboard Helper */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                    timerRunning
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTimer(timeLeft)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {timerRunning ? '(Pause)' : '(Start)'}
                  </span>
                </button>
              </div>

              {/* Word count meter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  Wörter: <strong className="text-slate-900">{wordCount}</strong> / ~{targetWords}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    wordCount >= targetWords
                      ? 'bg-emerald-100 text-emerald-800'
                      : wordCount >= targetWords * 0.75
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {wordCount >= targetWords ? 'Ziel erreicht' : `Noch ${Math.max(0, targetWords - wordCount)}`}
                </span>
              </div>
            </div>

            {/* German special character buttons */}
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Umlaute:</span>
              {GERMAN_CHARS.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => insertChar(char)}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:border-brand-400 hover:bg-brand-50 text-slate-800 font-bold text-xs flex items-center justify-center shadow-2xs active:scale-95 transition-all"
                >
                  {char}
                </button>
              ))}
              <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline">
                Klicken zum Einfügen
              </span>
            </div>

            {/* Severe Under-weight Knockout Warning */}
            {isSeverelyUnderweight && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>
                  <strong>Achtung Knock-Out-Regel:</strong> Unter 50% der Wortzahl ({targetWords * 0.5} Wörter) erhält das Kriterium Erfüllung 0 Punkte und die gesamte Aufgabe wird mit 0 bewertet.
                </span>
              </div>
            )}

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              rows={12}
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              placeholder="Schreiben Sie hier Ihren Text auf Deutsch... (Achten Sie auf Anrede, Verbstellung im Nebensatz und passende Grußformel)"
              className="w-full p-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm text-slate-900 leading-relaxed font-sans resize-y shadow-inner"
            />

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => { setEssay(''); setEvaluation(null); }}
                className="btn-ghost text-xs text-slate-500 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zurücksetzen</span>
              </button>

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating || !essay.trim()}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Goethe-Prüfer bewertet...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Nach Goethe B1 Kriterien bewerten</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Evaluation Result View */}
          {evaluation && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col gap-6 animate-fade-in">
              {/* Score & Prädikat Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Goethe-Zertifikat B1 · Bewertung
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-white">
                      {evaluation.totalPoints} / {evaluation.maxPoints} Pkt
                    </span>
                    <span className="text-slate-400 text-sm">
                      ({evaluation.scaledPoints100} / 100 Pkt)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Prädikat:</span>
                    <span
                      className={`text-sm md:text-base font-extrabold px-3 py-1 rounded-lg border ${
                        evaluation.passed
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {evaluation.praedikat}
                    </span>
                  </div>
                </div>
              </div>

              {/* Examiner Verdict */}
              {evaluation.verdict && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 italic">
                  „{evaluation.verdict}“
                </div>
              )}

              {/* Criteria Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Offizielle Goethe-Kriterien (Band A–E)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {evaluation.criteriaAnalysis &&
                    Object.entries(evaluation.criteriaAnalysis).map(([critKey, crit]) => (
                      <div
                        key={critKey}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-sm text-slate-900 capitalize">
                              {critKey === 'erfuellung' ? 'Erfüllung' : critKey === 'kohaerenz' ? 'Kohärenz' : critKey === 'wortschatz' ? 'Wortschatz' : 'Strukturen'}
                            </span>
                            <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border">
                              Band {crit.band} ({crit.points} Pkt)
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-2">
                            {crit.examinerComment}
                          </p>
                        </div>
                        {crit.strengths && crit.strengths.length > 0 && (
                          <div className="text-[11px] text-emerald-700 font-medium">
                            ✓ {crit.strengths[0]}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Mistakes & Grammar Corrections */}
              {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Fehleranalyse &amp; Korrekturen ({evaluation.mistakes.length})
                  </h3>
                  <div className="space-y-2">
                    {evaluation.mistakes.map((m, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                            {m.category || 'Fehler'}
                          </span>
                          <span className="text-rose-700 line-through font-mono">
                            {m.original || m.said}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-700 font-bold font-mono">
                            {m.correction || m.fix}
                          </span>
                        </div>
                        {m.explanation && (
                          <p className="text-slate-600 text-[11px] pl-1">{m.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improved Model Version */}
              {evaluation.improvedVersion && (
                <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs md:text-sm">
                  <div className="font-bold text-purple-900 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-700" />
                    <span>Vorbildliche B1-Musterlösung:</span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                    {evaluation.improvedVersion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
