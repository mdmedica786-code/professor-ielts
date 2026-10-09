import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_READING_TESTS } from '../../data/goethe/goetheReadingTests';
import { calculateGoetheReadingListeningScore, GOETHE_LEVEL_SPECS } from '../../data/goethe/goetheGradingRules';
import { GOETHE_TOPICS } from '../../data/goethe/goetheTopics';
import api from '../../api/client';
import {
  BookOpenText,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  Send,
  Award,
  ChevronRight,
  AlertCircle,
  Sparkles,
  Loader2,
  BookOpen,
  Filter,
} from 'lucide-react';

export default function GoetheLesenRoom() {
  const { studentName, saveEvaluation, goetheLevel } = useApp();

  // Mode: 'dynamic' (AI Generated) or 'official' (Standard Modellsatz)
  const [testSource, setTestSource] = useState('dynamic');

  // Generator parameters
  const [selectedLevel, setSelectedLevel] = useState(goetheLevel || 'B1');
  const [selectedTopic, setSelectedTopic] = useState('Freizeit und Hobbys');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedPartNum, setSelectedPartNum] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Dynamic test state
  const [dynamicTest, setDynamicTest] = useState(null);
  const [dynamicEvalResult, setDynamicEvalResult] = useState(null);
  const [isEvaluatingDynamic, setIsEvaluatingDynamic] = useState(false);

  // Official static test state (legacy B1 Modellsatz)
  const [activeOfficialIndex, setActiveOfficialIndex] = useState(0);
  const [activeOfficialPart, setActiveOfficialPart] = useState(1);
  const officialTest = GOETHE_READING_TESTS[activeOfficialIndex] || GOETHE_READING_TESTS[0];

  // Common interactive state
  const [answers, setAnswers] = useState({}); // { [itemNumber | id]: value }
  const [timeLeft, setTimeLeft] = useState(65 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Sync level with app context
  useEffect(() => {
    if (goetheLevel) setSelectedLevel(goetheLevel);
  }, [goetheLevel]);

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0 && !isSubmitted) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft, isSubmitted]);

  // Auto-generate initial dynamic test on mount if none loaded
  useEffect(() => {
    if (testSource === 'dynamic' && !dynamicTest && !isGenerating) {
      handleGenerateDynamicTest();
    }
  }, []);

  const handleGenerateDynamicTest = async () => {
    setIsGenerating(true);
    setGenError(null);
    setDynamicEvalResult(null);
    setAnswers({});
    setIsSubmitted(false);

    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      const res = await api.post('/goethe/reading/generate', {
        level: selectedLevel,
        topic: topicToUse,
        partNumber: selectedPartNum,
      });

      if (res.data?.success && res.data.data) {
        setDynamicTest(res.data.data);
        const mins = res.data.data.recommendedTimeMinutes || 15;
        setTimeLeft(mins * 60);
        setTimerRunning(true);
      } else {
        setGenError(res.data?.error || 'Fehler beim Erstellen der Leseaufgabe.');
      }
    } catch (err) {
      console.error('Error generating reading test:', err);
      setGenError(err.response?.data?.error || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAnswer = (itemKey, val) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [itemKey]: val }));
  };

  // Submit dynamic test
  const handleSubmitDynamic = async () => {
    if (!dynamicTest?.token) return;
    setIsEvaluatingDynamic(true);
    setTimerRunning(false);
    try {
      const res = await api.post('/goethe/reading/evaluate', {
        token: dynamicTest.token,
        answers,
        level: selectedLevel,
      });

      if (res.data?.success && res.data.data) {
        setDynamicEvalResult(res.data.data);
        setIsSubmitted(true);

        saveEvaluation(
          {
            kind: 'goethe-lesen',
            level: selectedLevel,
            rawScore: res.data.data.correctCount,
            maxRaw: res.data.data.totalQuestions,
            scaledPoints100: res.data.data.points100,
            praedikat: res.data.data.praedikat,
            passed: res.data.data.passed,
            answers,
          },
          {
            kind: 'goethe-lesen',
            module: selectedLevel,
            question: dynamicTest.title,
          }
        );
      }
    } catch (err) {
      console.error('Error evaluating reading answers:', err);
      alert('Fehler bei der Auswertung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsEvaluatingDynamic(false);
    }
  };

  // Submit official test (legacy)
  const handleSubmitOfficial = () => {
    let correctCount = 0;
    officialTest.parts.forEach((p) => {
      if (p.partNumber === 1 || p.partNumber === 5) {
        p.questions?.forEach((q) => {
          if (answers[q.number] && answers[q.number].toString().toLowerCase() === q.correct.toString().toLowerCase()) {
            correctCount++;
          }
        });
      } else if (p.partNumber === 2) {
        [...(p.questionsA || []), ...(p.questionsB || [])].forEach((q) => {
          if (answers[q.number] && answers[q.number].toString().toLowerCase() === q.correct.toString().toLowerCase()) {
            correctCount++;
          }
        });
      } else if (p.partNumber === 3) {
        p.situations?.forEach((s) => {
          if (answers[s.number] && answers[s.number].toString().toUpperCase() === s.correct.toString().toUpperCase()) {
            correctCount++;
          }
        });
      } else if (p.partNumber === 4) {
        p.items?.forEach((item) => {
          if (answers[item.number] && answers[item.number].toString().toLowerCase() === item.correct.toString().toLowerCase()) {
            correctCount++;
          }
        });
      }
    });

    const scoreResult = calculateGoetheReadingListeningScore(correctCount, 'B1');
    setIsSubmitted(true);
    setTimerRunning(false);

    saveEvaluation(
      {
        kind: 'goethe-lesen',
        rawScore: correctCount,
        maxRaw: 30,
        scaledPoints100: scoreResult.points100,
        praedikat: scoreResult.praedikat.label,
        passed: scoreResult.passed,
        answers,
      },
      {
        kind: 'goethe-lesen',
        module: 'B1',
        question: officialTest.title,
      }
    );
  };

  const handleReset = () => {
    setAnswers({});
    setIsSubmitted(false);
    setDynamicEvalResult(null);
    setTimeLeft(15 * 60);
    setTimerRunning(true);
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold mb-1.5 border border-emerald-200">
            <span>🇩🇪 Goethe-Zertifikat {selectedLevel}</span>
            <span>·</span>
            <span>Leseverstehen ({testSource === 'dynamic' ? 'KI-Aufgabe' : 'Modellsatz'})</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            {testSource === 'dynamic'
              ? dynamicTest?.title || `Goethe Lesen ${selectedLevel}`
              : officialTest.title}
          </h1>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {!isSubmitted ? (
            <button
              onClick={testSource === 'dynamic' ? handleSubmitDynamic : handleSubmitOfficial}
              disabled={isEvaluatingDynamic || isGenerating}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isEvaluatingDynamic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird ausgewertet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Abgeben</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs md:text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Neu starten</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode & Topic Generator Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Source Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setTestSource('dynamic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                testSource === 'dynamic'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Dynamisch generieren (KI)</span>
            </button>
            <button
              onClick={() => setTestSource('official')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                testSource === 'official'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Standard Modellsatz B1</span>
            </button>
          </div>

          {/* Dynamic Generator Parameters */}
          {testSource === 'dynamic' && (
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

              {/* Teil Selector */}
              <select
                value={selectedPartNum}
                onChange={(e) => setSelectedPartNum(Number(e.target.value))}
                className="p-2 rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800"
              >
                <option value="1">Teil 1</option>
                <option value="2">Teil 2</option>
                <option value="3">Teil 3</option>
                <option value="4">Teil 4</option>
                <option value="5">Teil 5</option>
              </select>

              <button
                onClick={handleGenerateDynamicTest}
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
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Neue Aufgabe</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Custom topic prompt input */}
        {testSource === 'dynamic' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500 whitespace-nowrap">Oder eigenes Wunschthema:</span>
            <input
              type="text"
              placeholder="z.B. Digitalisierung an Schulen, Künstliche Intelligenz im Alltag, Vegane Ernährung..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="flex-1 p-1.5 px-3 rounded-lg border border-slate-200 text-slate-800 text-xs"
            />
          </div>
        )}
      </div>

      {/* Error alert */}
      {genError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{genError}</span>
        </div>
      )}

      {/* DYNAMIC TEST EVALUATION BANNER */}
      {dynamicEvalResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fade-in">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Ergebnis · Goethe Lesen {dynamicEvalResult.level}
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white">
                {dynamicEvalResult.points100} / 100 Punkte
              </span>
              <span className="text-slate-400 text-sm">
                ({dynamicEvalResult.correctCount} von {dynamicEvalResult.totalQuestions} richtig)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              dynamicEvalResult.passed
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}>
              Prädikat: {dynamicEvalResult.praedikat} ({dynamicEvalResult.passed ? 'Bestanden' : 'Nicht bestanden'})
            </span>
          </div>
        </div>
      )}

      {/* DYNAMIC MODE VIEW */}
      {testSource === 'dynamic' && dynamicTest && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Passage Column (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {dynamicTest.partName || `Teil ${dynamicTest.partNumber}`} · Lesetext
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
                {dynamicTest.passage?.title || dynamicTest.title}
              </h2>
              {dynamicTest.passage?.source && (
                <span className="text-[11px] text-slate-400 italic">
                  Quelle: {dynamicTest.passage.source}
                </span>
              )}
            </div>

            <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-line space-y-4 font-normal">
              {dynamicTest.passage?.text}
            </div>
          </div>

          {/* Questions Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-sm text-slate-900">
                  Aufgaben ({dynamicTest.questions?.length || 0})
                </span>
                <span className="text-xs text-slate-500">
                  {Object.keys(answers).length} / {dynamicTest.questions?.length || 0} beantwortet
                </span>
              </div>

              <div className="space-y-4">
                {dynamicTest.questions?.map((q, idx) => {
                  const userAns = answers[q.number] || answers[q.id] || '';
                  const evalItem = dynamicEvalResult?.breakdown?.find(
                    (b) => b.number === q.number || b.id === q.id
                  );

                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        evalItem
                          ? evalItem.isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-rose-50/70 border-rose-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2 font-bold text-xs md:text-sm text-slate-900">
                        <span>{q.number}. {q.prompt}</span>
                        {evalItem && (
                          evalItem.isCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                          )
                        )}
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5 mt-2">
                        {q.options?.map((opt, oIdx) => {
                          const isSelected = userAns === opt;
                          return (
                            <button
                              key={oIdx}
                              disabled={isSubmitted}
                              onClick={() => handleSelectAnswer(q.number || q.id, opt)}
                              className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold border transition-all ${
                                isSelected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation when submitted */}
                      {evalItem && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-700">
                          <p className="font-bold text-slate-900 mb-0.5">
                            Richtige Lösung: <span className="text-emerald-700">{evalItem.correctAnswer}</span>
                          </p>
                          <p className="text-slate-600">{evalItem.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL MODELLSATZ VIEW (Legacy Fallback) */}
      {testSource === 'official' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-bold text-sm text-slate-900">
              Goethe B1 Modellsatz Hören &amp; Lesen
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((pNum) => (
                <button
                  key={pNum}
                  onClick={() => setActiveOfficialPart(pNum)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    activeOfficialPart === pNum
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Teil {pNum}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Wählen Sie oben einen Prüfungsteil aus oder wechseln Sie auf „Dynamisch generieren (KI)“, um maßgeschneiderte Leseaufgaben für jedes GER-Niveau (A2–C1) und Thema zu trainieren.
          </p>
        </div>
      )}
    </div>
  );
}
