import { Activity, Clock, Repeat, AlertCircle, MessageSquare } from 'lucide-react';

export default function FluencyView({ evaluation }) {
  const { pauseAnalysis, disfluencyAnalysis } = evaluation;

  // If we don't have fluency data, show a message
  if (!pauseAnalysis && !disfluencyAnalysis) {
    return (
      <div className="card-padded text-center py-12">
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">No Fluency Data</h3>
        <p className="text-xs text-slate-500">Fluency analysis is not available for this evaluation.</p>
      </div>
    );
  }

  const { count: pauseCount = 0, totalPauseDuration = 0 } = pauseAnalysis || {};
  const { fillers = [], repetitions = [], false_starts = [], summary = {} } = disfluencyAnalysis || {};

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-padded bg-amber-50 border-amber-100">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Pauses (&ge;0.6s)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">{pauseCount}</span>
            <span className="text-xs font-medium text-amber-700/80">({totalPauseDuration}s total)</span>
          </div>
        </div>

        <div className="card-padded bg-blue-50 border-blue-100">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Fillers</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-900">{summary.filler_count || 0}</span>
          </div>
        </div>

        <div className="card-padded bg-purple-50 border-purple-100">
          <div className="flex items-center gap-2 text-purple-700 mb-2">
            <Repeat className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Repetitions</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-900">{summary.repetition_count || 0}</span>
          </div>
        </div>

        <div className="card-padded bg-rose-50 border-rose-100">
          <div className="flex items-center gap-2 text-rose-700 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">False Starts</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-900">{summary.false_start_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Disfluency Rate */}
      {summary.disfluency_rate !== undefined && (
        <div className="card-padded flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Disfluency Rate</h4>
            <p className="text-xs text-slate-500 mt-0.5">Disfluencies per word spoken</p>
          </div>
          <div className="text-lg font-black text-slate-900">
            {(summary.disfluency_rate * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Fillers List */}
        {fillers.length > 0 && (
          <div className="card-padded">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Filler Words Used</h4>
            <div className="flex flex-wrap gap-2">
              {summary.filler_words_found?.map((word, i) => {
                const count = fillers.filter(f => f.word.toLowerCase() === word.toLowerCase()).length;
                return (
                  <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs">
                    <span className="font-medium text-slate-700">"{word}"</span>
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                      {count}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Repetitions List */}
        {repetitions.length > 0 && (
          <div className="card-padded">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Repetitions</h4>
            <ul className="space-y-2">
              {repetitions.map((rep, i) => (
                <li key={i} className="text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-md border border-slate-100">
                  "{rep.text}"
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* False Starts List */}
        {false_starts.length > 0 && (
          <div className="card-padded md:col-span-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">False Starts & Self-Corrections</h4>
            <ul className="space-y-2">
              {false_starts.map((fs, i) => (
                <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm bg-rose-50/50 px-3 py-2 rounded-md border border-rose-100">
                  <span className="text-rose-600 font-medium line-through decoration-rose-300">"{fs.original}"</span>
                  <span className="hidden sm:inline text-slate-300">&rarr;</span>
                  <span className="text-slate-800 font-medium">"{fs.correction}"</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}


