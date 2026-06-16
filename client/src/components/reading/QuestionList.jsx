import QuestionItem from './QuestionItem';
import { Sparkles, Loader2, Send } from 'lucide-react';

export default function QuestionList({ questions, answers, onAnswer, onSubmit, busy }) {
  const answered = questions.filter((q) => {
    const a = answers[q.id];
    return a !== undefined && a !== null && String(a).trim() !== '';
  }).length;
  const total = questions.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">Questions</h3>
        <span className="text-[11px] font-semibold text-slate-400">
          {answered} / {total} answered
        </span>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(val) => onAnswer(q.id, val)}
          />
        ))}
      </div>

      {busy ? (
        <div className="card-padded text-center animate-fade-in">
          <Sparkles className="w-7 h-7 text-brand-500 mx-auto mb-2 animate-pulse-slow" />
          <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Marking your answers…
          </p>
        </div>
      ) : (
        <button
          id="reading-submit-btn"
          onClick={onSubmit}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Submit answers
        </button>
      )}
      {answered < total && !busy && (
        <p className="text-[10px] text-slate-400 text-center -mt-2">
          Unanswered questions are marked incorrect. You can submit anytime.
        </p>
      )}
    </div>
  );
}
