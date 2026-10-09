import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_WRITING_TASKS } from '../../data/goethe/goetheWritingTasks';
import { GOETHE_TOPICS } from '../../data/goethe/goetheTopics';
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
  AlertCircle,
} from 'lucide-react';

const GERMAN_CHARS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

export default function GoetheSchreibenRoom() {
  const { studentName, saveEvaluation, goetheLevel } = useApp();

  // Mode: 'dynamic' (AI task generation) or 'preset' (standard Modellsatz tasks)
  const [taskSource, setTaskSource] = useState('dynamic');

  // Generator parameters
  const [selectedLevel, setSelectedLevel] = useState(goetheLevel || 'B1');
  const [selectedTopic, setSelectedTopic] = useState('Wohnen und Nachbarschaft');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTaskNumber, setSelectedTaskNumber] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Current active dynamic task
  const [dynamicTask, setDynamicTask] = useState(null);

  // Preset tasks (B1 fallback)
  const [activeTaskType, setActiveTaskType] = useState('aufgabe1');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  // Writing state
  const [essay, setEssay] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  const textareaRef = useRef(null);

  // Sync level with app context
  useEffect(() => {
    if (goetheLevel) setSelectedLevel(goetheLevel);
  }, [goetheLevel]);

  // Auto-generate initial task on mount
  useEffect(() => {
    if (taskSource === 'dynamic' && !dynamicTask && !isGenerating) {
      handleGenerateTask();
    }
  }, []);

  const handleGenerateTask = async () => {
    setIsGenerating(true);
    setGenError(null);
    setEvaluation(null);
    setEssay('');
    setShowModelAnswer(false);

    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      const res = await api.post('/goethe/writing/generate', {
        level: selectedLevel,
        topic: topicToUse,
        taskNumber: selectedTaskNumber,
      });

      if (res.data?.success && res.data.data) {
        setDynamicTask(res.data.data);
        const mins = res.data.data.timeMinutes || 20;
        setTimeLeft(mins * 60);
        setTimerRunning(false);
      } else {
        setGenError(res.data?.error || 'Fehler beim Erstellen der Schreibaufgabe.');
      }
    } catch (err) {
      console.error('Error generating writing task:', err);
      setGenError(err.response?.data?.error || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsGenerating(false);
    }
  };

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

  // Insert German character at cursor
  const insertChar = (char) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newText = essay.substring(0, start) + char + essay.substring(end);
    setEssay(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    }, 0);
  };

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0;
  const targetWords = taskSource === 'dynamic'
    ? (dynamicTask?.targetWordCount || 80)
    : (activeTaskType === 'aufgabe3' ? 40 : 80);

  const handleEvaluate = async () => {
    if (!essay.trim()) {
      setErrorMsg('Bitte schreiben Sie zuerst Ihren Text.');
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);
    setTimerRunning(false);

    const promptText = taskSource === 'dynamic' && dynamicTask
      ? `${dynamicTask.scenario}\n\n${dynamicTask.instructions}\n- ${dynamicTask.bulletPoints?.join('\n- ')}`
      : 'Standard Goethe B1 Schreibaufgabe';

    try {
      const res = await api.post('/goethe/evaluate-writing', {
        taskNumber: taskSource === 'dynamic' ? dynamicTask?.taskNumber || 1 : parseInt(activeTaskType.replace('aufgabe', ''), 10),
        prompt: promptText,
        response: essay,
        studentName: studentName || 'Student',
        level: selectedLevel,
      });

      if (res.data?.success && res.data.data) {
        setEvaluation(res.data.data);
        saveEvaluation(res.data.data, {
          kind: 'goethe-schreiben',
          module: selectedLevel,
          question: dynamicTask?.title || 'Goethe Schreiben',
        });
      } else {
        setErrorMsg(res.data?.error || 'Fehler bei der Textauswertung.');
      }
    } catch (err) {
      console.error('Writing evaluation error:', err);
      setErrorMsg(err.response?.data?.error || 'Verbindung zum Server fehlgeschlagen.');
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 text-xs font-bold mb-1.5 border border-sky-200">
            <span>🇩🇪 Goethe-Zertifikat {selectedLevel}</span>
            <span>·</span>
            <span>Schreiben (Schriftlicher Ausdruck)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            {dynamicTask?.title || `Goethe Schreiben ${selectedLevel}`}
          </h1>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-sm font-bold shadow-xs hover:bg-slate-800"
          >
            <Clock className={`w-4 h-4 ${timerRunning ? 'text-sky-400 animate-pulse' : 'text-slate-400'}`} />
            <span>{formatTimer(timeLeft)}</span>
          </button>

          <button
            onClick={handleEvaluate}
            disabled={isEvaluating || isGenerating || !essay.trim()}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            {isEvaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Wird bewertet...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Text bewerten lassen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generator Control Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>Aufgaben-Generator:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Level Selector */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800"
            >
              <option value="A2">Niveau A2</option>
              <option value="B1">Niveau B1</option>
              <option value="B2">Niveau B2</option>
              <option value="C1">Niveau C1</option>
            </select>

            {/* Topic Selector */}
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setCustomTopic('');
              }}
              className="p-2 rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800 max-w-[200px] truncate"
            >
              {GOETHE_TOPICS.map((t) => (
                <option key={t.id} value={t.title}>
                  {t.code}: {t.title}
                </option>
              ))}
            </select>

            {/* Task Number Selector */}
            <select
              value={selectedTaskNumber}
              onChange={(e) => setSelectedTaskNumber(Number(e.target.value))}
              className="p-2 rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800"
            >
              <option value="1">Aufgabe 1 ({selectedLevel === 'A2' ? 'SMS / Notiz' : selectedLevel === 'B2' ? 'Diskussionsforum' : selectedLevel === 'C1' ? 'Stellungnahme' : 'Informelle E-Mail'})</option>
              <option value="2">Aufgabe 2 ({selectedLevel === 'A2' ? 'E-Mail' : selectedLevel === 'B2' ? 'Formelle E-Mail' : selectedLevel === 'C1' ? 'Formeller Brief' : 'Meinung im Forum'})</option>
              {selectedLevel === 'B1' && <option value="3">Aufgabe 3 (Formelle E-Mail ~40 W)</option>}
            </select>

            <button
              onClick={handleGenerateTask}
              disabled={isGenerating}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generiere...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                  <span>Neue Schreibaufgabe</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom topic prompt input */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 whitespace-nowrap">Eigenes Thema:</span>
          <input
            type="text"
            placeholder="z.B. Umweltschutz im Alltag, Homeoffice Vor- und Nachteile, Beschwerde über Sprachkurs..."
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            className="flex-1 p-1.5 px-3 rounded-lg border border-slate-200 text-slate-800 text-xs"
          />
        </div>
      </div>

      {/* Error alert */}
      {genError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{genError}</span>
        </div>
      )}

      {/* TASK DESCRIPTION & TEXTAREA GRID */}
      {dynamicTask && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Task Prompt & Leitpunkte (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Aufgabenstellung · Goethe {dynamicTask.level}
                </span>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {dynamicTask.scenario}
                </h3>
              </div>

              {/* Leitpunkte */}
              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 text-xs flex flex-col gap-2">
                <span className="font-bold text-sky-950">
                  {dynamicTask.instructions || 'Schreiben Sie zu allen drei Leitpunkten:'}
                </span>
                <ul className="space-y-1.5 pl-4 list-disc text-sky-900">
                  {dynamicTask.bulletPoints?.map((bp, idx) => (
                    <li key={idx} className="font-medium">{bp}</li>
                  ))}
                </ul>
              </div>

              {/* Requirement specs */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 font-semibold">
                <span>Richtzeit: ~{dynamicTask.timeMinutes || 20} Min.</span>
                <span>Umfang: ca. {dynamicTask.targetWordCount || 80} Wörter</span>
              </div>

              {/* Rubric highlight tip */}
              {dynamicTask.rubricHighlight && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  💡 <span className="font-semibold text-slate-700">Tipp:</span> {dynamicTask.rubricHighlight}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Writing Pad & Umlaut Bar (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
              {/* Umlaut quick buttons bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Umlaute:</span>
                  {GERMAN_CHARS.map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => insertChar(char)}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                    >
                      {char}
                    </button>
                  ))}
                </div>

                {/* Word Counter Pill */}
                <div className="text-xs font-bold">
                  <span className={wordCount >= targetWords ? 'text-emerald-600' : 'text-slate-500'}>
                    {wordCount} / ca. {targetWords} Wörter
                  </span>
                </div>
              </div>

              {/* Writing Textarea */}
              <textarea
                ref={textareaRef}
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                rows={12}
                placeholder="Schreiben Sie hier Ihren Text auf Deutsch..."
                className="w-full p-4 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-sm leading-relaxed text-slate-800 resize-y font-normal"
              />

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Evaluation Results Card */}
            {evaluation && (
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md flex flex-col gap-5 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Prüfungsergebnis Schreiben · Goethe {evaluation.level || selectedLevel}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {evaluation.scaledPoints100 || evaluation.totalPoints || 0} / 100 Punkte
                    </h3>
                  </div>

                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                    evaluation.passed
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    Prädikat: {evaluation.praedikat || (evaluation.passed ? 'Bestanden' : 'Nicht bestanden')}
                  </span>
                </div>

                {/* Verdict */}
                {evaluation.verdict && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed font-medium">
                    {evaluation.verdict}
                  </p>
                )}

                {/* Criteria breakdown */}
                {evaluation.scores && (
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    {Object.entries(evaluation.scores).map(([crit, pts]) => (
                      <div key={crit} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center font-bold">
                        <span className="capitalize">{crit}:</span>
                        <span className="text-sky-700">{pts} Pkt</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grammar & vocabulary corrections */}
                {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-900 block">Korrekturen &amp; Grammatik:</span>
                    {evaluation.mistakes.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="line-through text-rose-700">{m.original || m.spoken}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-emerald-700">{m.correction || m.corrected}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{m.explanation || m.why}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Model answer reveal button */}
                {evaluation.improvedVersion && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowModelAnswer(!showModelAnswer)}
                      className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{showModelAnswer ? 'Musterlösung verbergen' : 'Authentische Goethe-Musterlösung anzeigen'}</span>
                    </button>

                    {showModelAnswer && (
                      <div className="mt-3 p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                        {evaluation.improvedVersion}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
