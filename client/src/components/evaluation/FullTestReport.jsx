import { useState } from 'react';
import ScoreGauge from './ScoreGauge';
import TranscriptView from './TranscriptView';
import MistakeLog from './MistakeLog';
import PronunciationDetail from './PronunciationDetail';
import WritingCriteria from '../writing/WritingCriteria';
import WritingMistakes from '../writing/WritingMistakes';
import WritingModelAnswer from '../writing/WritingModelAnswer';
import { getCriteriaName, getBandDescriptor } from '../../utils/scoring';
import { formatDateTime } from '../../utils/formatters';
import {
  Award, AlertCircle, CheckCircle2, XCircle, BarChart3, AlertTriangle,
  Sparkles, MessageSquare, AudioWaveform, ClipboardList,
} from 'lucide-react';

/**
 * Master report for a Full Test. Renders one overall band hero, then a
 * per-part navigator that surfaces the SAME granular detail as Practice mode
 * (criteria, corrections, rewrites, pronunciation heatmaps, answer review) for
 * every part of the sitting, combined into one cohesive premium dashboard.
 *
 * Expects `evaluation` shaped as the existing combined object, PLUS:
 *   kind  — 'speaking' | 'writing' | 'reading'
 *   parts — [{ label, band, ...fullPartEvaluation }]
 */

const CRITERIA_KEYS = {
  speaking: ['fc', 'lr', 'gra', 'p'],
  writing: ['tr', 'cc', 'lr', 'gra'],
};

// Which detail tabs each part exposes, and what renders them.
const DETAIL_TABS = {
  writing: [
    { id: 'criteria', icon: BarChart3, label: 'Criteria', render: (p) => <WritingCriteria evaluation={p} /> },
    { id: 'mistakes', icon: AlertTriangle, label: 'Corrections', render: (p) => <WritingMistakes evaluation={p} /> },
    { id: 'model', icon: Sparkles, label: 'Model answer', render: (p) => <WritingModelAnswer evaluation={p} /> },
  ],
  speaking: [
    { id: 'mistakes', icon: AlertTriangle, label: 'Corrections', render: (p) => <MistakeLog evaluation={p} /> },
    { id: 'pron', icon: AudioWaveform, label: 'Pronunciation', render: (p) => <PronunciationDetail evaluation={p} /> },
    { id: 'transcript', icon: MessageSquare, label: 'Transcript', render: (p) => <TranscriptView evaluation={p} /> },
  ],
  reading: [
    { id: 'review', icon: ClipboardList, label: 'Answer review', render: (p) => <ReadingReview part={p} /> },
  ],
};

function toneOf(v) {
  return v >= 7
    ? { text: 'text-emerald-600', bar: 'from-emerald-400 to-emerald-600' }
    : v >= 5.5
    ? { text: 'text-amber-600', bar: 'from-amber-400 to-amber-600' }
    : { text: 'text-rose-600', bar: 'from-rose-400 to-rose-600' };
}

