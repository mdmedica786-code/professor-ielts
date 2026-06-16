import { Sparkles, FileText } from 'lucide-react';

function wordCount(text) {
  return text && text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function WritingModelAnswer({ evaluation }) {
  const ev = evaluation;
  const model = ev.improvedVersion || '';
  const essay = ev.essay || '';

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Model answer */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-bold text-slate-900">Model answer</h3>
          </div>
          <span className="text-[10px] text-slate-400">{wordCount(model)} words · ~1 band higher</span>
        </div>
        {model ? (
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{model}</p>
        ) : (
          <p className="text-xs text-slate-400">No model answer was returned.</p>
        )}
        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
          This keeps your ideas but models the cohesion, vocabulary, and grammar to aim for. Compare it
          line-by-line with your own response below.
        </p>
      </div>

      {/* Your response */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900">Your response</h3>
          </div>
          <span className="text-[10px] text-slate-400">{wordCount(essay)} words</span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{essay}</p>
      </div>
    </div>
  );
}
