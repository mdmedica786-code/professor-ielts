import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { evaluateWriting, startTestSession } from '../../api/client';
import writingTasks from '../../data/writingTasks';
import { PenLine, Loader2, Send } from 'lucide-react';
import FullTestReport from '../evaluation/FullTestReport';
import TestShell from '../common/TestShell';

export default function WritingFullTest() {
  const { studentName, ieltsModule, saveEvaluation, setTestMode } = useApp();
  const [tasks, setTasks] = useState(null);
  
  const [phase, setPhase] = useState('intro'); // 'intro', 'test', 'evaluating', 'result'
  const [activeTab, setActiveTab] = useState(1);
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  
  const [essay1, setEssay1] = useState('');
  const [essay2, setEssay2] = useState('');
  
  const [sessionId, setSessionId] = useState(null);
  const [starting, setStarting] = useState(false);
  
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);
  
  const [task1Res, setTask1Res] = useState(null);
  const [task2Res, setTask2Res] = useState(null);
  
  const getDraftKey = () => `bandlogic_writing_draft_${studentName}_${ieltsModule}`;

  useEffect(() => {
    // Pick tasks based on module
    const t1s = writingTasks.filter(t => t.module === ieltsModule && t.task === 1);
    const t2s = writingTasks.filter(t => t.module === ieltsModule && t.task === 2);
    
    const pickedT1 = t1s[Math.floor(Math.random() * t1s.length)];
    const pickedT2 = t2s[Math.floor(Math.random() * t2s.length)];

    setTasks({
      task1: pickedT1,
      task2: pickedT2
    });

    // Restore autosave drafts
    try {
      const saved = localStorage.getItem(getDraftKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.task1Text === pickedT1.text && parsed.task2Text === pickedT2.text) {
          if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
            if (parsed.e1) setEssay1(parsed.e1);
            if (parsed.e2) setEssay2(parsed.e2);
          }
        }
      }
    } catch (e) {}
  }, [ieltsModule, studentName]);

  // Autosave when essay text changes during test phase
  useEffect(() => {
    if (phase === 'test' && tasks) {
      localStorage.setItem(getDraftKey(), JSON.stringify({ 
        e1: essay1, 
        e2: essay2,
        task1Text: tasks.task1.text,
        task2Text: tasks.task2.text,
        savedAt: Date.now()
      }));
    }
  }, [essay1, essay2, phase, tasks, ieltsModule, studentName]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (phase === 'test') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  const autoSubmitted = useRef(false);

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
      submitTest();
    }
  }, [phase, timeLeft]);

  const submitTest = async () => {
    setPhase('evaluating');
    setError(null);
    try {
      let r1 = task1Res;
      if (!r1) {
        const res = await evaluateWriting({
          module: ieltsModule,
          taskType: 1,
          prompt: tasks.task1.text,
          essay: essay1,
          studentName,
          sessionId
        });
        if (!res.success) throw new Error(res.error || "Failed to evaluate Task 1");
        r1 = res.data;
        setTask1Res(r1);
      }
      
      let r2 = task2Res;
      if (!r2) {
        const res = await evaluateWriting({
          module: ieltsModule,
          taskType: 2,
          prompt: tasks.task2.text,
          essay: essay2,
          studentName,
          sessionId
        });
        if (!res.success) throw new Error(res.error || "Failed to evaluate Task 2");
        r2 = res.data;
        setTask2Res(r2);
      }

      // Clear autosave after successful submission
      localStorage.removeItem(getDraftKey());

      // Weighted average: Task 2 is double the weight of Task 1
      const e1 = r1;
      const e2 = r2;

      const calcW = (k) => Math.round((e1.scores[k] + e2.scores[k] * 2) / 3 * 2) / 2;
      const scores = {
        tr: calcW('tr'),
        cc: calcW('cc'),
        lr: calcW('lr'),
        gra: calcW('gra')
      };
      
      const overallBand = Math.round(((scores.tr + scores.cc + scores.lr + scores.gra) / 4) * 2) / 2;

      // Preserve each task's full evaluation (criteria, corrections, model
      // rewrite, the student's essay) so the master report can render them.
      const bandOf = (e) => Math.round(((e.scores.tr + e.scores.cc + e.scores.lr + e.scores.gra) / 4) * 2) / 2;
      const parts = [
        { ...e1, label: 'Task 1', band: bandOf(e1), essay: essay1 },
        { ...e2, label: 'Task 2', band: bandOf(e2), essay: essay2 },
      ];

      const combinedEvaluation = {
        id: Date.now().toString(),
        kind: 'writing',
        parts,
        overallBand,
        scores,
        verdict: "Combined Full Test Score",
        transcript: `[Task 1]\n${essay1}\n\n[Task 2]\n${essay2}`,
        criteria: {
          tr: { good: ["Combined Task Response"], weak: [], note: "" },
          cc: { good: ["Combined Coherence"], weak: [], note: "" },
          lr: { good: ["Combined Lexical Resource"], weak: [], note: "" },
          gra: { good: ["Combined Grammar"], weak: [], note: "" },
        },
        mistakes: [...(e1.mistakes || []), ...(e2.mistakes || [])],
        plan: e2.plan,
        metadata: {
          processingTime: (e1.metadata?.processingTime || 0) + (e2.metadata?.processingTime || 0),
          timestamp: new Date().toISOString(),
          studentName,
          questionText: "Full IELTS Writing Test",
          questionPart: "1 & 2"
        }
      };

      saveEvaluation(combinedEvaluation, { kind: 'writing', question: { topic: "Full Writing Test", task: "1 & 2", module: ieltsModule }});
      setEvaluations([combinedEvaluation]);
      setPhase('result');
    } catch (err) {
      setError(err.message || "Something went wrong during evaluation.");
      setPhase('test'); // back to test so they don't lose work
    }
  };

  const handleStartTest = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await startTestSession('writing');
      if (res.success) {
        setSessionId(res.sessionId);
        setPhase('test');
      } else {
        setError(res.error || "Could not start test session.");
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to start session. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const wordCount1 = essay1.trim() ? essay1.trim().split(/\s+/).length : 0;
  const wordCount2 = essay2.trim() ? essay2.trim().split(/\s+/).length : 0;

  if (!tasks) return <div className="p-6 flex justify-center"><Loader2 className="animate-spin w-6 h-6" /></div>;

  if (phase === 'result') {
    return (
      <TestShell
        title="IELTS Writing"
        subtitle={`${ieltsModule === 'academic' ? 'Academic' : 'General Training'} · Result`}
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
      <TestShell title="IELTS Writing" subtitle="Marking your test" onExit={() => setTestMode('practice')} maxW="max-w-3xl">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <Loader2 className="w-11 h-11 text-brand-500 animate-spin mb-4" />
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Evaluating writing test…</h2>
          <p className="text-slate-500 mt-2 max-w-md text-sm leading-relaxed">
            Marking Task 1 and Task 2, then combining your scores (Task 2 carries more weight).
          </p>
        </div>
      </TestShell>
    );
  }

  const curWords = activeTab === 1 ? wordCount1 : wordCount2;
  const curMin = activeTab === 1 ? 150 : 250;
  const curPct = Math.min(100, Math.round((curWords / curMin) * 100));
  const curMet = curWords >= curMin;

  return (
    <TestShell
      title="IELTS Writing"
      subtitle={`${ieltsModule === 'academic' ? 'Academic' : 'General Training'} · Full test`}
      onExit={() => setTestMode('practice')}
      timeLeft={phase === 'test' ? timeLeft : null}
      duration={3600}
      formatTime={formatTime}
      maxW="max-w-6xl 2xl:max-w-[100rem]"
    >
      {phase === 'intro' ? (
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 grid place-items-center shadow-glow mb-6">
            <PenLine className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Writing — full test</h3>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed">
            60 minutes, two tasks. Aim for about 20 minutes on Task 1 and 40 on Task 2. Your work autosaves as you type.
          </p>
          {error && <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium mb-4 max-w-md">{error}</div>}
          <button
            onClick={handleStartTest}
            disabled={starting}
            className="inline-flex items-center gap-2 font-bold text-white px-8 py-3.5 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-60"
          >
            {starting && <Loader2 className="w-5 h-5 animate-spin" />}
            Start 60-minute test
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          {error && <div className="bg-rose-50 text-rose-700 px-4 py-2.5 text-sm font-medium text-center shrink-0">{error}</div>}

          {/* Segmented tabs */}
          <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
            <div className="inline-flex bg-slate-50 border border-slate-200 rounded-xl p-1">
              {[1, 2].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === t
                      ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Task {t}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-400 hidden sm:block">
              {activeTab === 1 ? 'Aim ~20 min · min. 150 words' : 'Aim ~40 min · min. 250 words'}
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
            {/* Prompt pane */}
            <div className="w-full md:w-[44%] min-w-0 md:min-h-0 md:overflow-y-auto p-6 md:p-7 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/60">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
                {ieltsModule === 'academic' ? 'Academic' : 'General'} · Task {activeTab}
              </span>
              <h2 className="text-[13px] font-bold text-slate-900 mt-4 mb-2">
                {activeTab === 1 ? tasks.task1.title : tasks.task2.title}
              </h2>
              <div className="whitespace-pre-wrap text-slate-600 text-[15px] leading-relaxed">
                {activeTab === 1 ? tasks.task1.text : tasks.task2.text}
              </div>
            </div>

            {/* Editor pane */}
            <div className="w-full md:w-[56%] min-w-0 min-h-0 p-5 md:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2.5 shrink-0">
                <span className="text-xs font-semibold text-slate-500">Your response</span>
                <span className="text-[11px] text-slate-400">Autosaves as you type</span>
              </div>
              <textarea
                value={activeTab === 1 ? essay1 : essay2}
                onChange={(e) => (activeTab === 1 ? setEssay1(e.target.value) : setEssay2(e.target.value))}
                placeholder="Start writing your response here…"
                className="flex-1 min-h-[45vh] md:min-h-0 resize-none w-full rounded-2xl bg-slate-50 border border-slate-200 p-5 text-[15px] leading-8 text-slate-800 outline-none transition focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15"
              />
              <div className="mt-4 flex items-center gap-4 shrink-0">
                <div
                  className="w-11 h-11 rounded-full grid place-items-center shrink-0"
                  style={{ background: `conic-gradient(${curMet ? '#10b981' : '#a855f7'} ${curPct}%, #eef0f5 0)` }}
                >
                  <div
                    className="w-[34px] h-[34px] rounded-full bg-white grid place-items-center text-[10px] font-bold"
                    style={{ color: curMet ? '#059669' : '#7e22ce' }}
                  >
                    {curPct}%
                  </div>
                </div>
                <div className="text-[13px] leading-tight text-slate-500">
                  <span className="block text-slate-900 font-bold text-[15px]">{curWords} words</span>
                  of {curMin} minimum
                </div>
                <button
                  onClick={submitTest}
                  className="ml-auto inline-flex items-center gap-2 font-bold text-white px-6 py-3 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition"
                >
                  <Send className="w-4 h-4" /> Submit test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TestShell>
  );
}
