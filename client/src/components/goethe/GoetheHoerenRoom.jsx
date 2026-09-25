import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_LISTENING_TESTS } from '../../data/goethe/goetheListeningTests';
import { calculateGoetheReadingListeningScore } from '../../data/goethe/goetheGradingRules';
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Volume2,
  FileText,
  AlertCircle,
} from 'lucide-react';

export default function GoetheHoerenRoom() {
  const { studentName, saveEvaluation } = useApp();

  const [activeTestIndex, setActiveTestIndex] = useState(0);
  const [activePart, setActivePart] = useState(1); // 1 to 4
  const [answers, setAnswers] = useState({});
  const [playCounts, setPlayCounts] = useState({}); // { [audioKey]: number }
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingKey, setCurrentSpeakingKey] = useState(null);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const test = GOETHE_LISTENING_TESTS[activeTestIndex] || GOETHE_LISTENING_TESTS[0];

  // Stop TTS on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSelectAnswer = (itemNum, val) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [itemNum]: val }));
  };

  const playAudio = (audioKey, text, maxPlays = 2) => {
    const currentPlays = playCounts[audioKey] || 0;
    if (currentPlays >= maxPlays && !isSubmitted) {
      alert(`Dieser Prüfungsteil darf laut Goethe-Prüfungsordnung maximal ${maxPlays}× gehört werden.`);
      return;
    }

    if (!window.speechSynthesis) {
      alert('Ihr Browser unterstützt keine Audio-Synthese. Bitte nutzen Sie die Text-Ansicht.');
      return;
    }

    if (isSpeaking && currentSpeakingKey === audioKey) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSpeakingKey(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95; // realistic exam pace

    // Try to find German voice
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.startsWith('de')) || null;
    if (deVoice) utterance.voice = deVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setCurrentSpeakingKey(audioKey);
      setPlayCounts((prev) => ({ ...prev, [audioKey]: (prev[audioKey] || 0) + 1 }));
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingKey(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentSpeakingKey(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Calculate score
  let correctCount = 0;
  test.parts.forEach((p) => {
    if (p.partNumber === 1) {
      p.tracks.forEach((track) => {
        track.items.forEach((item) => {
          if (answers[item.number] && answers[item.number].toString().toLowerCase() === item.correct.toString().toLowerCase()) {
            correctCount++;
          }
        });
      });
    } else if (p.partNumber === 2 || p.partNumber === 3 || p.partNumber === 4) {
      p.questions ? p.questions.forEach((q) => {
        if (answers[q.number] && answers[q.number].toString().toLowerCase() === q.correct.toString().toLowerCase()) {
          correctCount++;
        }
      }) : p.items.forEach((it) => {
        if (answers[it.number] && answers[it.number].toString().toLowerCase() === it.correct.toString().toLowerCase()) {
          correctCount++;
        }
      });
    }
  });

  const scoreResult = calculateGoetheReadingListeningScore(correctCount);

  const handleSubmit = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsSubmitted(true);
    saveEvaluation(
      {
        kind: 'goethe-hoeren',
        rawScore: correctCount,
        maxRaw: 30,
        scaledPoints100: scoreResult.points100,
        praedikat: scoreResult.praedikat.label,
        passed: scoreResult.passed,
        answers,
      },
      {
        kind: 'goethe-hoeren',
        module: 'B1',
        question: test.title,
      }
    );
  };

  const handleReset = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setAnswers({});
    setPlayCounts({});
    setIsSubmitted(false);
    setShowTranscripts(false);
  };

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold mb-1.5 border border-amber-200">
            <span>🇩🇪 Goethe-Zertifikat B1</span>
            <span>·</span>
            <span>Hörverstehen (ca. 40 Min · 30 Items · 100 Pkt)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            {test.title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTranscripts(!showTranscripts)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showTranscripts ? 'Transkripte verbergen' : 'Transkripte einblenden'}</span>
          </button>

          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Hören abgeben</span>
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

      {/* Part Navigation */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((pNum) => (
          <button
            key={pNum}
            onClick={() => setActivePart(pNum)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activePart === pNum
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Teil {pNum} {pNum === 1 || pNum === 4 ? '(2× abgespielt)' : '(1× abgespielt)'}
          </button>
        ))}
      </div>

      {/* Score Banner when Submitted */}
      {isSubmitted && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fade-in">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Ergebnis Hörverstehen
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

      {/* TEIL 1: Alltagsdurchsagen (2x) */}
      {activePart === 1 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
              Teil 1: 5 Alltagsdurchsagen (Jeder Text wird 2× gespielt · 10 Aufgaben)
            </span>
            <p className="text-xs text-slate-500 mt-1">{test.parts[0].instruction}</p>
          </div>

          <div className="space-y-6">
            {test.parts[0].tracks.map((t) => {
              const audioKey = `p1_t${t.trackNumber}`;
              const plays = playCounts[audioKey] || 0;
              const isPlaying = isSpeaking && currentSpeakingKey === audioKey;

              return (
                <div key={t.trackNumber} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                  {/* Track Header & Audio Player */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{t.title}</h3>
                      <span className="text-[11px] text-slate-500">
                        Bereits {plays} von maximal 2× abgespielt
                      </span>
                    </div>

                    <button
                      onClick={() => playAudio(audioKey, t.audioScript, 2)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isPlaying
                          ? 'bg-amber-600 text-white animate-pulse'
                          : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'Audio stoppen' : plays === 0 ? 'Erstes Hören starten' : plays === 1 ? 'Zweites Hören starten' : '2× bereits gehört'}</span>
                    </button>
                  </div>

                  {/* Transcript View if toggled */}
                  {showTranscripts && (
                    <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-slate-800 italic">
                      <span className="font-bold block not-italic mb-1">Transkript:</span>
                      „{t.audioScript}“
                    </div>
                  )}

                  {/* 2 Questions per Track (1 R/F + 1 a/b/c) */}
                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    {t.items.map((item) => {
                      const userAns = answers[item.number];
                      const isCorrect = userAns === item.correct;

                      return (
                        <div key={item.number} className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                          <span className="text-xs md:text-sm font-bold text-slate-900 block">
                            {item.number}. {item.statement || item.stem}
                          </span>

                          {item.type === 'tf' ? (
                            <div className="flex gap-2">
                              {['richtig', 'falsch'].map((val) => (
                                <button
                                  key={val}
                                  disabled={isSubmitted}
                                  onClick={() => handleSelectAnswer(item.number, val)}
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
                          ) : (
                            <div className="space-y-1.5">
                              {item.options.map((opt) => (
                                <button
                                  key={opt.key}
                                  disabled={isSubmitted}
                                  onClick={() => handleSelectAnswer(item.number, opt.key)}
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
                          )}

                          {isSubmitted && (
                            <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                              isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                            }`}>
                              {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                              <div>
                                <strong>{isCorrect ? 'Richtig!' : `Falsch (Lösung: ${item.correct})`}</strong>
                                <p className="text-[11px] text-slate-600 mt-0.5">{item.explanation}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TEIL 2: Führung / Monolog (1x) */}
      {activePart === 2 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Teil 2: Führung / Monolog (Wird nur 1× gehört! · 5 Aufgaben)
              </span>
              <p className="text-xs text-slate-500 mt-1">{test.parts[1].instruction}</p>
            </div>

            <button
              onClick={() => playAudio('p2_audio', test.parts[1].audioScript, 1)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>Einmalige Audioführung starten</span>
            </button>
          </div>

          {showTranscripts && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 italic leading-relaxed">
              <span className="font-bold block not-italic mb-1">Transkript der Führung:</span>
              „{test.parts[1].audioScript}“
            </div>
          )}

          <div className="space-y-3">
            {test.parts[1].questions.map((q) => {
              const userAns = answers[q.number];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.number} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
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
      )}

      {/* TEIL 3: Informelles Gespräch (1x) */}
      {activePart === 3 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Teil 3: Informelles Gespräch (Wird nur 1× gehört! · 7 Aufgaben)
              </span>
              <p className="text-xs text-slate-500 mt-1">{test.parts[2].instruction}</p>
            </div>

            <button
              onClick={() => playAudio('p3_audio', test.parts[2].audioScript, 1)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>Einmaliges Gespräch abspielen</span>
            </button>
          </div>

          {showTranscripts && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 italic leading-relaxed whitespace-pre-line">
              <span className="font-bold block not-italic mb-1">Transkript:</span>
              {test.parts[2].audioScript}
            </div>
          )}

          <div className="space-y-3">
            {test.parts[2].questions.map((q) => {
              const userAns = answers[q.number];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.number} className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2 text-xs md:text-sm text-slate-800 font-medium">
                    <span className="w-5 h-5 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs flex-shrink-0">
                      {q.number}
                    </span>
                    <span>{q.statement}</span>
                  </div>

                  <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
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
                    <div className={`w-full mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
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
      )}

      {/* TEIL 4: Radiodiskussion (2x) */}
      {activePart === 4 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                Teil 4: Radiodiskussion – Wer sagt was? (Wird 2× gehört · 8 Aufgaben)
              </span>
              <p className="text-xs text-slate-500 mt-1">{test.parts[3].instruction}</p>
            </div>

            <button
              onClick={() => playAudio('p4_audio', test.parts[3].audioScript, 2)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4" />
              <span>Radiosendung abspielen (2× erlaubt)</span>
            </button>
          </div>

          {showTranscripts && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800 italic leading-relaxed whitespace-pre-line">
              <span className="font-bold block not-italic mb-1">Transkript:</span>
              {test.parts[3].audioScript}
            </div>
          )}

          <div className="space-y-3">
            {test.parts[3].items.map((it) => {
              const userAns = answers[it.number];
              const isCorrect = userAns === it.correct;
              return (
                <div key={it.number} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <span className="text-xs md:text-sm font-semibold text-slate-900 block">
                    {it.number}. „{it.statement}“
                  </span>

                  {/* 3 Speaker Options: Moderator, Frau Berger, Dr. Klein */}
                  <div className="grid gap-1.5 sm:grid-cols-3 pt-1">
                    {test.parts[3].speakers.map((spk) => (
                      <button
                        key={spk.key}
                        disabled={isSubmitted}
                        onClick={() => handleSelectAnswer(it.number, spk.key)}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${
                          userAns === spk.key
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {spk.label}
                      </button>
                    ))}
                  </div>

                  {isSubmitted && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-start gap-1.5 ${
                      isCorrect ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                    }`}>
                      {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
                      <div>
                        <strong>{isCorrect ? 'Richtig!' : `Falsch (Richtige Zuordnung: ${test.parts[3].speakers.find(s => s.key === it.correct)?.label})`}</strong>
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
    </div>
  );
}
