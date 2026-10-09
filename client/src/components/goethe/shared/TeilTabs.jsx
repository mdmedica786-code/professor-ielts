import { CheckCircle2, Loader2 } from 'lucide-react';

/**
 * Tabs for the Teile (or Aufgaben) of a module.
 * items: [{ key, label, title, status: 'idle'|'loading'|'active'|'done', answered, total }]
 */
export default function TeilTabs({ items, activeKey, onChange }) {
  return (
    <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={`flex-shrink-0 min-w-[96px] text-left px-3 py-2 rounded-xl border transition-all ${
              active
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
            }`}
          >
            <span className="flex items-center gap-1.5 text-xs font-extrabold">
              {it.label}
              {it.status === 'done' && <CheckCircle2 className={`w-3.5 h-3.5 ${active ? 'text-emerald-300' : 'text-emerald-600'}`} />}
              {it.status === 'loading' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            </span>
            <span className={`block text-[10px] font-semibold truncate max-w-[150px] ${active ? 'text-slate-300' : 'text-slate-400'}`}>
              {it.title}
              {it.total ? ` · ${it.answered || 0}/${it.total}` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
