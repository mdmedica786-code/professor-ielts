import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_SPEAKING_TASKS } from '../../data/goethe/goetheSpeakingTasks';
import api from '../../api/client';
import {
  Mic,
  Square,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Presentation,
  Calendar,
  MessageSquare,
  Award,
} from 'lucide-react';

export default function GoetheSprechenRoom() {
  const { studentName, saveEvaluation } = useApp();

  const [activePart, setActivePart] = useState(2); // 1: Planen, 2: Präsentieren, 3: Q&A
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);

  // Scratchpad for 15-min preparation
  const [prepNotes, setPrepNotes] = useState({
    slide1: '',
    slide2: '',
    slide3: '',
    slide4: '',
    slide5: '',
    general: '',
  });

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [inputMode, setInputMode] = useState('audio'); // 'audio' | 'text'

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const currentTeil2Topics = GOETHE_SPEAKING_TASKS.teil2 || [];
  const currentTopic = currentTeil2Topics[selectedTopicIndex] || currentTeil2Topics[0];

  const currentTeil1Tasks = GOETHE_SPEAKING_TASKS.teil1 || [];
  const currentPlanTask = currentTeil1Tasks[selectedTopicIndex] || currentTeil1Tasks[0];

  // Clean up audio on unmount or reset
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setErrorMsg('Mikrofonzugriff nicht möglich. Bitte erlauben Sie den Mikrofonzugriff im Browser oder nutzen Sie den Text-Modus.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setEvaluation(null);
    setErrorMsg(null);
  };

  const handleEvaluate = async () => {
    if (!audioBlob && !transcript.trim()) {
      setErrorMsg('Bitte nehmen Sie zuerst Ihre Antwort per Mikrofon auf oder geben Sie den Text ein.');
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);

    try {
      let res;
      if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'aufnahme.webm');
        formData.append('part', activePart);
        formData.append('topic', activePart === 2 ? currentTopic.title : currentPlanTask.title);
        formData.append('prompt', activePart === 2 ? JSON.stringify(currentTopic.slides) : currentPlanTask.context);
        formData.append('slideNotes', JSON.stringify(prepNotes));
        formData.append('studentName', studentName || 'Student');

        res = await api.post('/goethe/evaluate-speaking', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/goethe/evaluate-speaking', {
          part: activePart,
          topic: activePart === 2 ? currentTopic.title : currentPlanTask.title,
          prompt: activePart === 2 ? JSON.stringify(currentTopic.slides) : currentPlanTask.context,
          transcript,
          slideNotes: prepNotes,
          studentName: studentName || 'Student',
        });
      }

      if (res.data?.success) {
        setEvaluation(res.data.data);
        if (res.data.data.transcript) {
          setTranscript(res.data.data.transcript);
        }
        // Save to student history
        saveEvaluation(res.data.data, {
          kind: 'goethe-sprechen',
          module: 'B1',
          question: activePart === 2 ? currentTopic.title : currentPlanTask.title,
        });
      } else {
        setErrorMsg(res.data?.error || 'Fehler bei der mündlichen Bewertung.');
      }
    } catch (err) {
      console.error('Speaking evaluation error:', err);
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 text-xs font-bold mb-1.5 border border-rose-200">
            <span>🇩🇪 Goethe-Zertifikat B1</span>
            <span>·</span>
            <span>Mündliche Prüfung (ca. 15 Min · 100 Pkt)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            Sprechen Prüfungstraining
          </h1>
        </div>

        {/* 3 Prüfungsteile Pills */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1 self-start sm:self-auto">
          <button
            onClick={() => { setActivePart(1); resetRecording(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePart === 1
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Teil 1: Planen (28P)
          </button>
          <button
            onClick={() => { setActivePart(2); resetRecording(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePart === 2
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Teil 2: Präsentieren (40P)
          </button>
          <button
            onClick={() => { setActivePart(3); resetRecording(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activePart === 3
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Teil 3: Feedback (16P)
          </button>
        </div>
      </div>

      {/* TEIL 2: Präsentation (The largest block of the oral exam) */}
      {activePart === 2 && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Topics and 5 Slides Preview (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Präsentationsthema auswählen
              </label>
              <div className="flex flex-col gap-2">
                {currentTeil2Topics.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTopicIndex(idx); resetRecording(); }}
                    className={`p-3 rounded-xl text-left border text-xs md:text-sm font-semibold transition-all ${
                      selectedTopicIndex === idx
                        ? 'border-rose-500 bg-rose-50/60 text-rose-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* The 5 Official Slides breakdown */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Presentation className="w-4 h-4 text-rose-600" />
                  <span>Die 5 obligatorischen Folien</span>
                </span>
                <span className="text-xs text-slate-500 font-semibold">Richtzeit: ~3 Min.</span>
              </div>

              <div className="space-y-3">
                {currentTopic.slides.map((s) => (
                  <div key={s.number} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span>Folie {s.number}: {s.title}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] mb-1.5">{s.instruction}</p>
                    <div className="text-[11px] text-rose-700 italic bg-white p-1.5 rounded border border-slate-200 font-mono">
                      {s.cue}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: 15-Min Prep Scratchpad + Audio Recorder (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* 15-Min Preparation Scratchpad */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  <span>Vorbereitung (Stichpunkte für die 5 Folien)</span>
                </h3>
                <span className="text-[11px] text-slate-400">Nur Stichpunkte, keine ganzen Sätze!</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Folie 1 (Thema &amp; Struktur):</label>
                  <input
                    type="text"
                    value={prepNotes.slide1}
                    onChange={(e) => setPrepNotes({ ...prepNotes, slide1: e.target.value })}
                    placeholder="z.B. Thema: Online-Shopping, 4 Teile"
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Folie 2 (Eigene Erfahrung):</label>
                  <input
                    type="text"
                    value={prepNotes.slide2}
                    onChange={(e) => setPrepNotes({ ...prepNotes, slide2: e.target.value })}
                    placeholder="z.B. Jacke bestellt, zu klein, Retoure"
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Folie 3 (Heimatland z.B. Usbekistan):</label>
                  <input
                    type="text"
                    value={prepNotes.slide3}
                    onChange={(e) => setPrepNotes({ ...prepNotes, slide3: e.target.value })}
                    placeholder="z.B. Taschkent Apps vs. Basare auf dem Land"
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Folie 4 (Vor-/Nachteile &amp; Meinung):</label>
                  <input
                    type="text"
                    value={prepNotes.slide4}
                    onChange={(e) => setPrepNotes({ ...prepNotes, slide4: e.target.value })}
                    placeholder="z.B. Vorteil: Zeit sparen; Nachteil: Müll"
                    className="w-full p-2 rounded-lg border border-slate-200 text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Audio Recording & Speech Studio */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-2 self-end text-xs">
                <button
                  onClick={() => setInputMode('audio')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    inputMode === 'audio' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Mikrofon
                </button>
                <button
                  onClick={() => setInputMode('text')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    inputMode === 'text' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Text-Transkript
                </button>
              </div>

              {inputMode === 'audio' ? (
                <>
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                        isRecording
                          ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isRecording ? <Square className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                    </button>

                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-mono text-base font-bold text-slate-800">
                        {formatTimer(recordingSeconds)}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">/ ca. 03:00 Min</span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {isRecording ? 'Aufnahme läuft... Klicken zum Stoppen.' : 'Klicken Sie auf das Mikrofon, um Ihre Präsentation zu starten.'}
                    </span>
                  </div>

                  {/* Audio Player playback if recorded */}
                  {audioUrl && !isRecording && (
                    <div className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <audio controls src={audioUrl} className="h-8 max-w-xs" />
                      <button
                        onClick={resetRecording}
                        className="btn-ghost p-1.5 text-slate-400 hover:text-rose-600"
                        title="Aufnahme löschen"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full">
                  <textarea
                    rows={8}
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Geben Sie hier das Transkript Ihrer gesprochenen Präsentation auf Deutsch ein..."
                    className="w-full p-4 rounded-xl border border-slate-200 text-xs md:text-sm text-slate-800 outline-none focus:border-rose-500 leading-relaxed"
                  />
                </div>
              )}

              {errorMsg && (
                <div className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left">
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleEvaluate}
                disabled={isEvaluating || (!audioBlob && !transcript.trim())}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Goethe-Prüfer transkribiert &amp; bewertet Sprache...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Mündliche Präsentation bewerten lassen</span>
                  </>
                )}
              </button>
            </div>

            {/* Evaluation Results Card */}
            {evaluation && (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col gap-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      Goethe B1 Mündliche Bewertung
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-white">
                        {evaluation.totalPoints} / {evaluation.maxPoints || 56} Pkt
                      </span>
                      <span className="text-slate-400 text-sm">
                        ({evaluation.scaledPoints100} / 100 Pkt)
                      </span>
                    </div>
                  </div>

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

                {evaluation.verdict && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 italic">
                    „{evaluation.verdict}“
                  </div>
                )}

                {/* 5-Slide coverage verification */}
                {evaluation.slideBreakdown && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Foliencheck (Wurden alle 5 Folien behandelt?)
                    </h3>
                    <div className="space-y-2">
                      {evaluation.slideBreakdown.map((s) => (
                        <div
                          key={s.slide}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-start gap-2"
                        >
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                            s.covered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.covered ? '✓' : '✗'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900">Folie {s.slide} ({s.title}):</span>
                            <span className="text-slate-600 ml-1.5">{s.comment}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pronunciation & articulation tips */}
                {evaluation.pronunciationTips && evaluation.pronunciationTips.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-slate-800">
                    <span className="font-bold text-amber-900 block mb-1">
                      Aussprache &amp; Intonationstipps:
                    </span>
                    <ul className="space-y-1">
                      {evaluation.pronunciationTips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TEIL 1: Planen */}
      {activePart === 1 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                Teil 1: Gemeinsam etwas planen (~3 Minuten · 28 Punkte)
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{currentPlanTask.title}</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
              Partnerprüfung
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800">
            {currentPlanTask.context}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="font-bold text-sm text-slate-900 block mb-2">Die 4 Leitpunkte:</span>
              <ul className="space-y-2 text-xs text-slate-700">
                {currentPlanTask.leitpunkte.map((lp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{lp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <span className="font-bold text-sm text-slate-900 block mb-2">Beispieldialog:</span>
              <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans max-h-56 overflow-y-auto bg-slate-50 p-3 rounded-lg border border-slate-100">
                {currentPlanTask.sampleDialogue}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEIL 3: Feedback & Fragen */}
      {activePart === 3 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Teil 3: Über das Thema sprechen (~1–2 Min pro Teilnehmer · 16 Punkte)
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              Feedback geben, Fragen stellen &amp; Prüferfragen beantworten
            </h2>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs md:text-sm text-slate-800 leading-relaxed">
            {GOETHE_SPEAKING_TASKS.teil3.instructions}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {GOETHE_SPEAKING_TASKS.teil3.sampleQuestions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs">
                <span className="font-bold text-sm text-slate-900 block">Thema: „{q.topic}“</span>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-900">
                  <span className="font-bold block mb-0.5">Partner-Feedback:</span>
                  <span>{q.partnerFeedback}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-900">
                  <span className="font-bold block mb-0.5">Partner-Frage (W-Frage):</span>
                  <span>{q.partnerQuestion}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-900">
                  <span className="font-bold block mb-0.5">Prüferfrage:</span>
                  <span>{q.examinerQuestion}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
