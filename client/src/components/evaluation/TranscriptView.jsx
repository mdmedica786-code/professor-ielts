import { useState } from 'react';
import { MessageSquare, Code, ChevronDown, ChevronUp } from 'lucide-react';

export default function TranscriptView({ evaluation }) {
  const [showJson, setShowJson] = useState(false);

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Clean Transcript */}
      <div className="card-padded">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-900">Transcript</h3>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {evaluation.transcript || 'No transcript available.'}
        </p>
      </div>

      {/* Word Timestamps */}
      {evaluation.groqWords?.length > 0 && (
        <div className="card-padded">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">
            Word Timestamps ({evaluation.groqWords.length} words)
          </h4>
          <div className="flex flex-wrap gap-1">
            {evaluation.groqWords.map((w, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 bg-slate-50 rounded px-1.5 py-0.5 text-[11px]"
                title={`${w.start?.toFixed(2)}s - ${w.end?.toFixed(2)}s`}
              >
                <span className="text-slate-700">{w.word}</span>
                <span className="text-slate-300 text-[9px]">{w.start?.toFixed(1)}s</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Raw JSON */}
      <div className="card overflow-hidden">
        <button
          id="toggle-json"
          onClick={() => setShowJson(!showJson)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Raw JSON Response</span>
          </div>
          {showJson ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showJson && (
          <div className="border-t border-slate-200 p-4 bg-slate-900 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono leading-relaxed">
              {JSON.stringify(evaluation, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