// Per-passage answer review for reading parts.
function ReadingReview({ part }) {
  const rows = part.results || part.review || [];
  const fb = part.feedback || {};
  if (rows.length === 0 && !fb.summary) {
    return <p className="text-sm text-slate-500 text-center py-10">No per-question detail was returned for this passage.</p>;
  }
  return (
    <div className="space-y-3 animate-slide-up">
      {fb.summary && (
        <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/60 p-4">
          <p className="text-sm text-slate-700 leading-relaxed">{fb.summary}</p>
        </div>
      )}
      {rows.map((q, i) => (
        <div key={q.id ?? i} className={`rounded-2xl border border-slate-200/70 bg-white p-4 border-l-4 ${q.correct ? 'border-l-emerald-400' : 'border-l-rose-400'}`}>
          <div className="flex items-start gap-3">
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${q.correct ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {q.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900">Q{q.number ?? i + 1}</span>
              {q.prompt && <p className="text-sm text-slate-700 mt-1 leading-relaxed">{q.prompt}</p>}
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded ${q.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  You: {q.studentAnswer ? `"${q.studentAnswer}"` : '(blank)'}
                </span>
                {!q.correct && q.correctAnswer != null && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Answer: "{q.correctAnswer}"</span>
                )}
              </div>
              {q.explanation && (
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed bg-slate-50 rounded-lg p-2.5">{q.explanation}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FullTestReport({ evaluation }) {
  const ev = evaluation;
  const kind = ev.kind || 'speaking';
  const parts = ev.parts || [];
  const critKeys = CRITERIA_KEYS[kind];
  const tabs = DETAIL_TABS[kind] || [];

  const [activePart, setActivePart] = useState(0);
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);

  const part = parts[activePart];
  const partBand = part ? (part.band ?? part.overallBand) : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl xl:max-w-5xl px-4 py-5 md:px-6 md:py-7 space-y-5">

        {/* ── Master hero ───────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-card-lg p-6 md:p-8">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500" />
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[280px] rounded-full bg-brand-500/[0.07] blur-3xl" />

          <div className="relative grid md:grid-cols-[auto,1fr] gap-6 md:gap-8 items-center">
            {/* Overall gauge */}
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 mb-4">
                <Award className="w-3.5 h-3.5 text-brand-600" />
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">Full Test Result</span>
              </div>
              <ScoreGauge score={ev.overallBand} size={150} strokeWidth={10} />
              <p className="text-base text-slate-800 mt-2 font-semibold tracking-tight">
                Band {ev.overallBand.toFixed(1)} — {getBandDescriptor(ev.overallBand)}
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> AI estimate — within ±0.5 of an examiner
              </p>
            </div>

            {/* Criteria tiles (speaking/writing) or raw score (reading) */}
            <div>
              {critKeys ? (
                <div className="grid grid-cols-2 gap-3">
                  {critKeys.map((k) => {
                    const val = ev.scores?.[k] ?? 0;
                    const t = toneOf(val);
                    return (
                      <div key={k} className="stat-tile !text-left">
                        <div className="flex items-baseline justify-between">
                          <span className="label-caps">{k.toUpperCase()}</span>
                          <span className={`text-xl font-mono tabular-nums font-extrabold ${t.text}`}>{val.toFixed(1)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{getCriteriaName(k)}</div>
                        <div className="h-1 rounded-full bg-slate-100 overflow-hidden mt-2">
                          <div className={`h-full rounded-full bg-gradient-to-r ${t.bar} transition-[width] duration-1000`} style={{ width: `${Math.min(100, (val / 9) * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="stat-tile">
                    <div className="text-3xl font-mono font-extrabold text-slate-900">
                      {ev.scores?.correct ?? '—'}<span className="text-lg text-slate-400">/{ev.scores?.total ?? 40}</span>
                    </div>
                    <div className="label-caps mt-1">Correct</div>
                  </div>
                  <div className="stat-tile">
                    <div className="text-3xl font-mono font-extrabold text-slate-900">
                      {ev.scores?.total ? Math.round((ev.scores.correct / ev.scores.total) * 100) : 0}%
                    </div>
                    <div className="label-caps mt-1">Accuracy</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Part navigator ────────────────────────────────── */}
        {parts.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {parts.map((p, i) => {
                const b = p.band ?? p.overallBand;
                const active = i === activePart;
                return (
                  <button
                    key={i}
                    onClick={() => { setActivePart(i); setActiveTab(tabs[0]?.id); }}
                    className={`group flex items-center gap-2.5 rounded-2xl px-4 py-2.5 border transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-br from-brand-600 to-violet-500 text-white border-transparent shadow-glow-sm'
                        : 'bg-white/70 text-slate-600 border-slate-200/70 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <span className="text-sm font-bold tracking-tight">{p.label}</span>
                    {b != null && (
                      <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                        {Number(b).toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detail card for active part */}
            <div className="rounded-[22px] border border-slate-200/70 bg-white shadow-card overflow-hidden">
              {/* Part header + detail tabs */}
              <div className="px-4 md:px-5 pt-4 border-b border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">{part?.label}</h3>
                  {partBand != null && (
                    <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">
                      Band {Number(partBand).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 overflow-x-auto -mb-px">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 transition-all ${
                        activeTab === t.id
                          ? 'text-brand-600 border-brand-500'
                          : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200'
                      }`}
                    >
                      <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 md:p-5">
                {tabs.find((t) => t.id === activeTab)?.render(part)}
              </div>
            </div>
          </>
        )}

        {/* Metadata */}
        {ev.metadata?.timestamp && (
          <div className="flex justify-center">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/70 border border-slate-200/70 shadow-sm text-xs text-slate-500">
              {formatDateTime(ev.metadata.timestamp)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
