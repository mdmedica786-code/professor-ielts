import { Clock, Pause, Play, Lock } from 'lucide-react';
import { formatClock } from './useCountdown';

/**
 * Digital exam clock: green > 5 min, amber < 5 min, pulsing red < 1 min.
 * Pause is only offered when `canPause` (Lernmodus); otherwise a lock shows.
 */
export default function ExamTimer({ secondsLeft, running, canPause = false, onToggle, label = 'Restzeit' }) {
  const tone =
    secondsLeft < 60
      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
      : secondsLeft < 300
      ? 'bg-amber-400 text-slate-900 border-amber-500'
      : 'bg-slate-900 text-emerald-300 border-slate-800';

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-live="off" aria-label={`${label}: ${formatClock(secondsLeft)}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-extrabold tabular-nums shadow-sm ${tone}`}>
        <Clock className="w-4 h-4" />
        <span className="hidden sm:inline text-[10px] font-sans font-bold uppercase tracking-wider opacity-80">{label}</span>
        <span>{formatClock(secondsLeft)}</span>
      </div>
      {canPause ? (
        <button
          type="button"
          onClick={onToggle}
          title={running ? 'Timer pausieren' : 'Timer fortsetzen'}
          aria-label={running ? 'Timer pausieren' : 'Timer fortsetzen'}
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
        >
          {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      ) : (
        <span title="Im Prüfungsmodus kann der Timer nicht pausiert werden" className="p-2 text-slate-400">
          <Lock className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}
