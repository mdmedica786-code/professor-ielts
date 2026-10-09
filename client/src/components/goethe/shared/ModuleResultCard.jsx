import { Award } from 'lucide-react';
import { getPraedikat } from '../../../data/goethe/goetheGradingRules';

/** Ergebnis of a receptive module: points /100, raw score and Bestehensgrenze. */
export default function ModuleResultCard({ moduleLabel, level, summary, children }) {
  if (!summary) return null;
  const praedikat = summary.passed ? getPraedikat(summary.points100) : getPraedikat(0);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 shadow-md animate-float-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Ergebnis · {moduleLabel} {level} {summary.complete ? '' : `(${summary.teileDone} Teil${summary.teileDone === 1 ? '' : 'e'})`}
          </p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold tabular-nums">{summary.points100}</span>
            <span className="text-slate-300 font-bold">/ 100 Punkte</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {summary.raw} von {summary.maxRaw} Aufgaben richtig · Bestehensgrenze {summary.passRaw} richtige Aufgaben und 60 Punkte
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Award className={`w-8 h-8 ${summary.passed ? 'text-emerald-300' : 'text-rose-300'}`} />
          <span
            className={`px-4 py-2 rounded-xl text-sm font-extrabold border ${
              summary.passed ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50' : 'bg-rose-500/20 text-rose-200 border-rose-400/50'
            }`}
          >
            {summary.passed ? praedikat.label : 'Nicht bestanden'}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}
