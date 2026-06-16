import ScoreGauge from '../evaluation/ScoreGauge';
import { getCriteriaName } from '../../utils/scoring';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const ORDER = ['tr', 'cc', 'lr', 'gra'];

export default function WritingCriteria({ evaluation }) {
  const ev = evaluation;

  return (
    <div className="space-y-4 animate-slide-up">
      {ORDER.map((key) => {
        const score = ev.scores?.[key] || 0;
        const detail = ev.criteria?.[key] || {};

        return (
          <div key={key} className="card-padded">
            <div className="flex items-start gap-4">
              <ScoreGauge score={score} size={80} strokeWidth={6} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{getCriteriaName(key)}</h3>

                {detail.good?.length > 0 && (
                  <div className="mt-3">
                    <span className="label-caps text-emerald-600 flex items-center gap-1 mb-1.5">
                      <CheckCircle2 className="w-3 h-3" /> Strengths
                    </span>
                    <ul className="space-y-1">
                      {detail.good.map((item, i) => (
                        <li key={i} className="text-xs text-slate-600 leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-emerald-500">+</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.weak?.length > 0 && (
                  <div className="mt-3">
                    <span className="label-caps text-rose-600 flex items-center gap-1 mb-1.5">
                      <XCircle className="w-3 h-3" /> Weaknesses
                    </span>
                    <ul className="space-y-1">
                      {detail.weak.map((item, i) => (
                        <li key={i} className="text-xs text-slate-600 leading-relaxed pl-4 relative">
                          <span className="absolute left-0 text-rose-500">−</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {detail.note && (
                  <div className="mt-3 flex items-start gap-1.5 bg-slate-50 rounded-lg p-2.5">
                    <Info className="w-3 h-3 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 leading-relaxed">{detail.note}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
