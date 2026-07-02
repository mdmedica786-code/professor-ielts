import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { generateReading, evaluateReading } from '../../api/client';
import PassageView from './PassageView';
import QuestionList from './QuestionList';
import TestShell from '../common/TestShell';
import FullTestReport from '../evaluation/FullTestReport';
import { BookOpenText, Loader2, Send } from 'lucide-react';

const PASSAGE_CONFIGS = [
  { diff: '5.0–6.0', count: 13, topic: 'Daily life, nature, or historical figures' },
  { diff: '6.0–7.0', count: 13, topic: 'Workplace, sociology, or psychology' },
  { diff: '7.5–9.0', count: 14, topic: 'Complex science, technology, or abstract research' }
];

export default function ReadingFullTest() {
  const { ieltsModule, studentName, saveEvaluation, setTestMode } = useApp();
  
  const [phase, setPhase] = useState('intro'); // 'intro', 'generating', 'test', 'evaluating', 'result'
  const [generationStep, setGenerationStep] = useState(0); // 1, 2, 3
  
  const [passages, setPassages] = useState([]); // { passage, questions, token }
  const [answers, setAnswers] = useState({ 0: {}, 1: {}, 2: {} }); // Store answers by passage index
  
  const [activeTab, setActiveTab] = useState(0); // 0, 1, 2
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes
  
  const [evaluations, setEvaluations] = useState([]);
  const [error, setError] = useState(null);

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

  const generateAllPassages = async () => {
    setPhase('generating');
    setError(null);
    setPassages([]);
    
    try {
      const results = [];
      for (let i = 0; i < 3; i++) {
        setGenerationStep(i + 1);
        const config = PASSAGE_CONFIGS[i];
        const res = await generateReading({
          module: ieltsModule,
          mode: 'ai',
          difficulty: config.diff,
          topic: config.topic,
          count: config.count
        });
        
        if (!res.success) throw new Error(`Failed to generate Passage ${i + 1}.`);
        results.push(res.data);
      }
      setPassages(results);
      setPhase('test');
    } catch (err) {
      setError(err.message || "Failed to generate test. Please try again.");
      setPhase('intro');
    }
  };

  const handleAnswer = (passageIndex, questionId, val) => {
    setAnswers(prev => ({
      ...prev,
      [passageIndex]: {
        ...prev[passageIndex],
        [questionId]: val
      }
    }));
  };

  const submitTest = async () => {
    setPhase('evaluating');
    setError(null);
    try {
      const evalResults = [];
      for (let i = 0; i < 3; i++) {
        const res = await evaluateReading({
          token: passages[i].token,
          answers: answers[i],
          studentName
        });
        if (!res.success) throw new Error(`Failed to evaluate Passage ${i + 1}.`);
        evalResults.push(res.data);
      }

      // Combine reading results
      let totalCorrect = 0;
      let totalQuestions = 0;
      let mistakes = [];

      evalResults.forEach((er, i) => {
        totalCorrect += er.scores.correct;
        totalQuestions += er.scores.total;
        mistakes = [...mistakes, ...er.mistakes.map(m => ({ ...m, context: `Passage ${i + 1}` }))];
      });

      // Preserve each passage's full per-question review for the master report.
      const parts = evalResults.map((er, i) => ({
        label: `Passage ${i + 1}`,
        band: er.overallBand,
        ...er,
      }));

      // Calculate band based on total correct out of 40
      // Typical IELTS Reading mapping (Academic):
      // 39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, 33-34 = 7.5, 30-32 = 7.0, 27-29 = 6.5, 23-26 = 6.0
      let overallBand = 1.0;
      if (ieltsModule === 'academic') {
        if (totalCorrect >= 39) overallBand = 9.0;
        else if (totalCorrect >= 37) overallBand = 8.5;
        else if (totalCorrect >= 35) overallBand = 8.0;
        else if (totalCorrect >= 33) overallBand = 7.5;
        else if (totalCorrect >= 30) overallBand = 7.0;
        else if (totalCorrect >= 27) overallBand = 6.5;
        else if (totalCorrect >= 23) overallBand = 6.0;
        else if (totalCorrect >= 19) overallBand = 5.5;
        else if (totalCorrect >= 15) overallBand = 5.0;
        else if (totalCorrect >= 13) overallBand = 4.5;
        else if (totalCorrect >= 10) overallBand = 4.0;
        else overallBand = 3.5;
      } else {
        // General Training (requires higher correct for same band)
        if (totalCorrect >= 40) overallBand = 9.0;
        else if (totalCorrect >= 39) overallBand = 8.5;
        else if (totalCorrect >= 37) overallBand = 8.0;
        else if (totalCorrect >= 36) overallBand = 7.5;
        else if (totalCorrect >= 34) overallBand = 7.0;
        else if (totalCorrect >= 32) overallBand = 6.5;
        else if (totalCorrect >= 30) overallBand = 6.0;
        else if (totalCorrect >= 27) overallBand = 5.5;
        else if (totalCorrect >= 23) overallBand = 5.0;
        else if (totalCorrect >= 19) overallBand = 4.5;
        else if (totalCorrect >= 15) overallBand = 4.0;
        else overallBand = 3.5;
      }

      const combinedEvaluation = {
        id: Date.now().toString(),
        kind: 'reading',
        parts,
        overallBand,
        scores: {
          correct: totalCorrect,
          total: totalQuestions
        },
        verdict: `You got ${totalCorrect} out of ${totalQuestions} correct.`,
        transcript: `[Reading Test Completed]\nModule: ${ieltsModule.toUpperCase()}\nTotal Correct: ${totalCorrect}/${totalQuestions}`,
        criteria: {
          accuracy: { good: [`Scored ${totalCorrect} / ${totalQuestions}`], weak: [], note: "Overall Accuracy" }
        },
        mistakes,
        plan: evalResults[2].plan,
        metadata: {
          timestamp: new Date().toISOString(),
          studentName,
          questionText: "Full IELTS Reading Test",
          questionPart: "Passages 1, 2 & 3"
        }
      };

      saveEvaluation(combinedEvaluation, { kind: 'reading', question: { topic: "Full Reading Test", module: ieltsModule }});
      setEvaluations([combinedEvaluation]);
      setPhase('result');
    } catch (err) {
      setError(err.message || "Something went wrong during evaluation.");
      setPhase('test');
    }
  };

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  
  // Calculate answered questions for the current active tab
  const getAnsweredCount = (idx) => Object.keys(answers[idx] || {}).filter(k => answers[idx][k]?.trim()).length;

  if (phase === 'result') {
    return (
      <TestShell
        title="IELTS Reading"
        subtitle={`${ieltsModule === 'academic' ? 'Academic' : 'General Training'} · Result`}
        onExit={() => setTestMode('practice')}
        progress={100}
        maxW="max-w-5xl xl:max-w-6xl"
      >
        <FullTestReport evaluation={evaluations[0]} />
      </TestShell>
    );
  }

  if (phase === 'evaluating' || phase === 'generating') {
    const generating = phase === 'generating';
    return (
      <TestShell title="IELTS Reading" subtitle={generating ? 'Building your test' : 'Marking your test'} onExit={() => setTestMode('practice')} maxW="max-w-3xl">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <Loader2 className="w-11 h-11 text-brand-500 animate-spin mb-4" />
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {generating ? `Writing passage ${generationStep} of 3…` : 'Marking your answers…'}
          </h2>
          <p className="text-slate-500 mt-2 max-w-md text-sm leading-relaxed">
            {generating
              ? 'Composing 3 original passages and 40 unique exam questions. This usually takes 1–2 minutes.'
              : 'Checking your answers across all 3 passages.'}
          </p>
        </div>
      </TestShell>
    );
  }

  if (phase === 'intro') {
    return (
      <TestShell title="IELTS Reading" subtitle={`${ieltsModule === 'academic' ? 'Academic' : 'General Training'} · Full test`} onExit={() => setTestMode('practice')} maxW="max-w-3xl">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 grid place-items-center shadow-lg shadow-emerald-500/25 mb-6">
            <BookOpenText className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">Reading — full test</h3>
          <p className="text-slate-500 max-w-md mb-8 leading-relaxed text-sm">
            60 minutes, 3 passages, 40 questions. Difficulty rises as you progress.
          </p>
          {error && <div className="bg-rose-50 text-rose-700 px-4 py-3 rounded-xl mb-4 text-sm font-medium max-w-md">{error}</div>}
          <button
            onClick={generateAllPassages}
            className="inline-flex items-center gap-2 font-bold text-white px-8 py-3.5 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 shadow-glow hover:-translate-y-0.5 active:translate-y-0 transition"
          >
            Start 60-minute test
          </button>
        </div>
      </TestShell>
    );
  }

  // ── Test phase — fluid split-pane ────────────────────────────
  return (
    <TestShell
      title="IELTS Reading"
      subtitle={`${ieltsModule === 'academic' ? 'Academic' : 'General Training'} · Full test`}
      onExit={() => setTestMode('practice')}
      timeLeft={timeLeft}
      duration={3600}
      formatTime={formatTime}
      maxW="max-w-6xl 2xl:max-w-[100rem]"
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {error && <div className="bg-rose-50 text-rose-700 px-4 py-2 text-sm font-medium text-center shrink-0">{error}</div>}

        {/* Passage tabs + submit */}
        <div className="flex items-stretch border-b border-slate-100 shrink-0">
          {[0, 1, 2].map(idx => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 px-2 font-bold text-sm transition-colors ${activeTab === idx ? 'text-brand-600 border-b-2 border-brand-500 bg-brand-50/40' : 'text-slate-500 border-b-2 border-transparent hover:bg-slate-50'}`}
            >
              <span>Passage {idx + 1}</span>
              <span className="text-[10px] font-medium text-slate-400">
                {getAnsweredCount(idx)} / {passages[idx].questions.length}
              </span>
            </button>
          ))}
          <button
            onClick={submitTest}
            className="my-2 mx-3 px-5 rounded-xl text-sm font-bold text-white hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]"
          >
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>

        {/* Split pane: passage | questions. Stacks on mobile, side-by-side from lg. */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          <div className="w-full lg:w-1/2 xl:w-[55%] border-b lg:border-b-0 lg:border-r border-slate-100 bg-white lg:overflow-y-auto shrink-0 lg:shrink">
            <div className="max-w-3xl mx-auto">
              <PassageView passage={passages[activeTab].passage} />
            </div>
          </div>

          <div className="flex-1 lg:overflow-y-auto p-4 md:p-6 bg-slate-50/60">
            <div className="max-w-2xl mx-auto pb-24 lg:pb-6">
              <QuestionList
                questions={passages[activeTab].questions}
                answers={answers[activeTab]}
                onAnswer={(qid, val) => handleAnswer(activeTab, qid, val)}
                busy={false}
              />
            </div>
          </div>
        </div>

        {/* Mobile submit */}
        <div className="md:hidden p-3 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={submitTest}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm ring-1 ring-white/20 ring-inset active:scale-[0.98] transition-all"
          >
            Submit full test
          </button>
        </div>
      </div>
    </TestShell>
  );
}
