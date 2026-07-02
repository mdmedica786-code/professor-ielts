import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { generateListening, evaluateListening } from '../../api/client';
import ListeningPlayer from './ListeningPlayer';
import AnswerSheet from './AnswerSheet';
import ReportCard from '../evaluation/ReportCard';
import TestShell from '../common/TestShell';
import { Headphones, CheckCircle2, Send, Loader2 } from 'lucide-react';

export default function ListeningFullTest() {
  const { studentName, saveEvaluation, setTestMode } = useApp();

  const [phase, setPhase] = useState('intro'); // 'intro', 'generating', 'test', 'submitting', 'result'
  const [error, setError] = useState(null);

  const [test, setTest] = useState(null); // { title, size, sections, token }
  const [answers, setAnswers] = useState({});
  const [audioDone, setAudioDone] = useState(false);
  const [evaluations, setEvaluations] = useState([]);

  const autoSubmitted = useRef(false);
  const [timeLeft, setTimeLeft] = useState(2400); // 40 minutes
  
  const draftKey = `listeningDraft_${studentName}`;

  // Load draft on mount
  useEffect(() => {
    if (phase === 'intro') {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only restore if valid test token exists and time is valid
          if (parsed.test?.token && parsed.timeLeft > 0) {
            setTest(parsed.test);
            setAnswers(parsed.answers || {});
            setTimeLeft(parsed.timeLeft);
            setPhase('test');
          } else {
            localStorage.removeItem(draftKey);
          }
        } catch(e) {
          localStorage.removeItem(draftKey);
        }
      }
    }
  }, [phase, studentName, draftKey]);

  // Save draft periodically when in test phase
  useEffect(() => {
    if (phase === 'test' && test) {
      localStorage.setItem(draftKey, JSON.stringify({ test, answers, timeLeft }));
    }
  }, [test, answers, timeLeft, phase, draftKey]);

  useEffect(() => {
    if (phase !== 'test') return;
    const interval = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase === 'test' && timeLeft === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      handleSubmit();
    }
  }, [phase, timeLeft]);

  const generateFullTest = async () => {
    setPhase('generating');
    setError(null);
    try {
      const res = await generateListening({ size: 'full', topic: '', difficulty: 'mixed' });
      if (res.success) {
        setTest(res.data);
        setAnswers({});
        setAudioDone(false);
        setPhase('test');
        window.scrollTo?.(0, 0);
      } else {
        setError(res.error || 'Could not generate the listening test.');
        setPhase('intro');
      }
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
      const friendly = isTimeout
        ? 'The audio generator is still working but the request took longer than expected. (TTS for a full test can take several minutes — keep the tab open and the server running.)'
        : err.response?.data?.error || err.message || 'Something went wrong. Please try again.';
      setError(friendly);
      setPhase('intro');
    }
  };

  const handleAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const handleSubmit = async () => {
    if (phase === 'submitting' || !test?.token) return;
    setError(null);
    setPhase('submitting');
    try {
      const res = await evaluateListening({ token: test.token, answers, studentName });
      if (res.success) {
        localStorage.removeItem(draftKey); // Clear draft on success
        const resultData = res.data;
        // The evaluate endpoint returns `resultData.scores` and `resultData.overallBand`.
        
        // Let's create a combinedEvaluation shape for ReportCard consistency
        const combinedEvaluation = {
          id: Date.now().toString(),
          overallBand: resultData.overallBand,
          scores: resultData.scores,
          verdict: `You got ${resultData.scores.correct} out of ${resultData.scores.total} correct.`,
          transcript: `[Full Listening Test Completed]\nTotal Correct: ${resultData.scores.correct}/${resultData.scores.total}`,
          criteria: {
            accuracy: { good: [`Scored ${resultData.scores.correct} / ${resultData.scores.total}`], weak: [], note: "Overall Accuracy" }
          },
          mistakes: resultData.mistakes || [],
          plan: resultData.plan,
          metadata: {
            timestamp: new Date().toISOString(),
            studentName,
            questionText: "Full IELTS Listening Test",
            questionPart: "Sections 1-4"
          }
        };

        saveEvaluation(combinedEvaluation, {
          kind: 'listening',
          module: null,
          question: { topic: test.title || 'Full Listening test' },
        });
        
        setEvaluations([combinedEvaluation]);
        setPhase('result');
      } else {
        setError(res.error || 'Marking failed.');
        setPhase('test');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
      setPhase('test');
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (phase === 'result') {
    return (
      <div className="h-full overflow-y-auto">
         <div className="p-4 md:p-6 max-w-4xl mx-auto">
            <button onClick={() => setTestMode('practice')} className="mb-4 text-sm text-brand-600 font-semibold hover:underline">
              &larr; Exit Full Test
            </button>
            <ReportCard evaluation={evaluations[0]} onBack={() => setTestMode('practice')} />
         </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Marking Listening Test...</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md">
          Checking your answers across all 40 questions.
        </p>
      </div>
    );
  }

  if (phase === 'generating') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold">Generating Full Listening Test...</h2>
        <p className="text-slate-500 mt-2 text-center max-w-md font-medium">
          Creating 4 sections, 40 questions, and generating audio.
        </p>
        <p className="text-slate-400 mt-2 text-center max-w-sm text-sm">
          Please wait. This process writes an original script and runs AI text-to-speech for multiple speakers. It usually takes 2-4 minutes. Do not close this tab!
        </p>
      </div>
    );
  }

  const totalQuestions = (test?.sections || []).reduce((n, s) => n + (s.questions?.length || 0), 0);
  const answeredCount = Object.values(answers).filter((v) => (v || '').toString().trim()).length;

  const answerPct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <TestShell
      title="IELTS Listening"
      subtitle="Four sections · 40 questions"
      onExit={() => setTestMode('practice')}
      timeLeft={phase === 'test' ? timeLeft : null}
      duration={2400}
      formatTime={formatTime}
      maxW="max-w-5xl"
    >
      {phase === 'intro' ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 grid place-items-center shadow-glow mb-6">
            <Headphones className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Listening — full test</h3>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
            40 minutes, four sections, 40 questions. The audio plays once — your answers autosave as you go.
          </p>
          {error && <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium mb-4 max-w-md">{error}</div>}
          <button
            onClick={generateFullTest}
            className="inline-flex items-center gap-2 font-bold text-white px-8 py-3.5 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition"
          >
            Start 40-minute test
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 m-4 rounded-xl">{error}</div>}

          {/* Frosted sticky player */}
          <div className="sticky top-0 z-10 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-100 px-4 md:px-6 pt-4 pb-3">
            <ListeningPlayer sections={test.sections} onComplete={() => setAudioDone(true)} />
            {audioDone && (
              <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Audio finished. Use your remaining time to review and transfer your answers.
              </div>
            )}
          </div>

          <div className="px-4 md:px-6 py-5">
            <AnswerSheet sections={test.sections} answers={answers} onAnswer={handleAnswer} locked={false} />
          </div>

          {/* Submit bar */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 md:px-6 py-3.5 flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-1.5 w-28 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-500" style={{ width: `${answerPct}%` }} />
              </div>
              <div className="text-[13px] text-slate-500">
                <span className="font-bold text-slate-900">{answeredCount}</span> / {totalQuestions} answered
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="ml-auto inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition"
            >
              <Send className="w-4 h-4" /> Submit test
            </button>
          </div>
        </div>
      )}
    </TestShell>
  );
}
