import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { evaluateSpeaking } from '../../api/client';
import { Sparkles, Loader2, Send } from 'lucide-react';

const LOADING_STEPS = [
  'Uploading your audio...',
  'Transcribing with Whisper...',
  'Detecting pauses & hesitations...',
  'Analyzing fillers & disfluencies...',
  'Grading fluency, vocabulary & grammar...',
  'Calibrating your IELTS band...',
  'Preparing your report...',
];

export default function SubmitButton({ disabled, submitData, transcript }) {
  const {
    selectedQuestion,
    studentName,
    setCurrentEvaluation,
    setIsEvaluating,
    isEvaluating,
    saveEvaluation,
  } = useApp();

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);

  // Cycle loading steps
  useEffect(() => {
    if (!isEvaluating) return;
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isEvaluating]);

  const handleSubmit = async () => {
    if (!submitData || !selectedQuestion) return;

    setIsEvaluating(true);
    setError(null);
    setStepIndex(0);

    try {
      const result = await evaluateSpeaking({
        audioFile: submitData.audioFile || null,
        transcript: submitData.transcript || transcript || '',
        questionText: selectedQuestion.text,
        questionPart: selectedQuestion.part,
        studentName: studentName || 'Student',
      });

      if (result.success) {
        setCurrentEvaluation(result.data);
        saveEvaluation(result.data);
      } else {
        setError(result.error || 'Evaluation failed');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Something went wrong. Please try again.'
      );
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isEvaluating) {
    return (
      <div className="card-padded text-center animate-fade-in">
        <Sparkles className="w-8 h-8 text-brand-500 mx-auto mb-3 animate-pulse-slow" />
        <p className="text-sm font-semibold text-slate-800 mb-2">Evaluating your response...</p>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          {LOADING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'bg-brand-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-slate-500 h-5">{LOADING_STEPS[stepIndex]}</p>

        {/* Loading dots */}
        <div className="flex justify-center gap-1 mt-3">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 loading-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 loading-dot" />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 loading-dot" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        id="evaluate-btn"
        onClick={handleSubmit}
        disabled={disabled}
        className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        Evaluate Response
      </button>

      {!selectedQuestion && (
        <p className="text-[10px] text-slate-400 text-center">
          Select a question from the bank first
        </p>
      )}
    </div>
  );
}
