import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { Mic, Square, Loader2, AlertCircle, Users, UserRound, GraduationCap, RotateCcw, Send, Sparkles, Keyboard, Flag, Award } from 'lucide-react';
import ExamModeToggle from './shared/ExamModeToggle';
import ExamTimer from './shared/ExamTimer';
import { useCountdown, formatClock } from './shared/useCountdown';
import ExamSetupBar from './shared/ExamSetupBar';
import BilingualInstructionBanner from './shared/BilingualInstructionBanner';
import TeilTabs from './shared/TeilTabs';
import { useExamMode } from './shared/useExamMode';
import { useGoetheFormat } from './shared/useGoetheFormat';
import { playEndChime, playTurnChime } from './shared/examSounds';
import SpeakingTaskSheet, { SlideDeck } from './SpeakingTaskSheet';
import SpeakingReport from './SpeakingReport';
import { summarizeSpeaking } from './speakingScore';
import { useSpeechRecorder } from './useSpeechRecorder';

const PARTNERS = [
  { name: 'Florian', desc: 'Prüfungspartner · ruhig und sachlich' },
  { name: 'Sarah', desc: 'Prüfungspartnerin · lebhaft und kreativ' },
];

let turnSeq = 0;
const clock = () => Date.now();
const nextId = (prefix) => `${prefix}_${Date.now()}_${turnSeq++}`;

