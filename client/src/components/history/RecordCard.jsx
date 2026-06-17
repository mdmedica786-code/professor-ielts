import MiniScoreCard from '../evaluation/MiniScoreCard';
import { formatDateTime, truncate } from '../../utils/formatters';
import { getCriteriaShort } from '../../utils/scoring';
import { useApp } from '../../context/AppContext';
import { ChevronRight, Trash2, Calendar, Mic, PenLine, BookOpenText, Headphones } from 'lucide-react';

const KIND_BADGE = {
  speaking: { label: 'Speaking', icon: Mic, cls: 'bg-violet-100 text-violet-700' },
  writing: { label: 'Writing', icon: PenLine, cls: 'bg-sky-100 text-sky-700' },
  reading: { label: 'Reading', icon: BookOpenText, cls: 'bg-emerald-100 text-emerald-700' },
  listening: { label: 'Listening', icon: Headphones, cls: 'bg-amber-100 text-amber-700' },
};

export default function RecordCard({ record, onClick }) {
  const { deleteHistoryRecord } = useApp();
  const ev = record.evaluation;
  const q = record.question;
  const kind = record.kind || 'speaking';
  const badge = KIND_BADGE[kind] || KIND_BADGE.speaking;

  // A short descriptor of what was attempted, per section.
  let label = q?.topic || 'General';
  if (kind === 'writing' && q) label = `Task ${q.task} · ${q.title || q.topic}`;
  if (kind === 'reading' && q) label = q.topic || 'Reading passage';
  if (kind === 'listening' && q) label = q.topic || 'Listening test';

  const preview =
    kind === 'speaking'
      ? truncate(q?.text || ev?.transcript || '', 100)
      : kind === 'writing'
      ? truncate(q?.text || '', 100)
      : ev?.feedback?.summary || `${ev?.correctCount ?? 0}/${ev?.total ?? 0} correct`;

  return (
    <div
      className="card-padded hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Score */}
        <div className="flex-shrink-0 text-center">
          <div
            className="text-2xl font-mono font-extrabold"
            style={{
              color:
                (ev?.overallBand || 0) >= 7 ? '#059669' :
                (ev?.overallBand || 0) >= 5.5 ? '#d97706' : '#e11d48',
            }}
          >
            {ev?.overallBand?.toFixed(1) || '—'}
          </div>
          <div className="label-caps">Band</div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`part-tag ${badge.cls} flex items-center gap-1`}>
              <badge.icon className="w-3 h-3" />
              {badge.label}
            </span>
            <span className="text-xs text-slate-500 truncate">{label}</span>
          </div>

          <p className="text-xs text-slate-600 line-clamp-1">{preview}</p>

          {/* Per-criterion chips (speaking & writing) or reading accuracy */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {kind === 'reading' || kind === 'listening'
              ? ev?.total != null && (
                  <span className="score-badge score-okay">
                    {ev.correctCount}/{ev.total} correct
                  </span>
                )
              : ev?.scores &&
                Object.entries(ev.scores).map(([k, v]) => (
                  <MiniScoreCard key={k} score={v} label={getCriteriaShort(k)} />
                ))}
          </div>
        </div>

        {/* Metadata & Actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Calendar className="w-3 h-3" />
            {formatDateTime(record.timestamp)}
          </span>

          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Delete this evaluation?')) {
                  deleteHistoryRecord(record.id);
                }
              }}
              className="p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
