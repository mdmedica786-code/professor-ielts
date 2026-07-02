import { ChevronLeft } from 'lucide-react';

/**
 * Shared premium chrome for the Full Test modes (Speaking / Writing / Reading /
 * Listening). Frosted-glass header with an exit control, brand mark, title, a
 * state-aware timer chip, and a gradient progress rail. Children render inside a
 * single elevated card that owns the internal scroll.
 *
 * Props:
 *   title, subtitle   — header text
 *   onExit            — exit handler
 *   timeLeft          — seconds remaining, or null to hide the timer (e.g. intro)
 *   duration          — total seconds (drives the progress rail if `progress` unset)
 *   formatTime        — (s) => "MM:SS"
 *   progress          — 0–100 override for the rail
 *   maxW              — Tailwind max-width class for the outer container
 */
export default function TestShell({
  title,
  subtitle,
  onExit,
  timeLeft = null,
  duration = null,
  formatTime,
  progress = null,
  maxW = 'max-w-5xl',
  children,
}) {
  const low = timeLeft != null && timeLeft <= 300;
  const pct =
    progress != null
      ? progress
      : timeLeft != null && duration
      ? Math.round((1 - timeLeft / duration) * 100)
      : null;

  return (
    <div
      className={`h-full flex flex-col mx-auto w-full ${maxW} px-3 pt-3 pb-4 md:px-5 md:pb-5 animate-fade-in`}
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Frosted header */}
      <header className="bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/70 rounded-2xl shadow-sm px-3 py-2.5 flex items-center gap-3">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm font-medium pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-white/80 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Exit
        </button>
        <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-brand-600 to-violet-500 grid place-items-center text-white font-extrabold text-[13px] shadow-lg shadow-brand-500/30 shrink-0">
          BL
        </div>
        <div className="leading-tight min-w-0">
          <div className="font-bold text-sm tracking-tight text-slate-900 truncate">{title}</div>
          {subtitle && <div className="text-[11px] text-slate-500 truncate">{subtitle}</div>}
        </div>
        {timeLeft != null && (
          <div
            className={`ml-auto inline-flex items-center gap-2 font-mono tabular-nums font-bold text-lg px-3.5 py-1.5 rounded-xl border ${
              low
                ? 'text-amber-800 bg-amber-50 border-amber-200 animate-pulse'
                : 'text-slate-800 bg-white/70 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${low ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {formatTime ? formatTime(timeLeft) : timeLeft}
          </div>
        )}
      </header>

      {/* Progress rail */}
      {pct != null && (
        <div className="h-1 rounded-full bg-slate-100 overflow-hidden mx-1 mt-2.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-700"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      )}

      {/* Card */}
      <div className="flex-1 min-h-0 mt-3 bg-white border border-slate-200 rounded-[22px] shadow-card overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
