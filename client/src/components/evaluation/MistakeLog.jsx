import { AlertTriangle } from 'lucide-react';

const CAT_STYLES = {
  grammar: 'bg-violet-100 text-violet-700',
  vocabulary: 'bg-sky-100 text-sky-700',
  fluency: 'bg-amber-100 text-amber-700',
};

export default function MistakeLog({ evaluation }) {
  const mistakes = evaluation.mistakes || [];

  if (mistakes.length === 0) {
    return (
      <div className="card-padded text-center py-12 animate-slide-up">
        <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No specific mistakes identified.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-slide-up">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-rose-500" />
        <h3 className="text-sm font-bold text-slate-900">
          Error Corrections ({mistakes.length})
        </h3>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Category</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Said</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Correction</th>
              <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Explanation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mistakes.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`part-tag ${CAT_STYLES[m.cat] || 'bg-slate-100 text-slate-600'}`}>
                    {m.cat}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                    "{m.said}"
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    "{m.fix}"
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-xs">{m.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
