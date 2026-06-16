import ScoreGauge from '../evaluation/ScoreGauge';
import { getBandDescriptor } from '../../utils/scoring';
import { formatDateTime } from '../../utils/formatters';
import {
  Award, CheckCircle2, XCircle, Lightbulb, ThumbsUp, AlertTriangle, ArrowLeft, BookOpenText,
} from 'lucide-react';

const TYPE_LABEL = {
  tfng: 'True / False / Not Given',
  ynng: 'Yes / No / Not Given',
  mcq: 'Multiple choice',
  gap: 'Completion',
  heading: 'Matching headings',
};

function FeedbackList({ title, items, icon: Icon, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <span className={`label-caps flex items-center gap-1 mb-1.5 ${tone}`}>
        <Icon className="w-3 h-3" /> {title}
      </span>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-slate-600 leading-relaxed pl-4 relative">
            <span className="absolute left-0 text-slate-300">•</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ReadingResult({ result, onBack, backLabel = 'New passage' }) {
  const r = result;
  const fb = r.feedback || {};

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5 animate-slide-up">
        {/* Header / back */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="btn-ghost flex items-center gap-1.5 text-sm">
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
          {r.metadata?.timestamp && (
            <span className="text-xs text-slate-400">{formatDateTime(r.metadata.timestamp)}</span>
          )}
        </div>

        {/* Band */}
        <div className="card-padded text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Award className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-bold text-slate-900">IELTS Reading Score</h2>
          </div>
          <ScoreGauge score={r.overallBand} size={150} strokeWidth={10} />
          <p className="text-sm text-slate-600 mt-3 font-medium">
            Band {r.overallBand.toFixed(1)} — {getBandDescriptor(r.overallBand)}
          </p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-2xl font-mono font-extrabold text-slate-900">
                {r.correctCount}/{r.total}
              </div>
              <div className="label-caps mt-0.5">Correct</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-mono font-extrabold text-slate-900">{r.accuracy}%</div>
              <div className="label-caps mt-0.5">Accuracy</div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Band estimated from the {r.module === 'general' ? 'General Training' : 'Academic'} raw-score
            conversion for a {r.total}-question set.
          </p>
        </div>

        {/* Feedback */}
        {(fb.summary || fb.strengths?.length || fb.weaknesses?.length || fb.strategies?.length) && (
          <div className="card-padded space-y-4">
            {fb.summary && <p className="text-sm text-slate-700 leading-relaxed">{fb.summary}</p>}
            <FeedbackList title="Strengths" items={fb.strengths} icon={ThumbsUp} tone="text-emerald-600" />
            <FeedbackList title="To improve" items={fb.weaknesses} icon={AlertTriangle} tone="text-rose-600" />
            <FeedbackList title="Strategies" items={fb.strategies} icon={Lightbulb} tone="text-brand-600" />
          </div>
        )}

        {/* Per-question review */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpenText className="w-4 h-4 text-brand-500" /> Answer review
          </h3>
          {r.results.map((q) => (
            <div
              key={q.id}
              className={`card-padded border-l-4 ${
                q.correct ? 'border-l-emerald-400' : 'border-l-rose-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    q.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {q.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">Q{q.number}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {TYPE_LABEL[q.type] || q.type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-1 leading-relaxed">{q.prompt}</p>

                  <div className="flex flex-wrap gap-2 mt-2 text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        q.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      You: {q.studentAnswer ? `"${q.studentAnswer}"` : '(blank)'}
                    </span>
                    {!q.correct && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        Answer: "{q.correctAnswer}"
                      </span>
                    )}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed bg-slate-50 rounded-lg p-2.5">
                      {q.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
