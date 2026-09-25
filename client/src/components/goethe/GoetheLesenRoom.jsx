import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_READING_TESTS } from '../../data/goethe/goetheReadingTests';
import { calculateGoetheReadingListeningScore } from '../../data/goethe/goetheGradingRules';
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
} from 'lucide-react';

export default function GoetheLesenRoom() {
  const { studentName, saveEvaluation } = useApp();

  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [activePart, setActivePart] = useState(1); // 1 to 5, or 'all'
  const [answers, setAnswers] = useState({}); // { [itemNumber]: value }
  const [timeLeft, setTimeLeft] = useState(65 * 60);
  const [timerRunning, setTimerRunning] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);

  const test = GOETHE_READING_TESTS[activeTestIndex] || GOETHE_READING_TESTS[0];

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerRunning && timeLeft > 0 && !isSubmitted) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft, isSubmitted]);

  const handleSelectAnswer = (itemNum, val) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [itemNum]: val }));
  };

  // Calculate score
  let correctCount = 0;
  test.parts.forEach((p) => {
    if (p.partNumber === 1 || p.partNumber === 5) {
      p.questions.forEach((q) => {
        if (answers[q.number] && answers[q.number].toString().toLowerCase() === q.correct.toString().toLowerCase()) {
          correctCount++;
        }
      });
    } else if (p.partNumber === 2) {
      [...p.questionsA, ...p.questionsB].forEach((q) => {
        if (answers[q.number] && answers[q.number].toString().toLowerCase() === q.correct.toString().toLowerCase()) {
          correctCount++;
        }
      });
    } else if (p.partNumber === 3) {
      p.situations.forEach((s) => {
        if (answers[s.number] && answers[s.number].toString().toUpperCase() === s.correct.toString().toUpperCase()) {
          correctCount++;
        }
      });
    } else if (p.partNumber === 4) {
      p.items.forEach((item) => {
        if (answers[item.number] && answers[item.number].toString().toLowerCase() === item.correct.toString().toLowerCase()) {
          correctCount++;
        }
      });
    }
  });

  const scoreResult = calculateGoetheReadingListeningScore(correctCount);

  const handleSubmit = () => {
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
        question: test.title,
      }
    );
  };

  const handleReset = () => {
    setAnswers({});
    setTimeLeft(65 * 60);
    setTimerRunning(true);
    setIsSubmitted(false);
    setShowAnswerKey(false);
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
            <span>🇩🇪 Goethe-Zertifikat B1</span>
            <span>·</span>
            <span>Leseverstehen (65 Min · 30 Items · 100 Pkt)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            {test.title}
          </h1>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Test abgeben</span>
            </button>
          ) : (
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs md:text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Neu starten</span>
            </button>
          )}
        </div>
      </div>

      {/* Part Navigation Pills (Teil 1 to 5 or All) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5].map((pNum) => (
          <button
            key={pNum}
            onClick={() => setActivePart(pNum)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activePart === pNum
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Teil {pNum}
          </button>
        ))}
        <button
          onClick={() => setActivePart('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activePart === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Alle 5 Teile
        </button>
      </div>

      {/* Score Banner when Submitted */}
      {isSubmitted && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fade-in">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Offizielle Auswertung Leseverstehen
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-white">
                {scoreResult.points100} / 100 Punkte
              </span>
              <span className="text-slate-400 text-sm">
                ({correctCount} von 30 richtig · Bestehensgrenze: 18 / 60 Pkt)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-sm md:text-base font-extrabold px-3 py-1.5 rounded-lg border ${
                scoreResult.passed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {scoreResult.praedikat.label}
            </span>
          </div>
        </div>
      )}

      {/* TEIL 1: Blogbeitrag (Richtig / Falsch) */}
      {(activePart === 1 || activePart === 'all') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {test.parts[0].title} (Richtzeit: ~10 Min · 6 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[0].instruction}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
              {test.parts[0].text}
            </div>

            <div className="lg:col-span-6 space-y-3">
              {test.parts[0].questions.map((q) => {
                const userAns = answers[q.number];
                const isCorrect = userAns === q.correct;
                return (
                  <div key={q.number} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start gap-2 text-xs md:text-sm text-slate-800 font-medium">
                      <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                        {q.number}
                      </span>
                      <span>{q.statement}</span>
                    </div>

                    <div className="flex gap-2 pt-1 pl-7">
                      {['richtig', 'falsch'].map((val) => (
                        <button
                          key={val}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(q.number, val)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize transition-all ${
                            userAns === val
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>

                    {isSubmitted && (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                        isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                        <div>
                          <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Antwort: ${q.correct})`}</strong>
                          <p className="text-[11px] text-slate-600 mt-0.5">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TEIL 2: 2 Presseartikel (a/b/c) */}
      {(activePart === 2 || activePart === 'all') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {test.parts[1].title} (Richtzeit: ~20 Min · 6 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[1].instruction}</p>
          </div>

          {/* Text A */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
              {test.parts[1].textA}
            </div>

            <div className="lg:col-span-6 space-y-3">
              {test.parts[1].questionsA.map((q) => {
                const userAns = answers[q.number];
                const isCorrect = userAns === q.correct;
                return (
                  <div key={q.number} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-xs md:text-sm font-bold text-slate-900 block">
                      {q.number}. {q.stem}
                    </span>
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt.key}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(q.number, opt.key)}
                          className={`w-full text-left p-2 rounded-lg text-xs border transition-all flex items-start gap-2 ${
                            userAns === opt.key
                              ? 'bg-slate-900 text-white font-bold border-slate-900'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="font-bold">{opt.key})</span>
                          <span>{opt.text}</span>
                        </button>
                      ))}
                    </div>
                    {isSubmitted && (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                        isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                        <div>
                          <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Lösung: ${q.correct})`}</strong>
                          <p className="text-[11px] text-slate-600 mt-0.5">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Text B */}
          <div className="grid gap-6 lg:grid-cols-12 pt-4 border-t border-slate-100">
            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
              {test.parts[1].textB}
            </div>

            <div className="lg:col-span-6 space-y-3">
              {test.parts[1].questionsB.map((q) => {
                const userAns = answers[q.number];
                const isCorrect = userAns === q.correct;
                return (
                  <div key={q.number} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-xs md:text-sm font-bold text-slate-900 block">
                      {q.number}. {q.stem}
                    </span>
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt.key}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(q.number, opt.key)}
                          className={`w-full text-left p-2 rounded-lg text-xs border transition-all flex items-start gap-2 ${
                            userAns === opt.key
                              ? 'bg-slate-900 text-white font-bold border-slate-900'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="font-bold">{opt.key})</span>
                          <span>{opt.text}</span>
                        </button>
                      ))}
                    </div>
                    {isSubmitted && (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                        isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                        <div>
                          <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Lösung: ${q.correct})`}</strong>
                          <p className="text-[11px] text-slate-600 mt-0.5">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TEIL 3: Anzeigen-Zuordnung (10 Anzeigen A–J, 7 Situationen, 1 = 0) */}
      {(activePart === 3 || activePart === 'all') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {test.parts[2].title} (Richtzeit: ~10 Min · 7 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[2].instruction}</p>
          </div>

          {/* 10 Ads Overview Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
              Verfügbare Anzeigen (A–J):
            </span>
            <div className="grid gap-2 sm:grid-cols-2 text-xs">
              {test.parts[2].ads.map((ad) => (
                <div key={ad.key} className="p-2 rounded-lg bg-white border border-slate-200 flex items-start gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs flex-shrink-0">
                    {ad.key}
                  </span>
                  <span className="text-slate-700 leading-tight">{ad.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7 Situations with Matching Selector */}
          <div className="space-y-3">
            {test.parts[2].situations.map((sit) => {
              const userAns = answers[sit.number];
              const isCorrect = userAns === sit.correct;
              return (
                <div key={sit.number} className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col gap-2">
                  <div className="flex items-start gap-2 text-xs md:text-sm text-slate-800 font-semibold">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                      {sit.number}
                    </span>
                    <span>{sit.person}</span>
                  </div>

                  {/* Letter Buttons: A, B, C, D, E, F, G, H, I, J, and 0 */}
                  <div className="flex items-center gap-1.5 flex-wrap pl-7">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', '0'].map((opt) => (
                      <button
                        key={opt}
                        disabled={isSubmitted}
                        onClick={() => handleSelectAnswer(sit.number, opt)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold border transition-all flex items-center justify-center ${
                          userAns === opt
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  {isSubmitted && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                      isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                      <div>
                        <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Anzeige: ${sit.correct})`}</strong>
                        <p className="text-[11px] text-slate-600 mt-0.5">{sit.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEIL 4: Leserbriefe (Ja / Nein) */}
      {(activePart === 4 || activePart === 'all') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {test.parts[3].title} (Richtzeit: ~15 Min · 7 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[3].instruction}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs md:text-sm font-bold text-amber-900">
            Streitfrage: „{test.parts[3].centralQuestion}“
          </div>

          <div className="space-y-3">
            {test.parts[3].items.map((it) => {
              const userAns = answers[it.number];
              const isCorrect = userAns === it.correct;
              return (
                <div key={it.number} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs md:text-sm text-slate-900">
                      {it.number}. {it.author}
                    </span>
                    <div className="flex gap-2">
                      {['ja', 'nein'].map((val) => (
                        <button
                          key={val}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(it.number, val)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border capitalize transition-all ${
                            userAns === val
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    „{it.comment}“
                  </p>

                  {isSubmitted && (
                    <div className={`mt-1 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                      isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                      <div>
                        <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Antwort: ${it.correct.toUpperCase()})`}</strong>
                        <p className="text-[11px] text-slate-600 mt-0.5">{it.explanation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEIL 5: Hausordnung & Vorschriften (a/b/c) */}
      {(activePart === 5 || activePart === 'all') && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
              {test.parts[4].title} (Richtzeit: ~10 Min · 4 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[4].instruction}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line">
              {test.parts[4].text}
            </div>

            <div className="lg:col-span-6 space-y-3">
              {test.parts[4].questions.map((q) => {
                const userAns = answers[q.number];
                const isCorrect = userAns === q.correct;
                return (
                  <div key={q.number} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
                    <span className="text-xs md:text-sm font-bold text-slate-900 block">
                      {q.number}. {q.stem}
                    </span>
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <button
                          key={opt.key}
                          disabled={isSubmitted}
                          onClick={() => handleSelectAnswer(q.number, opt.key)}
                          className={`w-full text-left p-2 rounded-lg text-xs border transition-all flex items-start gap-2 ${
                            userAns === opt.key
                              ? 'bg-slate-900 text-white font-bold border-slate-900'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span className="font-bold">{opt.key})</span>
                          <span>{opt.text}</span>
                        </button>
                      ))}
                    </div>
                    {isSubmitted && (
                      <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                        isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                      }`}>
                        {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                        <div>
                          <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Lösung: ${q.correct})`}</strong>
                          <p className="text-[11px] text-slate-600 mt-0.5">{q.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
