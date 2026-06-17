import ScoreGauge from '../evaluation/ScoreGauge';
import { getCriteriaName, getBandDescriptor, getScoreColor } from '../../utils/scoring';
import { formatDateTime } from '../../utils/formatters';
import { Award, Hash, User, AlertCircle } from 'lucide-react';

const ORDER = ['tr', 'cc', 'lr', 'gra'];

export default function WritingReport({ evaluation }) {
  const ev = evaluation;
  const meta = ev.metadata || {};

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Overall band */}
      <div className="card-padded text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Award className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-bold text-slate-900">
            IELTS Writing Score — Task {meta.taskType || ''}
          </h2>
        </div>

        <ScoreGauge score={ev.overallBand} size={160} strokeWidth={10} />

        <p className="text-sm text-slate-600 mt-3 font-medium">
          Band {ev.overallBand.toFixed(1)} — {getBandDescriptor(ev.overallBand)}
        </p>

        {/* 4 criteria scores */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          {ORDER.map((key) => {
            const val = ev.scores?.[key] ?? 0;
            return (
              <div key={key} className="text-center">
                <div
                  className="text-2xl font-mono font-extrabold"
                  style={{ color: getScoreColor(val).main }}
                >
                  {val.toFixed(1)}
                </div>
                <div className="label-caps mt-1">{key.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-3">
          {ORDER.map((k) => `${k.toUpperCase()} = ${getCriteriaName(k)}`).join('  ·  ')}
        </p>
      </div>

      {/* Verdict */}
      {ev.verdict && (
        <div className="card-padded bg-brand-50/50 border-brand-200">
          <p className="text-sm text-brand-900 leading-relaxed">{ev.verdict}</p>
        </div>
      )}

      {/* Under-length warning */}
      {meta.underLength && (
        <div className="card-padded bg-amber-50 border-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Your response was {meta.wordCount} words — below the {meta.minWords}-word minimum for Task{' '}
            {meta.taskType}. In a real test this limits your Task Achievement band.
          </p>
        </div>
      )}

      {/* Reference Image */}
      {meta.imageBase64 && (
        <div className="card-padded bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Reference Image</p>
          <img src={meta.imageBase64} alt="Task Reference" className="max-w-full rounded border border-slate-200 shadow-sm" />
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-400">
        {meta.studentName && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {meta.studentName}
          </span>
        )}
        {meta.wordCount > 0 && (
          <span className="flex items-center gap-1">
            <Hash className="w-3 h-3" /> {meta.wordCount} words
          </span>
        )}
        {meta.timestamp && <span>{formatDateTime(meta.timestamp)}</span>}
      </div>
    </div>
  );
}
