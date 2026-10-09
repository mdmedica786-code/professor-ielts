import { GraduationCap, Lightbulb } from 'lucide-react';
import { useExamMode } from './useExamMode';

/**
 * Pill switch between Prüfungsmodus (strict) and Lernmodus (guided).
 * `locked` keeps the current mode while an exam section is running.
 */
export default function ExamModeToggle({ locked = false, className = '' }) {
  const { mode, setMode } = useExamMode();

  const options = [
    { key: 'pruefung', label: 'Prüfungsmodus', hint: 'Echte Prüfungsbedingungen: offizieller Timer, keine Hilfen', Icon: GraduationCap },
    { key: 'lern', label: 'Lernmodus', hint: 'Übersetzungen, Redemittel, Pause und Hinweise', Icon: Lightbulb },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Prüfungsmodus wählen"
      className={`inline-flex items-center rounded-full bg-slate-100 p-1 border border-slate-200 ${className}`}
    >
      {options.map(({ key, label, hint, Icon }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={locked && !active ? 'Während eines laufenden Prüfungsteils nicht änderbar' : hint}
            disabled={locked && !active}
            onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? key === 'pruefung'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-amber-400 text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
