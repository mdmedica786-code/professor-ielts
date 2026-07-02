import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { evaluateSpeaking } from '../../api/client';
import presetQuestions from '../../data/presetQuestions';
import { Mic, Square, Loader2, Clock } from 'lucide-react';
import TestShell from '../common/TestShell';
import FullTestReport from '../evaluation/FullTestReport';

// Full IELTS Speaking test: sequential Part 1–3 recording + combined rich report.
export default function SpeakingFullTest() {
  const { studentName, saveEvaluation, setTestMode } = useApp();
  const [testQuestions, setTestQuestions] = useState(null);
  
  const [phase, setPhase] = useState('intro'); // 'intro', 'part1', 'part2', 'part3', 'evaluating', 'result'
  const [prepTimeLeft, setPrepTimeLeft] = useState(60); // 1 minute prep for Part 2
  
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const audioChunks = useRef([]);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Store recordings for each part
  const blobsRef = useRef({ part1: null, part2: null, part3: null });
  const [recordings, setRecordings] = useState({
    part1: null,
    part2: null,
    part3: null
  });
  
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);

  // Initialize test questions
  useEffect(() => {
    const p1 = presetQuestions.filter(q => q.part === 1);
    const p2 = presetQuestions.filter(q => q.part === 2);
    const p3 = presetQuestions.filter(q => q.part === 3);
    
    // Pick 3 random Part 1, 1 Part 2, 3 random Part 3
    const shuffleAndSlice = (arr, num) => [...arr].sort(() => 0.5 - Math.random()).slice(0, num);
    
    setTestQuestions({
      part1: shuffleAndSlice(p1, 3),
      part2: shuffleAndSlice(p2, 1)[0],
      part3: shuffleAndSlice(p3, 3)
    });
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    let interval;
    if (phase === 'part2' && !isRecording) {
      interval = setInterval(() => setPrepTimeLeft(t => t <= 1 ? 0 : t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [phase, isRecording]);

  // Clean up mic on unmount
  useEffect(() => () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    mr?.stream?.getTracks().forEach(t => t.stop());
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mime });
        audioChunks.current = [];
        blobsRef.current[phase] = blob;
        setRecordings(prev => ({ ...prev, [phase]: blob }));
        
        // Advance to next phase
        if (phase === 'part1') setPhase('part2');
        else if (phase === 'part2') setPhase('part3');
        else if (phase === 'part3') evaluateAll(blob);
      };

      mr.start(250);
      recorderRef.current = mr;
      setIsRecording(true);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone access to take the test.");
    }
  };

  const stopRecording = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      mr.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };

  const evaluateAll = async () => {
    setPhase('evaluating');
    setError(null);
    try {
      const p1Text = testQuestions.part1.map(q => q.text).join(" ");
      const p2Text = testQuestions.part2.text;
      const p3Text = testQuestions.part3.map(q => q.text).join(" ");

      const [res1, res2, res3] = await Promise.all([
        evaluateSpeaking({
          audioFile: new File([blobsRef.current.part1], 'part1.webm', { type: blobsRef.current.part1.type }),
          questionText: p1Text,
          questionPart: 1,
          studentName
        }),
        evaluateSpeaking({
          audioFile: new File([blobsRef.current.part2], 'part2.webm', { type: blobsRef.current.part2.type }),
          questionText: p2Text,
          questionPart: 2,
          studentName
        }),
        evaluateSpeaking({
          audioFile: new File([blobsRef.current.part3], 'part3.webm', { type: blobsRef.current.part3.type }),
          questionText: p3Text,
          questionPart: 3,
          studentName
        })
      ]);

      if (!res1.success || !res2.success || !res3.success) {
        throw new Error("Failed to evaluate one or more parts");
      }

      // Combine scores (Average them)
      const evals = [res1.data, res2.data, res3.data];

      const avg = (key) => Math.round((evals[0].scores[key] + evals[1].scores[key] + evals[2].scores[key]) / 3 * 2) / 2;
      const scores = {
        fc: avg('fc'),
        lr: avg('lr'),
        gra: avg('gra'),
        p: avg('p')
      };
      const overallBand = Math.round(((scores.fc + scores.lr + scores.gra + scores.p) / 4) * 2) / 2;

      // Preserve each part's full granular evaluation so the master report can
      // render per-part transcripts, corrections and pronunciation heatmaps.
      const partBand = (e) => Math.round(((e.scores.fc + e.scores.lr + e.scores.gra + e.scores.p) / 4) * 2) / 2;
      const parts = [
        { label: 'Part 1', band: partBand(evals[0]), ...evals[0] },
        { label: 'Part 2', band: partBand(evals[1]), ...evals[1] },
        { label: 'Part 3', band: partBand(evals[2]), ...evals[2] },
      ];

      const combinedEvaluation = {
        id: res3.data.id || Date.now().toString(),
        kind: 'speaking',
        parts,
        overallBand,
        scores,
        verdict: "Combined Full Test Score",
        transcript: `[Part 1]: ${evals[0].transcript}\n\n[Part 2]: ${evals[1].transcript}\n\n[Part 3]: ${evals[2].transcript}`,
        criteria: {
          fc: { good: ["Combined fluency"], weak: [], note: "" },
          lr: { good: ["Combined vocabulary"], weak: [], note: "" },
          gra: { good: ["Combined grammar"], weak: [], note: "" },
          p: { good: ["Combined pronunciation"], weak: [], note: "", phonemeScores: [], mispronunciations: [] }
        },
        mistakes: [...(evals[0].mistakes || []), ...(evals[1].mistakes || []), ...(evals[2].mistakes || [])],
        plan: evals[2].plan,
        metadata: {
          audioDuration: evals[0].metadata.audioDuration + evals[1].metadata.audioDuration + evals[2].metadata.audioDuration,
          timestamp: new Date().toISOString(),
          studentName,
          questionText: "Full IELTS Speaking Test",
          questionPart: "1, 2, 3"
        }
      };

      saveEvaluation(combinedEvaluation, { kind: 'speaking', question: { topic: "Full Speaking Test", part: "All" }});
      setEvaluations([combinedEvaluation]); // Just to trigger result view
      setPhase('result');
    } catch (err) {
      setError(err.message || "Something went wrong during evaluation.");
      setPhase('intro'); // reset
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!testQuestions) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>;

  if (phase === 'result') {
    return (
      <TestShell
        title="IELTS Speaking"
        subtitle="Full test · Result"
        onExit={() => setTestMode('practice')}
        progress={100}
        maxW="max-w-5xl xl:max-w-6xl"
      >
        <FullTestReport evaluation={evaluations[0]} />
      </TestShell>
    );
  }

  if (phase === 'evaluating') {
    return (
      <TestShell title="IELTS Speaking" subtitle="Marking your test" onExit={() => setTestMode('practice')} maxW="max-w-3xl">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <Loader2 className="w-11 h-11 text-brand-500 animate-spin mb-4" />
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Evaluating full test…</h2>
          <p className="text-slate-500 mt-2 max-w-md text-sm leading-relaxed">
            Marking Part 1, Part 2 and Part 3 separately, then combining your scores.
          </p>
        </div>
      </TestShell>
    );
  }

  const PART_META = {
    part1: { badge: 'Part 1 · Interview', accent: 'from-violet-500 to-purple-700', border: 'border-violet-400' },
    part2: { badge: 'Part 2 · Long Turn', accent: 'from-sky-500 to-blue-700', border: 'border-sky-400' },
    part3: { badge: 'Part 3 · Discussion', accent: 'from-amber-500 to-orange-700', border: 'border-amber-400' },
  };
  const meta = PART_META[phase];
  const stepIndex = { intro: 0, part1: 1, part2: 2, part3: 3 }[phase] ?? 0;

  return (
    <TestShell
      title="IELTS Speaking"
      subtitle="Full test · Sequential parts"
      onExit={() => setTestMode('practice')}
      progress={(stepIndex / 3) * 100}
      maxW="max-w-3xl xl:max-w-4xl"
    >
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {error && <div className="bg-rose-50 text-rose-700 px-4 py-2.5 text-sm font-medium text-center shrink-0">{error}</div>}

        {phase === 'intro' ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 grid place-items-center shadow-glow mb-6">
              <Mic className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Speaking — full test</h3>
            <p className="text-slate-500 max-w-md mb-8 leading-relaxed text-sm">
              Three parts, recorded in sequence: interview, a cue-card long turn (1 min prep), then discussion.
            </p>
            <button
              onClick={() => setPhase('part1')}
              className="inline-flex items-center gap-2 font-bold text-white px-8 py-3.5 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition"
            >
              Start test
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col px-5 py-6 md:px-8 md:py-8 max-w-2xl mx-auto w-full">
            <span className={`self-center inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r ${meta.accent} px-3 py-1 rounded-full shadow-sm mb-6`}>
              {meta.badge}
            </span>

            {phase === 'part2' && (
              !isRecording && prepTimeLeft > 0 ? (
                <div className="self-center bg-amber-50 border border-amber-200 px-5 py-4 rounded-2xl flex flex-col items-center mb-5 shadow-sm">
                  <Clock className="w-6 h-6 text-amber-500 mb-1" />
                  <div className="text-2xl font-mono font-black text-amber-700 tabular-nums">{formatTime(prepTimeLeft)}</div>
                  <div className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Preparation time</div>
                </div>
              ) : (
                <div className="self-center bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold mb-5">
                  Speak now — aim for 1–2 minutes
                </div>
              )
            )}

            {phase === 'part2' ? (
              <div className={`text-left bg-slate-50 border-l-4 ${meta.border} p-5 rounded-2xl whitespace-pre-wrap font-medium text-slate-800 text-base md:text-lg`}>
                {testQuestions.part2.text}
              </div>
            ) : (
              <div className="space-y-3 text-left">
                {(phase === 'part1' ? testQuestions.part1 : testQuestions.part3).map((q, i) => (
                  <div key={i} className={`text-base md:text-lg font-medium text-slate-800 border-l-4 ${meta.border} pl-4 py-1`}>
                    {q.text}
                  </div>
                ))}
              </div>
            )}

            {/* Recording controls */}
            <div className="mt-auto pt-8 w-full max-w-sm mx-auto text-center">
              <div className="text-2xl font-mono tabular-nums text-slate-600 mb-4 font-semibold">{formatTime(recordingTime)}</div>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={phase === 'part2' && prepTimeLeft > 0}
                  className="w-full inline-flex items-center justify-center gap-2 font-bold text-white py-4 text-base rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Mic className="w-5 h-5" /> Start recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full inline-flex items-center justify-center gap-2 font-bold text-white py-4 text-base rounded-2xl bg-gradient-to-b from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25 ring-1 ring-white/10 ring-inset transition active:scale-[0.98]"
                >
                  <Square className="w-5 h-5 fill-white" />
                  {phase === 'part3' ? 'Finish & submit test' : 'Stop & continue'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </TestShell>
  );
}
