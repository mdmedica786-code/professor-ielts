import { BookOpenText, Hash } from 'lucide-react';

/**
 * Renders a reading passage with its title and paragraph breaks preserved.
 */
export default function PassageView({ passage }) {
  if (!passage) return null;
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <BookOpenText className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <h2 className="text-sm font-bold text-slate-900 truncate">{passage.title}</h2>
        </div>
        {passage.wordCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-slate-400 flex-shrink-0">
            <Hash className="w-3 h-3" /> {passage.wordCount} words
          </span>
        )}
      </div>
      <article className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {passage.text}
      </article>
    </div>
  );
}
