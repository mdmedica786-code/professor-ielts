import { Flag } from 'lucide-react';

/**
 * Grid of item numbers: answered (green), flagged (amber), open (slate),
 * and after evaluation correct/incorrect. Clicking jumps to the item.
 */
export default function QuestionPalette({ questions, answers, flags = {}, results = null, onJump }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Aufgabenübersicht">
      {questions.map((q) => {
        const answered = String(answers[q.number] ?? '').trim() !== '';
        const flagged = flags[q.number];
        const result = results?.find((r) => r.number === q.number);
        const cls = result
          ? result.isCorrect
            ? 'bg-emerald-600 text-white border-emerald-700'
            : 'bg-rose-600 text-white border-rose-700'
          : flagged
          ? 'bg-amber-100 text-amber-900 border-amber-400'
          : answered
          ? 'bg-emerald-50 text-emerald-800 border-emerald-400'
          : 'bg-white text-slate-500 border-slate-300';
        return (
          <button
            key={q.number}
            type="button"
            onClick={() => onJump?.(q.number)}
            title={flagged ? 'Gemerkt' : answered ? 'Beantwortet' : 'Offen'}
            className={`relative w-8 h-8 rounded-lg border text-xs font-bold tabular-nums ${cls}`}
          >
            {q.number}
            {flagged && !result && <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-600 fill-amber-400" />}
          </button>
        );
      })}
    </div>
  );
}
