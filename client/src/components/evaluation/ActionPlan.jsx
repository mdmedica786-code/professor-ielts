import { Target, TrendingUp, Dumbbell } from 'lucide-react';
import { formatScore } from '../../utils/formatters';

export default function ActionPlan({ evaluation }) {
  const plan = evaluation.plan;
  if (!plan) {
    return (
      <div className="card-padded text-center py-12 animate-slide-up">
        <Target className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No action plan generated.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Target Score */}
      <div className="card-padded bg-gradient-to-r from-brand-50 to-amber-50 border-brand-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="label-caps text-brand-600">Target Band</p>
            <p className="text-2xl font-mono font-extrabold text-brand-800">
              {formatScore(plan.target)}
            </p>
          </div>
        </div>
      </div>

      {/* Focus Area */}
      {plan.focus && (
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900">Key Focus Area</h3>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{plan.focus}</p>
        </div>
      )}

      {/* Drills */}
      {plan.drills?.length > 0 && (
        <div className="card-padded">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900">Daily Practice Drills</h3>
          </div>

          <div className="space-y-3">
            {plan.drills.map((drill, i) => (
              <div
                key={i}
                className="flex items-start gap-3 bg-slate-50 rounded-xl p-3"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <span className="part-tag bg-slate-200 text-slate-600 mb-1 inline-block">
                    {drill.area}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed mt-1">{drill.task}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
