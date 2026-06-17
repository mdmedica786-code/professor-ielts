import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateListening, evaluateListening } from '../../api/client';
import ListeningSetup from './ListeningSetup';
import ListeningPlayer from './ListeningPlayer';
import AnswerSheet from './AnswerSheet';
import ListeningResult from './ListeningResult';
import { CheckCircle2, Send, Loader2 } from 'lucide-react';

/**
 * Phase machine:
 *   'setup'      — pick test size / section / topic, hit Generate.
 *   'attempt'    — player on top (or alongside on desktop), answer sheet below.
 *                  Audio plays once through; sheet stays open afterwards for review.
 *   'submitting' — POST /listening/evaluate; spinner.
 *   'result'     — banded result + per-question breakdown.
 *
 * Mirrors ReadingRoom's shape so History/saveEvaluation behave consistently.
 */
export default function ListeningRoom() {
  const { studentName, saveEvaluation } = useApp();

  const [phase, setPhase] = useState('setup');
  const [generating, setGenerating] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);

  const [test, setTest] = useState(null); // { title, size, sections, token }
  const [answers, setAnswers] = useState({});
  const [audioDone, setAudioDone] = useState(false);
  const [result, setResult] = useState(null);

  const handleGenerate = async (config) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateListening(config);
      if (res.success) {
        setTest(res.data);
        setAnswers({});
        setAudioDone(false);
        setPhase('attempt');
        window.scrollTo?.(0, 0);
      } else {
        setError(res.error || 'Could not generate a listening test.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const handleSubmit = async () => {
    if (evaluating || !test?.token) return;
    setEvaluating(true);
    setError(null);
    setPhase('submitting');
    try {
      const res = await evaluateListening({ token: test.token, answers, studentName });
      if (res.success) {
        setResult(res.data);
        setPhase('result');
        saveEvaluation(res.data, {
          kind: 'listening',
          module: null, // listening is not split academic/general
          question: { topic: res.data.title || test.title || 'Listening test' },
        });
      } else {
        setError(res.error || 'Marking failed.');
        setPhase('attempt');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
      setPhase('attempt');
    } finally {
      setEvaluating(false);
    }
  };

  const reset = () => {
    setPhase('setup');
    setTest(null);
    setAnswers({});
    setAudioDone(false);
    setResult(null);
    setError(null);
  };

  if (phase === 'setup') {
    return (
      <div className="h-full overflow-y-auto">
        <ListeningSetup onGenerate={handleGenerate} busy={generating} error={error} />
      </div>
    );
  }

  if (phase === 'result' && result) {
    return (
      <div className="h-full overflow-y-auto">
        <ListeningResult result={result} onBack={reset} />
      </div>
    );
  }

  // attempt + submitting share the same shell
  const totalQuestions = (test?.sections || []).reduce((n, s) => n + (s.questions?.length || 0), 0);
  const answeredCount = Object.values(answers).filter((v) => (v || '').toString().trim()).length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5 animate-fade-in">
        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl">{error}</div>
        )}

        {/* Player (sticky on lg so the audio stays visible while scrolling the sheet) */}
        <div className="lg:sticky lg:top-0 lg:z-10 lg:bg-slate-50 lg:pt-2 lg:pb-3">
          <ListeningPlayer
            sections={test.sections}
            onComplete={() => setAudioDone(true)}
          />
          {audioDone && (
            <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Audio finished. Review your answers and submit when ready.
            </div>
          )}
        </div>

        {/* Answer sheet */}
        <AnswerSheet
          sections={test.sections}
          answers={answers}
          onAnswer={handleAnswer}
          locked={phase === 'submitting'}
        />

        {/* Submit bar */}
        <div className="card-padded flex items-center justify-between gap-3 sticky bottom-0">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">{answeredCount}</span>
            {' / '}
            <span>{totalQuestions}</span> answered
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="btn-ghost text-xs text-slate-500 hover:text-slate-700"
            >
              Discard
            </button>
            <button
              onClick={handleSubmit}
              disabled={evaluating}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Marking…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit for marking
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
