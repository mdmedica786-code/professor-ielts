import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_TOPICS } from '../../data/goethe/goetheTopics';
import { GOETHE_SPEAKING_TASKS } from '../../data/goethe/goetheSpeakingTasks';
import api from '../../api/client';
import {
  Mic,
  MicOff,
  Square,
  Play,
  RotateCcw,
  Clock,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  MessageSquare,
  Award,
  Users,
  Presentation,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export default function GoetheSprechenRoom() {
  const { studentName, saveEvaluation, goetheLevel } = useApp();

  // Mode: 'dialogue' (Interactive back-and-forth with partner) vs 'monologue' (5-slide presentation)
  const [speakingMode, setSpeakingMode] = useState('dialogue');

  // Generator & task settings
  const [selectedLevel, setSelectedLevel] = useState(goetheLevel || 'B1');
  const [selectedTopic, setSelectedTopic] = useState('Freizeit und Hobbys');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTaskType, setSelectedTaskType] = useState('Teil 1: Gemeinsam etwas planen');

  // Live Back-and-Forth Dialogue State
  const [dialogueActive, setDialogueActive] = useState(false);
  const [history, setHistory] = useState([]); // [ { id, speaker: 'partner'|'candidate', text, audioUrl, redemittelTips } ]
  const [currentTips, setCurrentTips] = useState([]);
  const [isPartnerResponding, setIsPartnerResponding] = useState(false);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [inputText, setInputText] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const activeAudioRef = useRef(null);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef(null);

  // Sync level with app context
  useEffect(() => {
    if (goetheLevel) setSelectedLevel(goetheLevel);
  }, [goetheLevel]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isPartnerResponding]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const playPartnerAudio = (base64Audio, textFallback) => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    if (base64Audio) {
      try {
        const audioUrl = `data:audio/mp3;base64,${base64Audio}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        setIsPartnerSpeaking(true);

        audio.onended = () => {
          setIsPartnerSpeaking(false);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          console.warn('Audio playback error, using SpeechSynthesis fallback.');
          setIsPartnerSpeaking(false);
          fallbackTTS(textFallback);
        };

        audio.play().catch((err) => {
          console.warn('Audio autoplay prevented by browser:', err);
          setIsPartnerSpeaking(false);
          fallbackTTS(textFallback);
        });
        return;
      } catch (err) {
        console.warn('Base64 audio setup failed:', err);
      }
    }

    fallbackTTS(textFallback);
  };

  const fallbackTTS = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = selectedLevel === 'A2' ? 0.9 : 1.0;
    setIsPartnerSpeaking(true);
    u.onend = () => setIsPartnerSpeaking(false);
    u.onerror = () => setIsPartnerSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  // Start dialogue with initial greeting from partner
  const handleStartDialogue = async () => {
    setDialogueActive(true);
    setHistory([]);
    setEvaluation(null);
    setErrorMsg(null);
    setCurrentTips([]);
    setIsPartnerResponding(true);

    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      const res = await api.post('/goethe/speaking/partner-turn', {
        level: selectedLevel,
        topic: topicToUse,
        taskType: selectedTaskType,
        history: [],
        studentText: '',
      });

      if (res.data?.success && res.data.data) {
        const data = res.data.data;
        const initialTurn = {
          id: 'turn_1',
          speaker: 'partner',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory([initialTurn]);
        setCurrentTips(data.redemittelTips || []);
        playPartnerAudio(data.audioBase64, data.replyText);
      } else {
        setErrorMsg('Der Prüfungspartner konnte nicht gestartet werden.');
      }
    } catch (err) {
      console.error('Start dialogue error:', err);
      setErrorMsg(err.response?.data?.error || 'Verbindung zum Server fehlgeschlagen.');
    } finally {
      setIsPartnerResponding(false);
    }
  };

  // Send turn (either from audio blob or manual text)
  const handleSendTurn = async (audioBlobToSend = null, textToSend = '') => {
    const topicToUse = customTopic.trim() || selectedTopic;
    const currentText = (textToSend || inputText).trim();

    if (!audioBlobToSend && !currentText) return;

    setIsPartnerResponding(true);
    setErrorMsg(null);
    setInputText('');

    // Optimistically add candidate turn if text is already known
    if (currentText) {
      setHistory((prev) => [
        ...prev,
        {
          id: `cand_${Date.now()}`,
          speaker: 'candidate',
          text: currentText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    try {
      let res;
      if (audioBlobToSend) {
        const formData = new FormData();
        formData.append('audio', audioBlobToSend, 'candidate_turn.webm');
        formData.append('level', selectedLevel);
        formData.append('topic', topicToUse);
        formData.append('taskType', selectedTaskType);
        formData.append('history', JSON.stringify(history));

        res = await api.post('/goethe/speaking/partner-turn', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/goethe/speaking/partner-turn', {
          level: selectedLevel,
          topic: topicToUse,
          taskType: selectedTaskType,
          history,
          studentText: currentText,
        });
      }

      if (res.data?.success && res.data.data) {
        const data = res.data.data;

        // If audio was transcribed, update or add the candidate text
        if (audioBlobToSend && data.studentTranscript) {
          setHistory((prev) => [
            ...prev,
            {
              id: `cand_${Date.now()}`,
              speaker: 'candidate',
              text: data.studentTranscript,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }

        // Add partner's response
        const partnerTurn = {
          id: `partner_${Date.now()}`,
          speaker: 'partner',
          text: data.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setHistory((prev) => [...prev, partnerTurn]);
        setCurrentTips(data.redemittelTips || []);
        playPartnerAudio(data.audioBase64, data.replyText);
      } else {
        setErrorMsg('Fehler bei der Antwort des Partners.');
      }
    } catch (err) {
      console.error('Turn exchange error:', err);
      setErrorMsg(err.response?.data?.error || 'Fehler bei der Audio-Übertragung.');
    } finally {
      setIsPartnerResponding(false);
    }
  };

  // Start recording from microphone
  const startRecording = async () => {
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
        stream.getTracks().forEach((track) => track.stop());
        handleSendTurn(blob, '');
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setErrorMsg('Mikrofonzugriff nicht möglich. Bitte erlauben Sie den Mikrofonzugriff im Browser oder nutzen Sie die Texteingabe.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Finish dialogue and request official evaluation
  const handleFinishDialogue = async () => {
    if (history.length < 2) {
      alert('Bitte führen Sie zuerst mindestens 2 Gesprächsrunden mit dem Prüfungspartner.');
      return;
    }

    if (activeAudioRef.current) activeAudioRef.current.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsEvaluating(true);
    setErrorMsg(null);

    const topicToUse = customTopic.trim() || selectedTopic;
    try {
      const res = await api.post('/goethe/speaking/finish-dialogue', {
        level: selectedLevel,
        topic: topicToUse,
        taskType: selectedTaskType,
        history,
        studentName: studentName || 'Student',
      });

      if (res.data?.success && res.data.data) {
        setEvaluation(res.data.data);
        saveEvaluation(res.data.data, {
          kind: 'goethe-sprechen',
          module: selectedLevel,
          question: `${selectedTaskType} (${topicToUse})`,
        });
      } else {
        setErrorMsg('Fehler bei der Auswertung des Prüfungsgesprächs.');
      }
    } catch (err) {
      console.error('Finish dialogue error:', err);
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 text-xs font-bold mb-1.5 border border-rose-200">
            <span>🇩🇪 Goethe-Zertifikat {selectedLevel}</span>
            <span>·</span>
            <span>Mündliche Prüfung (Interaktiv mit KI-Partner)</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
            Sprechen: {selectedTaskType}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {dialogueActive && !evaluation && (
            <button
              onClick={handleFinishDialogue}
              disabled={isEvaluating || isPartnerResponding || isRecording}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Wird bewertet...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Gespräch beenden &amp; bewerten</span>
                </>
              )}
            </button>
          )}

          {evaluation && (
            <button
              onClick={() => {
                setEvaluation(null);
                setDialogueActive(false);
                setHistory([]);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs md:text-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Neues Gespräch</span>
            </button>
          )}
        </div>
      </div>

      {/* Setup & Topic Bar (when dialogue not yet active or configuring) */}
      {!dialogueActive && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              <span>Prüfungsgespräch einrichten (Goethe Prüfungsformat)</span>
            </span>
            <span className="text-xs text-slate-400">Direktes Hin- und Hersprechen</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            {/* Level selection */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Niveaustufe:</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800"
              >
                <option value="A2">Niveau A2 (Grundkenntnisse)</option>
                <option value="B1">Niveau B1 (Zertifikat B1)</option>
                <option value="B2">Niveau B2 (Fortgeschritten)</option>
                <option value="C1">Niveau C1 (Fachkundig)</option>
              </select>
            </div>

            {/* Task selection */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Prüfungsteil:</label>
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 text-slate-800"
              >
                <option value="Teil 1: Gemeinsam etwas planen">Teil 1: Gemeinsam etwas planen</option>
                <option value="Teil 2 & 3: Thema & Feedback / Fragen">Teil 2 &amp; 3: Thema &amp; Fragen / Feedback</option>
                <option value="Diskussion & Kontroverse Argumentation">Diskussion &amp; Kontroverse Argumentation</option>
              </select>
            </div>

            {/* Topic selection */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Thema (C1–C15):</label>
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setCustomTopic('');
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 text-slate-800 truncate"
              >
                {GOETHE_TOPICS.map((t) => (
                  <option key={t.id} value={t.title}>
                    {t.code}: {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom topic prompt */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500 whitespace-nowrap">Eigenes Wunschthema:</span>
            <input
              type="text"
              placeholder="z.B. Eine Abschiedsfeier für Kollegen organisieren, Ausflug in die Berge planen..."
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              className="flex-1 p-2 px-3 rounded-lg border border-slate-200 text-slate-800 text-xs"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleStartDialogue}
              disabled={isPartnerResponding}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              {isPartnerResponding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Partner bereitet sich vor...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Gespräch mit Partner starten</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ACTIVE DIALOGUE ROOM */}
      {dialogueActive && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Live Chat Timeline & Audio Indicator (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col min-h-[460px] max-h-[580px]">
              {/* Dialogue Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-xs md:text-sm text-slate-900">
                    Kandidat B (KI-Prüfungspartner)
                  </span>
                  {isPartnerSpeaking && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                      <Volume2 className="w-3 h-3 animate-bounce" />
                      Partner spricht...
                    </span>
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  {history.length} Wortmeldungen
                </span>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {history.map((msg) => {
                  const isPartner = msg.speaker === 'partner';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isPartner ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="font-bold text-[11px] text-slate-500">
                          {isPartner ? '🇩🇪 Prüfungspartner' : studentName || 'Sie (Kandidat)'}
                        </span>
                        <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                      </div>

                      <div
                        className={`p-4 rounded-2xl max-w-[85%] leading-relaxed text-sm ${
                          isPartner
                            ? 'bg-slate-100 text-slate-900 rounded-tl-xs shadow-xs'
                            : 'bg-slate-900 text-white rounded-tr-xs shadow-md'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {/* Partner thinking indicator */}
                {isPartnerResponding && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                    <span>Prüfungspartner hört zu &amp; antwortet auf Deutsch...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>

              {/* Bottom Speaking Controls */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 mt-auto">
                {/* Redemittel suggestion strip */}
                {currentTips && currentTips.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Passende Redemittel für Ihre Antwort:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentTips.map((tip, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputText(tip)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-medium border border-amber-200/80 transition-colors text-left"
                        >
                          {tip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recording / Text Input Area */}
                <div className="flex items-center gap-2">
                  {/* Microphone Record Button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isPartnerResponding}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs md:text-sm text-white shadow-md active:scale-95 transition-all ${
                      isRecording
                        ? 'bg-rose-600 hover:bg-rose-700 animate-pulse'
                        : 'bg-rose-500 hover:bg-rose-600'
                    } disabled:opacity-50`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-4 h-4 fill-current" />
                        <span>Fertig ({formatTimer(recordingSeconds)})</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Sprechen (Mikrofon)</span>
                      </>
                    )}
                  </button>

                  {/* Text Input backup */}
                  <input
                    type="text"
                    placeholder="Oder Antwort auf Deutsch tippen..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendTurn(null, inputText);
                    }}
                    className="flex-1 p-3 rounded-2xl border border-slate-200 text-xs text-slate-800"
                  />

                  <button
                    onClick={() => handleSendTurn(null, inputText)}
                    disabled={!inputText.trim() || isPartnerResponding}
                    className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Task Details & Evaluation (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Aufgabenstellung
              </span>
              <h3 className="font-bold text-sm text-slate-900">
                {selectedTaskType}
              </h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Thema: <span className="font-semibold text-slate-900">{customTopic || selectedTopic}</span>
              </p>
              <div className="text-[11px] text-slate-500 space-y-1">
                <p>• Gehen Sie auf die Vorschläge des Partners ein.</p>
                <p>• Machen Sie eigene konkrete Vorschläge.</p>
                <p>• Finden Sie gemeinsam eine Einigung.</p>
              </div>
            </div>

            {/* Evaluation Score Card */}
            {evaluation && (
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-md flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Goethe Prüfungsbewertung
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    evaluation.passed ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {evaluation.praedikat}
                  </span>
                </div>

                <div className="text-2xl font-extrabold text-slate-900">
                  {evaluation.scaledPoints100} / 100 Punkte
                </div>

                {evaluation.verdict && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                    {evaluation.verdict}
                  </p>
                )}

                {/* Grammar & vocab corrections */}
                {evaluation.grammarAndVocabFeedback && evaluation.grammarAndVocabFeedback.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-900 block">Sprachkorrekturen:</span>
                    {evaluation.grammarAndVocabFeedback.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-rose-50/60 border border-rose-200 text-[11px]">
                        <span className="line-through text-rose-700">{f.candidateSpoke}</span>
                        <p className="font-bold text-emerald-700">{f.correction}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{f.explanation}</p>
                      </div>
                    ))}
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
