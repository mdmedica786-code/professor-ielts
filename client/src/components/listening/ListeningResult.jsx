import { ArrowLeft, CheckCircle2, XCircle, Sparkles, Headphones } from 'lucide-react';

const bandColor = (b) => {
  if (b >= 7.5) return 'from-emerald-500 to-teal-700';
  if (b >= 6.5) return 'from-sky-500 to-blue-700';
  if (b >= 5.5) return 'from-amber-500 to-orange-700';
  return 'from-rose-500 to-pink-700';
};

export default function ListeningResult({ result, onBack }) {
  const { overallBand, correctCount, total, accuracy, sectionResults = [], feedback = {} } = result;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={onBack}
          className="btn-ghost flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          New test
        </button>
        <div className="ml-auto flex items-center gap-2 text-slate-500">
          <Headphones className="w-4 h-4" />
          <span className="text-xs font-medium">Listening Result</span>
        </div>
      </div>

      {/* Overall band */}
      <div className={`rounded-2xl p-5 bg-gradient-to-br ${bandColor(overallBand)} text-white shadow-md`}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80">Overall Band</div>
            <div className="text-5xl font-extrabold leading-none mt-1">{overallBand.toFixed(1)}</div>
            <div className="text-xs opacity-90 mt-1.5">
              {correctCount} of {total} correct · {accuracy}%
            </div>
          </div>
          <div className="text-right text-xs opacity-90">
            <div className="font-semibold">{result.size === 'full' ? 'Full 4-section test' : 'Single-section practice'}</div>
            <div className="opacity-80">{result.title}</div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {(feedback.summary || feedback.strengths?.length || feedback.weaknesses?.length || feedback.strategies?.length) && (
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              Examiner coaching
            </div>
          </div>
          {feedback.summary && (
            <p className="text-sm text-slate-800 leading-relaxed mb-3">{feedback.summary}</p>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            <FeedbackList title="Strengths" items={feedback.strengths} tone="emerald" />
            <FeedbackList title="Weaknesses" items={feedback.weaknesses} tone="rose" />
            <FeedbackList title="Strategies" items={feedback.strategies} tone="brand" />
          </div>
        </div>
      )}

      {/* Per-section breakdown */}
      <div className="space-y-4">
        {sectionResults.map((sr) => (
          <div key={sr.number} className="card-padded">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                  Section {sr.number}
                </div>
                <div className="text-sm font-bold text-slate-900">{sr.title}</div>
              </div>
              <div className="text-xs font-semibold text-slate-700">
                {sr.correctCount}/{sr.total}
              </div>
            </div>
            <div className="space-y-2">
              {sr.questions.map((r) => (
                <QuestionResult key={r.id} r={r} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedbackList({ title, items, tone }) {
  if (!items?.length) return null;
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    rose: 'bg-rose-50 text-rose-800 border-rose-100',
    brand: 'bg-brand-50 text-brand-800 border-brand-100',
  };
  return (
    <div className={`rounded-xl p-3 border ${colors[tone] || colors.brand}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5">{title}</div>
      <ul className="space-y-1 text-xs leading-relaxed">
        {items.map((it, i) => (
          <li key={i}>• {it}</li>
        ))}
      </ul>
    </div>
  );
}

function QuestionResult({ r }) {
  const Icon = r.correct ? CheckCircle2 : XCircle;
  return (
    <div className={`rounded-xl p-3 border ${r.correct ? 'bg-emerald-50/60 border-emerald-100' : 'bg-rose-50/60 border-rose-100'}`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${r.correct ? 'text-emerald-600' : 'text-rose-600'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs">
            <span className="font-bold text-slate-900">Q{r.number}</span>
            <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-400">{r.type}</span>
          </div>
          <div className="text-xs text-slate-700 leading-relaxed mt-0.5">{r.prompt}</div>
          <div className="text-[11px] mt-1.5 grid gap-0.5">
            <div>
              <span className="text-slate-500">Your answer: </span>
              <span className={r.correct ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {r.studentAnswer || '(blank)'}
              </span>
            </div>
            {!r.correct && (
              <div>
                <span className="text-slate-500">Correct: </span>
                <span className="text-slate-900 font-semibold">{r.correctAnswer}</span>
              </div>
            )}
            {r.explanation && (
              <div className="text-slate-500 italic mt-0.5">{r.explanation}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
