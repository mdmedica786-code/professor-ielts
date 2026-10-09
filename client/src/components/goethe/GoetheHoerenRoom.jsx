import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_LISTENING_TESTS } from '../../data/goethe/goetheListeningTests';
import { calculateGoetheReadingListeningScore, GOETHE_LEVEL_SPECS } from '../../data/goethe/goetheGradingRules';
import { GOETHE_TOPICS } from '../../data/goethe/goetheTopics';
import api from '../../api/client';
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
  Sparkles,
  Loader2,
  Users,
} from 'lucide-react';

export default function GoetheHoerenRoom() {
  const { studentName, saveEvaluation, goetheLevel } = useApp();

  // Mode: 'dynamic' (AI Generated) or 'official' (Standard Modellsatz)
  const [testSource, setTestSource] = useState('dynamic');

  // Generator parameters
  const [selectedLevel, setSelectedLevel] = useState(goetheLevel || 'B1');
  const [selectedTopic, setSelectedTopic] = useState('Reisen und Verkehr');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedPartNum, setSelectedPartNum] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);

  // Dynamic test state
  const [dynamicTest, setDynamicTest] = useState(null);
  const [dynamicEvalResult, setDynamicEvalResult] = useState(null);
  const [isEvaluatingDynamic, setIsEvaluatingDynamic] = useState(false);

  // Interactive answer state
  const [answers, setAnswers] = useState({});
  const [playCount, setPlayCount] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeUtteranceIndex, setActiveUtteranceIndex] = useState(-1);
  const [showTranscripts, setShowTranscripts] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Speech synthesis reference (fallback when the server sent no audio)
  const currentUtteranceRef = useRef(null);
  // Server-rendered tts-1-hd audio for the whole Teil
  const serverAudioRef = useRef(null);

  const stopAllAudio = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (serverAudioRef.current) {
      serverAudioRef.current.pause();
      serverAudioRef.current = null;
    }
  };

  // Sync level with app context
  useEffect(() => {
    if (goetheLevel) setSelectedLevel(goetheLevel);
  }, [goetheLevel]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => stopAllAudio();
  }, []);

  // Auto-generate initial test if none loaded
  useEffect(() => {
    if (testSource === 'dynamic' && !dynamicTest && !isGenerating) {
      handleGenerateDynamicTest();
    }
  }, []);

  const handleGenerateDynamicTest = async () => {
    stopAllAudio();
    setIsPlayingAudio(false);
    setActiveUtteranceIndex(-1);
    setIsGenerating(true);
    setGenError(null);
    setDynamicEvalResult(null);
    setAnswers({});
    setPlayCount(0);
    setIsSubmitted(false);
    setShowTranscripts(false);

    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      const res = await api.post('/goethe/listening/generate', {
        level: selectedLevel,
        topic: topicToUse,
        partNumber: selectedPartNum,
      });

      if (res.data?.success && res.data.data) {
        setDynamicTest(res.data.data);
      } else {
        setGenError(res.data?.error || 'Fehler beim Erstellen des Hörtests.');
      }
    } catch (err) {
      console.error('Error generating listening test:', err);
      setGenError(err.response?.data?.error || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsGenerating(false);
    }
  };

  const playUtteranceSequence = (utterances, startIndex = 0) => {
    if (!window.speechSynthesis || !utterances || utterances.length === 0) {
      alert('Ihr Browser unterstützt keine Audio-Synthese. Bitte nutzen Sie die Transkript-Ansicht.');
      return;
    }

    if (startIndex >= utterances.length) {
      setIsPlayingAudio(false);
      setActiveUtteranceIndex(-1);
      setPlayCount((prev) => prev + 1);
      return;
    }

    setActiveUtteranceIndex(startIndex);
    setIsPlayingAudio(true);

    const u = utterances[startIndex];
    const synthUtterance = new SpeechSynthesisUtterance(u.text);
    synthUtterance.lang = 'de-DE';
    synthUtterance.rate = selectedLevel === 'A2' ? 0.88 : selectedLevel === 'B1' ? 0.95 : 1.0;
    synthUtterance.pitch = u.voice === 'nova' || u.speaker.toLowerCase().includes('frau') || u.speaker.toLowerCase().includes('moderatorin') ? 1.15 : 0.95;

    synthUtterance.onend = () => {
      // Pause slightly between speakers for authentic pacing
      setTimeout(() => {
        playUtteranceSequence(utterances, startIndex + 1);
      }, 550);
    };

    synthUtterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setIsPlayingAudio(false);
      setActiveUtteranceIndex(-1);
    };

    currentUtteranceRef.current = synthUtterance;
    window.speechSynthesis.speak(synthUtterance);
  };

  const handleTogglePlayAudio = () => {
    if (!dynamicTest?.utterances) return;

    const maxPlays = dynamicTest.maxPlays || 2;
    if (playCount >= maxPlays && !isPlayingAudio && !isSubmitted) {
      alert(`Dieser Prüfungsteil darf laut Goethe-Prüfungsordnung maximal ${maxPlays}× gehört werden.`);
      return;
    }

    if (isPlayingAudio) {
      stopAllAudio();
      setIsPlayingAudio(false);
      setActiveUtteranceIndex(-1);
    } else if (dynamicTest.audioData) {
      const audio = new Audio(`data:${dynamicTest.audioMimeType || 'audio/mpeg'};base64,${dynamicTest.audioData}`);
      serverAudioRef.current = audio;
      audio.onended = () => {
        serverAudioRef.current = null;
        setIsPlayingAudio(false);
        setPlayCount((prev) => prev + 1);
      };
      audio.onerror = () => {
        serverAudioRef.current = null;
        setIsPlayingAudio(false);
      };
      setIsPlayingAudio(true);
      audio.play().catch((err) => {
        console.warn('Server audio playback failed, falling back to browser speech:', err);
        serverAudioRef.current = null;
        playUtteranceSequence(dynamicTest.utterances, 0);
      });
    } else {
      playUtteranceSequence(dynamicTest.utterances, 0);
    }
  };

  const handleSelectAnswer = (itemKey, val) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [itemKey]: val }));
  };

  const handleSubmitDynamic = async () => {
    if (!dynamicTest?.token) return;
    stopAllAudio();
    setIsPlayingAudio(false);
    setIsEvaluatingDynamic(true);

    try {
      const res = await api.post('/goethe/listening/evaluate', {
        token: dynamicTest.token,
        answers,
        level: selectedLevel,
      });

      if (res.data?.success && res.data.data) {
        setDynamicEvalResult(res.data.data);
        setIsSubmitted(true);
        setShowTranscripts(true);

        saveEvaluation(
          {
            kind: 'goethe-hoeren',
            level: selectedLevel,
            rawScore: res.data.data.correctCount,
            maxRaw: res.data.data.totalQuestions,
            scaledPoints100: res.data.data.points100,
            praedikat: res.data.data.praedikat,
            passed: res.data.data.passed,
            answers,
          },
          {
            kind: 'goethe-hoeren',
            module: selectedLevel,
            question: dynamicTest.title,
          }
        );
      }
    } catch (err) {
      console.error('Error evaluating listening test:', err);
      alert('Fehler bei der Auswertung.');
    } finally {
      setIsEvaluatingDynamic(false);
    }
  };

  const handleReset = () => {
    stopAllAudio();
    setIsPlayingAudio(false);
    setActiveUtteranceIndex(-1);
    setAnswers({});
    setPlayCount(0);
    setIsSubmitted(false);
    setDynamicEvalResult(null);
    setShowTranscripts(false);
  };

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold mb-1.5 border border-amber-200">
            <span>🇩🇪 Goethe-Zertifikat {selectedLevel}</span>
            <span>·</span>
            <span>Hörverstehen ({testSource === 'dynamic' ? 'KI-Aufgabe' : 'Modellsatz'})</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            {dynamicTest?.title || `Goethe Hören ${selectedLevel}`}
          </h1>
        </div>

        {/* Submit Controls */}
        <div className="flex items-center gap-2.5">
          {!isSubmitted ? (
            <button
              onClick={handleSubmitDynamic}
              disabled={isEvaluatingDynamic || isGenerating}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isEvaluatingDynamic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird ausgewertet...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Hörtest abgeben</span>
                </>
              )}
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

      {/* Generator Control Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>KI-Hörtest Generator:</span>
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

            {/* Teil Selector */}
            <select
              value={selectedPartNum}
              onChange={(e) => setSelectedPartNum(Number(e.target.value))}
              className="p-2 rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800"
            >
              <option value="1">Teil 1: Durchsagen &amp; Alltagsgespräche</option>
              <option value="2">Teil 2: Führung &amp; Präsentation</option>
              <option value="3">Teil 3: Dialog / Unterhaltung</option>
              <option value="4">Teil 4: Radiosendung &amp; Experteninterview</option>
            </select>

            <button
              onClick={handleGenerateDynamicTest}
              disabled={isGenerating}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generiere Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Neuer Hörtest</span>
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
            placeholder="z.B. Interview über Elektromobilität, WG-Suche in München, Berufserfahrung im Handwerk..."
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

      {/* EVALUATION BANNER */}
      {dynamicEvalResult && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-fade-in">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Ergebnis · Goethe Hören {dynamicEvalResult.level}
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

      {/* AUDIO PLAYER & QUESTIONS */}
      {dynamicTest && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Audio Player Column (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-600" />
                <span>Audio-Wiedergabe</span>
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                Gehört: {playCount} / {dynamicTest.maxPlays || 2}×
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-950 flex flex-col gap-2">
              <span className="font-bold">Anweisung für Prüfungsteilnehmer:</span>
              <p className="leading-relaxed text-[11px]">
                {dynamicTest.instructions || "Sie hören den Text zweimal. Lösen Sie die Aufgaben beim Hören."}
              </p>
            </div>

            {/* Play/Stop Audio Button */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-slate-200 gap-3 text-center">
              <button
                onClick={handleTogglePlayAudio}
                disabled={playCount >= (dynamicTest.maxPlays || 2) && !isPlayingAudio && !isSubmitted}
                className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                  isPlayingAudio
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isPlayingAudio ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>

              <span className="text-xs font-bold text-slate-800">
                {isPlayingAudio ? 'Audio läuft (Klicken zum Stoppen)' : 'Audio jetzt abspielen'}
              </span>
              <span className="text-[11px] text-slate-400">
                Authentische deutsche Sprachausgabe mit Sprecherwechsel
              </span>
            </div>

            {/* Speakers preview */}
            <div className="flex flex-col gap-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                Beteiligte Sprecher:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dynamicTest.speakers?.map((sp, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-[11px]">
                    {sp.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Transcript Reveal Button */}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowTranscripts(!showTranscripts)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-slate-500" />
                <span>{showTranscripts ? 'Audioskript verbergen' : 'Audioskript anzeigen'}</span>
              </button>

              {showTranscripts && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 max-h-72 overflow-y-auto space-y-2 text-xs leading-relaxed">
                  {dynamicTest.utterances?.map((u, uIdx) => (
                    <div
                      key={uIdx}
                      className={`p-2 rounded-lg transition-colors ${
                        activeUtteranceIndex === uIdx ? 'bg-amber-100/90 font-semibold' : ''
                      }`}
                    >
                      <span className="font-bold text-slate-900 block mb-0.5">{u.speaker}:</span>
                      <p className="text-slate-700">{u.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Questions Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-900">
                  Prüfungsfragen ({dynamicTest.questions?.length || 0})
                </span>
                <span className="text-xs text-slate-500 font-semibold">
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
    </div>
  );
}
