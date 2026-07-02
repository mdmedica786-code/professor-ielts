import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateReading, evaluateReading } from '../../api/client';
import ReadingSetup from './ReadingSetup';
import PassageView from './PassageView';
import QuestionList from './QuestionList';
import ReadingResult from './ReadingResult';
import ReadingFullTest from './ReadingFullTest';

export default function ReadingRoom() {
  const { ieltsModule, studentName, saveEvaluation, testMode } = useApp();

  const [phase, setPhase] = useState('setup'); // 'setup' | 'attempt' | 'result'
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const [passage, setPassage] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [token, setToken] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const handleGenerate = async (config) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateReading({ module: ieltsModule, ...config });
      if (res.success) {
        setPassage(res.data.passage);
        setQuestions(res.data.questions);
        setToken(res.data.token);
        setAnswers({});
        setPhase('attempt');
        window.scrollTo?.(0, 0);
      } else {
        setError(res.error || 'Could not generate a passage.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const handleSubmit = async () => {
    if (evaluating) return;
    setEvaluating(true);
    setError(null);
    try {
      const res = await evaluateReading({ token, answers, studentName });
      if (res.success) {
        setResult(res.data);
        setPhase('result');
        saveEvaluation(res.data, {
          kind: 'reading',
          module: ieltsModule,
          question: { topic: res.data.passage?.title || passage?.title || 'Reading passage' },
        });
      } else {
        setError(res.error || 'Marking failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  const reset = () => {
    setPhase('setup');
    setPassage(null);
    setQuestions([]);
    setToken(null);
    setAnswers({});
    setResult(null);
    setError(null);
  };

  if (testMode === 'full') {
    return <ReadingFullTest />;
  }

  if (phase === 'setup') {
    return (
      <div className="h-full overflow-y-auto">
        <ReadingSetup onGenerate={handleGenerate} busy={generating} error={error} />
      </div>
    );
  }

  if (phase === 'result') {
    return <ReadingResult result={result} onBack={reset} />;
  }

  // attempt — passage + questions, side-by-side on large screens
  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Passage */}
      <div className="lg:w-[55%] border-b lg:border-b-0 lg:border-r border-slate-200 bg-white overflow-y-auto max-h-[42vh] lg:max-h-none flex-shrink-0">
        <PassageView passage={passage} />
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl mb-4">{error}</div>
          )}
          <QuestionList
            questions={questions}
            answers={answers}
            onAnswer={handleAnswer}
            onSubmit={handleSubmit}
            busy={evaluating}
          />
          <button
            onClick={reset}
            className="btn-ghost text-xs w-full mt-3 text-slate-400 hover:text-slate-600"
          >
            Discard & start a new passage
          </button>
        </div>
      </div>
    </div>
  );
}
