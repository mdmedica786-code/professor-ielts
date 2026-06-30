import { ExternalLink } from 'lucide-react';
import { AFFILIATE_LINKS, AFFILIATE_DISCLOSURE, AFFILIATE_ENABLED } from '../../data/affiliateLinks';

/**
 * Contextual affiliate recommendations. Drop <RecommendStrip /> on any zero-cost
 * screen (History, results, etc.). Renders nothing if disabled. Pure margin —
 * no API cost, and it never gates a feature.
 *
 * @param {string} [title] optional heading
 * @param {number} [limit] max cards to show (default 3)
 */
export default function RecommendStrip({ title = 'Recommended for you', limit = 3 }) {
  if (!AFFILIATE_ENABLED || AFFILIATE_LINKS.length === 0) return null;
  const items = AFFILIATE_LINKS.slice(0, limit);

  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <span className="text-[10px] text-slate-400">Ad</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {items.map((it) => (
          <a
            key={it.id}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="card-padded flex flex-col gap-1 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{it.emoji}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500" />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-brand-600 font-semibold">{it.category}</div>
            <div className="text-sm font-bold text-slate-800 leading-tight">{it.title}</div>
            <div className="text-[11px] text-slate-500 leading-snug">{it.blurb}</div>
          </a>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 mt-2">{AFFILIATE_DISCLOSURE}</p>
    </div>
  );
}