/** Plays one AI turn: server mp3, or browser speech as a fallback. */
function playTurnAudio(turn, audioRef, level) {
  return new Promise((resolve) => {
    if (turn.audioBase64) {
      const audio = new Audio(`data:audio/mpeg;base64,${turn.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    const u = new SpeechSynthesisUtterance(turn.text);
    u.lang = 'de-DE';
    u.rate = level === 'A2' ? 0.9 : 1;
    u.pitch = turn.role === 'examiner' ? 1.05 : turn.name === 'Sarah' ? 1.2 : 0.9;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

function SpeakerCard({ icon: Icon, name, role, active, status }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
        active ? 'border-emerald-400 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white'
      }`}
    >
      <span className="relative flex-shrink-0">
        {active && <span className="absolute inset-0 rounded-full bg-emerald-400/50 animate-ping" />}
        <span className={`relative w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
          <Icon className="w-5 h-5" />
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-slate-900 truncate">{name}</span>
        <span className="block text-[11px] font-semibold text-slate-500 truncate">{status || role}</span>
      </span>
    </div>
  );
}

function SprechenExam({ level, onLevelChange }) {
  const { saveEvaluation, studentName } = useApp();
  const { isExam, isLearn } = useExamMode();
  const { format, error: formatError } = useGoetheFormat(level);
  const sprechen = format?.sprechen;

  const [phase, setPhase] = useState('setup'); // setup | sheets | prep | exam | evaluating | report
  const [topic, setTopic] = useState('');
  const [partnerName, setPartnerName] = useState('Florian');
  const [scope, setScope] = useState('all');
  const [sheets, setSheets] = useState({});
  const [notes, setNotes] = useState({});
  const [prepTeil, setPrepTeil] = useState(1);
  const [prepPaused, setPrepPaused] = useState(false);
  const [examTeile, setExamTeile] = useState([]);
  const [teilIdx, setTeilIdx] = useState(0);
  const [histories, setHistories] = useState({});
  const [aiBusy, setAiBusy] = useState(false);
  const [speaking, setSpeaking] = useState(null); // 'examiner' | 'partner' | null
  const [yourTurn, setYourTurn] = useState(false);
  const [tips, setTips] = useState([]);
  const [teilStart, setTeilStart] = useState(0);
  const [now, setNow] = useState(0);
  const [typed, setTyped] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [evaluations, setEvaluations] = useState({});
  const [error, setError] = useState(null);

  const recorder = useSpeechRecorder();
  const historiesRef = useRef({});
  const audioRef = useRef(null);
  const timeUpSentRef = useRef({});
  const savedRef = useRef(false);
  const teilStartRef = useRef(0);

  const currentTeilNr = examTeile[teilIdx];
  const currentTeil = sprechen?.teile.find((t) => t.teil === currentTeilNr);
  const elapsed = teilStart ? Math.max(0, Math.round((now - teilStart) / 1000)) : 0;

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    window.speechSynthesis?.cancel();
  };
  useEffect(() => stopAudio, []);

  const startTeilClock = () => {
    const t = clock();
    teilStartRef.current = t;
    setTeilStart(t);
    setNow(t);
  };

  const pushTurns = (teil, turns) => {
    const next = { ...historiesRef.current, [teil]: [...(historiesRef.current[teil] || []), ...turns] };
    historiesRef.current = next;
    setHistories(next);
  };

  const playTurns = async (turns) => {
    for (const turn of turns) {
      setSpeaking(turn.role);
      await playTurnAudio(turn, audioRef, level);
    }
    setSpeaking(null);
  };

  const finishExam = async (teile) => {
    stopAudio();
    setPhase('evaluating');
    setError(null);
    const withSpeech = teile.filter((t) => (historiesRef.current[t] || []).some((h) => h.speaker === 'candidate'));
    if (!withSpeech.length) {
      setError('Es wurden keine Redebeiträge aufgezeichnet. Die Prüfung kann nicht bewertet werden.');
      setPhase('exam');
      return;
    }
    const results = await Promise.all(
      withSpeech.map((teil) =>
        api
          .post('/goethe/speaking/finish-dialogue', {
            level,
            teil,
            topic,
            taskSheet: sheets[teil],
            history: (historiesRef.current[teil] || []).map(({ speaker, text }) => ({ speaker, text })),
            studentName: studentName || 'Student',
          })
          .then((res) => [teil, res.data?.data])
          .catch((err) => {
            setError(err.response?.data?.error || 'Ein Teil konnte nicht bewertet werden.');
            return [teil, null];
          })
      )
    );
    setEvaluations(Object.fromEntries(results.filter(([, ev]) => ev)));
    setPhase('report');
  };

  /**
   * Sends one event of the Paarprüfung to the server and plays the AI turns.
   * After 'end' / 'time_up' the next Teil starts automatically.
   */
  const sendEvent = async (event, { teil, teile = examTeile, index = teilIdx, recording = null, text = '', firstTeil = false, afterPreparation = false } = {}) => {
    setAiBusy(true);
    setYourTurn(false);
    setError(null);
    const fields = {
      mode: 'exam',
      level,
      teil,
      topic,
      partnerName,
      event,
      firstTeil,
      afterPreparation,
      elapsedSeconds: teilStartRef.current ? Math.round((clock() - teilStartRef.current) / 1000) : 0,
      studentText: text,
    };
    const history = (historiesRef.current[teil] || []).map(({ speaker, text: t }) => ({ speaker, text: t }));

    let data;
    try {
      let res;
      if (recording?.blob) {
        const form = new FormData();
        form.append('audio', recording.blob, recording.filename);
        Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
        form.append('history', JSON.stringify(history));
        form.append('taskSheet', JSON.stringify(sheets[teil] || {}));
        res = await api.post('/goethe/speaking/partner-turn', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await api.post('/goethe/speaking/partner-turn', { ...fields, history, taskSheet: sheets[teil] || {} });
      }
      data = res.data?.data;
      if (!data) throw new Error(res.data?.error);
    } catch (err) {
      setAiBusy(false);
      setYourTurn(event === 'candidate');
      setError(err.response?.data?.error || err.message || 'Verbindung zum Server fehlgeschlagen.');
      return;
    }

    const newTurns = [];
    if (event === 'candidate') {
      newTurns.push({ id: nextId('cand'), speaker: 'candidate', text: data.studentTranscript || text, audioUrl: recording?.url || null });
    }
    data.turns.forEach((t) => newTurns.push({ id: nextId(t.role), speaker: t.role, name: t.name, text: t.text }));
    pushTurns(teil, newTurns);
    setTips(data.redemittelTips || []);
    setAiBusy(false);

    await playTurns(data.turns);

    if (event === 'end' || event === 'time_up') {
      const nextIndex = index + 1;
      if (nextIndex < teile.length) {
        setTeilIdx(nextIndex);
        startTeilClock();
        await sendEvent('start', { teil: teile[nextIndex], teile, index: nextIndex });
      } else {
        finishExam(teile);
      }
      return;
    }
    setYourTurn(true);
    playTurnChime();
  };

  // Teil clock + automatic time-up in Prüfungsmodus.
  useEffect(() => {
    if (phase !== 'exam') return undefined;
    const id = setInterval(() => setNow(clock()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'exam' || !isExam || !currentTeil || aiBusy || speaking || recorder.recording) return;
    if (elapsed > currentTeil.durationSeconds + 20 && !timeUpSentRef.current[currentTeil.teil]) {
      timeUpSentRef.current[currentTeil.teil] = true;
      sendEvent('time_up', { teil: currentTeil.teil });
    }
    // sendEvent is recreated each render; the ref guard makes this fire once per Teil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, isExam, currentTeil, elapsed, aiBusy, speaking, recorder.recording]);

  const beginExam = async (teile) => {
    playEndChime();
    setPhase('exam');
    setTeilIdx(0);
    startTeilClock();
    await sendEvent('start', { teil: teile[0], teile, index: 0, firstTeil: true, afterPreparation: (sprechen?.prepMinutes || 0) > 0 });
  };

  const prepTimer = useCountdown((sprechen?.prepMinutes || 0) * 60, {
    running: phase === 'prep' && (sprechen?.prepMinutes || 0) > 0 && !(isLearn && prepPaused),
    onExpire: () => beginExam(examTeile),
  });

  // Persist the module result once.
  useEffect(() => {
    if (phase !== 'report' || savedRef.current || !sprechen) return;
    const summary = summarizeSpeaking(sprechen, evaluations);
    if (!summary) return;
    savedRef.current = true;
    saveEvaluation(
      {
        kind: 'goethe-sprechen',
        level,
        scaledPoints100: summary.points100,
        praedikat: summary.passed ? getPraedikat(summary.points100).label : 'Nicht bestanden',
        passed: summary.passed,
        teile: evaluations,
      },
      { kind: 'goethe-sprechen', module: level, question: `Goethe Sprechen ${level}${topic ? ` (${topic})` : ''}` }
    );
  }, [phase, evaluations, sprechen, level, topic, saveEvaluation]);

  const requestSheets = async () => {
    const teile = scope === 'all' ? sprechen.teile.map((t) => t.teil) : [Number(scope)];
    setExamTeile(teile);
    setPhase('sheets');
    setError(null);
    try {
      const results = await Promise.all(
        teile.map((teil) => api.post('/goethe/speaking/task', { level, teil, topic }).then((res) => [teil, res.data?.data]))
      );
      setSheets(Object.fromEntries(results));
      setPrepTeil(teile[0]);
      prepTimer.reset((sprechen.prepMinutes || 0) * 60);
      setPhase('prep');
    } catch (err) {
      setError(err.response?.data?.error || 'Die Aufgabenblätter konnten nicht erstellt werden.');
      setPhase('setup');
    }
  };

  const restart = () => {
    stopAudio();
    historiesRef.current = {};
    timeUpSentRef.current = {};
    savedRef.current = false;
    setHistories({});
    setSheets({});
    setNotes({});
    setEvaluations({});
    setTips([]);
    setYourTurn(false);
    setPhase('setup');
  };

  const toggleRecording = async () => {
    if (recorder.recording) {
      const rec = await recorder.stop();
      if (rec?.blob?.size) await sendEvent('candidate', { teil: currentTeilNr, recording: rec });
    } else {
      stopAudio();
      setSpeaking(null);
      await recorder.start();
    }
  };

  const sendTyped = async () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    await sendEvent('candidate', { teil: currentTeilNr, text });
  };

  if (formatError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
        <AlertCircle className="w-4 h-4" /> {formatError}
      </div>
    );
  }
  if (!sprechen) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Prüfungsformat wird geladen …
      </div>
    );
  }

  const header = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200">
          <Users className="w-3.5 h-3.5" /> Goethe-Zertifikat {level} · Sprechen (Paarprüfung)
        </span>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
          {phase === 'prep' ? 'Vorbereitungsraum' : phase === 'report' ? 'Prüfungsbericht' : 'Mündliche Prüfung'}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ExamModeToggle locked={phase === 'exam' || phase === 'prep'} />
        {phase === 'prep' && sprechen.prepMinutes > 0 && (
          <ExamTimer label="Vorbereitung" secondsLeft={prepTimer.secondsLeft} running={!prepPaused} canPause={isLearn} onToggle={() => setPrepPaused((p) => !p)} />
        )}
        {phase !== 'setup' && phase !== 'sheets' && (
          <button type="button" onClick={restart} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4" /> Neu
          </button>
        )}
      </div>
    </div>
  );

  // ─── Setup ───
  if (phase === 'setup' || phase === 'sheets') {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <ExamSetupBar level={level} onLevelChange={onLevelChange} topic={topic} onTopicChange={setTopic} disabled={phase === 'sheets'} />
        <div className="rounded-3xl border border-slate-200 bg-white shadow-card p-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">Ihr Prüfungspartner / Ihre Prüfungspartnerin</h2>
            <div className="grid grid-cols-2 gap-3">
              {PARTNERS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setPartnerName(p.name)}
                  aria-pressed={partnerName === p.name}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${partnerName === p.name ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-400'}`}
                >
                  <span className="w-10 h-10 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center mb-2">{p.name[0]}</span>
                  <span className="block font-extrabold text-slate-900">{p.name}</span>
                  <span className="block text-xs text-slate-500">{p.desc}</span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Die Prüferin Frau Weber moderiert die Prüfung und leitet jeden Teil ein.</p>
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 mb-3">Umfang</h2>
            <div className="flex flex-col gap-2">
              {[{ key: 'all', label: `Gesamte Prüfung (${sprechen.teile.length} Teile, ca. ${sprechen.timeMinutes} Min.)` }, ...sprechen.teile.map((t) => ({ key: String(t.teil), label: `Nur Teil ${t.teil}: ${t.title}` }))].map((o) => (
                <label key={o.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${scope === o.key ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                  <input type="radio" name="scope" checked={scope === o.key} onChange={() => setScope(o.key)} className="accent-slate-900" />
                  <span className="text-sm font-semibold text-slate-800">{o.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {sprechen.prepMinutes > 0
                ? `Vor der Prüfung haben Sie ${sprechen.prepMinutes} Minuten Vorbereitungszeit mit Notizblock.`
                : 'Auf Niveau A2 gibt es keine Vorbereitungszeit — Sie sehen die Karten erst in der Prüfung.'}
            </p>
          </div>
        </div>
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={requestSheets}
            disabled={phase === 'sheets'}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold shadow-md disabled:opacity-60"
          >
            {phase === 'sheets' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Flag className="w-5 h-5" />}
            {phase === 'sheets' ? 'Aufgabenblätter werden erstellt …' : 'Aufgabenblätter erhalten'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Vorbereitungsraum ───
  if (phase === 'prep') {
    const sheet = sheets[prepTeil];
    return (
      <div className="flex flex-col gap-5">
        {header}
        <p className="text-sm text-slate-600">
          {sprechen.prepMinutes > 0
            ? 'Lesen Sie Ihre Aufgabenblätter und machen Sie sich Notizen. Wenn die Zeit abgelaufen ist, beginnt die Prüfung automatisch.'
            : 'Sehen Sie sich die Aufgaben kurz an. Auf Niveau A2 beginnt die Prüfung ohne Vorbereitungszeit.'}
        </p>
        <TeilTabs
          items={examTeile.map((t) => ({ key: t, label: `Teil ${t}`, title: sprechen.teile.find((x) => x.teil === t)?.title }))}
          activeKey={prepTeil}
          onChange={setPrepTeil}
        />
        {sheet && (
          <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
            <SpeakingTaskSheet
              sheet={sheet}
              partnerName={partnerName}
              notes={notes[prepTeil] || {}}
              onNotesChange={(n) => setNotes((s) => ({ ...s, [prepTeil]: n }))}
            />
            <BilingualInstructionBanner level={level} module="sprechen" teil={prepTeil} title={sheet.title} instruction={sheet.instruction} />
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => beginExam(examTeile)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-md"
          >
            <Mic className="w-5 h-5" /> {sprechen.prepMinutes > 0 ? 'Ich bin bereit — Prüfung beginnen' : 'Prüfung beginnen'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Report ───
  if (phase === 'report' || phase === 'evaluating') {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {phase === 'evaluating' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
            <p className="text-sm font-semibold">Die Prüferinnen beraten sich und vergeben die Bänder A–E …</p>
          </div>
        ) : (
          <>
            {error && <p className="text-sm text-rose-700 font-semibold">{error}</p>}
            <SpeakingReport level={level} sprechen={sprechen} evaluations={evaluations} histories={histories} partnerName={partnerName} />
          </>
        )}
      </div>
    );
  }

  // ─── Exam ───
  const sheet = sheets[currentTeilNr];
  const history = histories[currentTeilNr] || [];
  const isLastTeil = teilIdx === examTeile.length - 1;
  const remaining = (currentTeil?.durationSeconds || 0) - elapsed;
  const canSpeak = !aiBusy && !speaking;

  return (
    <div className="flex flex-col gap-5">
      {header}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3">
        <span className="text-sm font-extrabold">
          Teil {currentTeilNr} von {sprechen.teile.length}: {currentTeil?.title}
          <span className="ml-2 text-xs font-semibold text-slate-400">({currentTeil?.mode === 'dialogue' ? 'Dialog' : 'Monolog'})</span>
        </span>
        <span className="flex items-center gap-3">
          <span className={`font-mono text-sm font-bold tabular-nums ${remaining < 0 ? 'text-rose-300' : remaining < 60 ? 'text-amber-300' : 'text-emerald-300'}`}>
            {remaining >= 0 ? `noch ${formatClock(remaining)}` : `+${formatClock(-remaining)} überzogen`}
          </span>
          <button
            type="button"
            onClick={() => sendEvent('end', { teil: currentTeilNr })}
            disabled={aiBusy || Boolean(speaking) || recorder.recording}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"
          >
            {isLastTeil ? <Award className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
            {isLastTeil ? 'Prüfung beenden & bewerten' : `Teil ${currentTeilNr} beenden`}
          </button>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] items-start">
        <section className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <SpeakerCard icon={GraduationCap} name="Frau Weber" role="Prüferin" active={speaking === 'examiner'} status={aiBusy ? 'hört zu …' : null} />
            <SpeakerCard icon={UserRound} name={partnerName} role={partnerName === 'Sarah' ? 'Prüfungspartnerin' : 'Prüfungspartner'} active={speaking === 'partner'} />
            <SpeakerCard icon={Mic} name={studentName || 'Sie'} role="Kandidat/in" active={recorder.recording} status={recorder.recording ? `spricht · ${formatClock(recorder.seconds)}` : yourTurn ? 'ist an der Reihe' : null} />
          </div>

          {yourTurn && canSpeak && !recorder.recording && (
            <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 text-center text-lg font-extrabold animate-pop" role="status">
              Du bist dran!
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 min-h-[320px] max-h-[460px] overflow-y-auto flex flex-col gap-3" aria-live="polite">
            {history.map((h) => {
              const mine = h.speaker === 'candidate';
              return (
                <div key={h.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] font-bold text-slate-500 px-1 mb-0.5">
                    {mine ? studentName || 'Sie' : h.speaker === 'examiner' ? 'Frau Weber · Prüferin' : `${h.name} · ${partnerName === 'Sarah' ? 'Partnerin' : 'Partner'}`}
                  </span>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine ? 'bg-slate-900 text-white rounded-tr-md' : h.speaker === 'examiner' ? 'bg-sky-50 text-slate-900 border border-sky-200 rounded-tl-md' : 'bg-rose-50 text-slate-900 border border-rose-200 rounded-tl-md'
                    }`}
                  >
                    {h.text}
                  </div>
                </div>
              );
            })}
            {aiBusy && (
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> …
              </p>
            )}
            {recorder.recording && (
              <div className="self-end max-w-[85%] px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-500 text-sm italic border border-dashed border-slate-300">
                {recorder.liveCaption || 'Ich höre zu …'}
              </div>
            )}
          </div>

          {(error || recorder.error) && (
            <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error || recorder.error}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={!canSpeak && !recorder.recording}
              aria-label={recorder.recording ? 'Aufnahme beenden und senden' : 'Sprechen'}
              className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-40 ${
                recorder.recording ? 'bg-rose-600 hover:bg-rose-700 ring-8 ring-rose-200 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white`}
            >
              {recorder.recording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-9 h-9" />}
            </button>
            <p className="text-xs text-slate-500">
              {recorder.recording ? 'Tippen zum Beenden — Ihre Antwort wird gesendet.' : 'Tippen zum Sprechen'}
            </p>
            <button type="button" onClick={() => setShowTyping((v) => !v)} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5" /> {showTyping ? 'Texteingabe ausblenden' : 'Kein Mikrofon? Antwort tippen'}
            </button>
            {showTyping && (
              <div className="w-full flex gap-2">
                <input
                  type="text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canSpeak && sendTyped()}
                  placeholder="Antwort auf Deutsch …"
                  className="flex-1 p-3 rounded-xl border border-slate-300 text-sm"
                />
                <button type="button" onClick={sendTyped} disabled={!canSpeak || !typed.trim()} aria-label="Senden" className="px-4 rounded-xl bg-slate-900 text-white disabled:opacity-40">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {isLearn && tips.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Redemittel für Ihre Antwort
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tips.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-sm text-slate-800">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
          {sheet?.slides?.length > 0 && currentTeil?.type === 'praesentation' ? (
            <SlideDeck slides={sheet.slides} notes={notes[currentTeilNr] || {}} />
          ) : (
            <SpeakingTaskSheet sheet={sheet} partnerName={partnerName} notes={notes[currentTeilNr] || {}} readOnly />
          )}
          <BilingualInstructionBanner level={level} module="sprechen" teil={currentTeilNr} title={currentTeil?.title} instruction={currentTeil?.instruction} />
        </aside>
      </div>
    </div>
  );
}

export default function GoetheSprechenRoom() {
  const { goetheLevel, setGoetheLevel } = useApp();
  const level = ['A2', 'B1', 'B2', 'C1'].includes(goetheLevel) ? goetheLevel : 'B1';
  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-7xl mx-auto text-left animate-float-in">
      <SprechenExam key={level} level={level} onLevelChange={setGoetheLevel} />
    </div>
  );
}
