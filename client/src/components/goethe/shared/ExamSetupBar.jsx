import { useState } from 'react';
import { getTopicsForLevel } from '../../../data/goethe/goetheTopics';

const LEVELS = [
  { key: 'A2', label: 'A2 · Grundkenntnisse' },
  { key: 'B1', label: 'B1 · Zertifikat B1' },
  { key: 'B2', label: 'B2 · Fortgeschritten' },
  { key: 'C1', label: 'C1 · Fachkundig' },
];

/**
 * Level + topic selection before a module starts. topic '' = free choice
 * (as in the real exam, each Teil gets its own theme).
 */
export default function ExamSetupBar({ level, onLevelChange, topic, onTopicChange, disabled = false }) {
  const topics = getTopicsForLevel(level);
  const isPreset = topic === '' || topics.some((t) => t.title === topic);
  const [custom, setCustom] = useState(isPreset ? '' : topic);

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-card grid gap-3 sm:grid-cols-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-600">Niveaustufe</span>
        <select
          value={level}
          disabled={disabled}
          onChange={(e) => onLevelChange(e.target.value)}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
        >
          {LEVELS.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-600">Thema</span>
        <select
          value={isPreset ? topic : '__custom'}
          disabled={disabled}
          onChange={(e) => {
            if (e.target.value === '__custom') onTopicChange(custom || ' ');
            else onTopicChange(e.target.value);
          }}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800"
        >
          <option value="">Zufällig (wie in der Prüfung)</option>
          {topics.map((t) => (
            <option key={t.id} value={t.title}>
              {t.title}
            </option>
          ))}
          <option value="__custom">Eigenes Thema …</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-bold text-slate-600">Eigenes Wunschthema</span>
        <input
          type="text"
          value={custom}
          disabled={disabled}
          placeholder="z. B. Künstliche Intelligenz im Alltag"
          onChange={(e) => {
            setCustom(e.target.value);
            onTopicChange(e.target.value);
          }}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-800"
        />
      </label>
    </div>
  );
}
