import { useState } from 'react';
import { AlertTriangle, BookOpen, ChevronDown } from 'lucide-react';

const CRITERION_LABELS = {
  erfuellung: 'Erfüllung',
  kohaerenz: 'Kohärenz',
  wortschatz: 'Wortschatz',
  strukturen: 'Strukturen',
  kommunikation: 'Kommunikative Gestaltung',
  korrektheit: 'Formale Richtigkeit',
};

const BAND_STYLE = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-lime-500 text-slate-900',
  C: 'bg-amber-400 text-slate-900',
  D: 'bg-orange-500 text-white',
  E: 'bg-rose-600 text-white',
};

const CATEGORY_STYLE = {
  Grammatik: 'decoration-rose-500 bg-rose-50',
  Wortschatz: 'decoration-amber-500 bg-amber-50',
  Rechtschreibung: 'decoration-violet-500 bg-violet-50',
  Register: 'decoration-sky-500 bg-sky-50',
  Textaufbau: 'decoration-slate-500 bg-slate-100',
};

/** Splits the essay into plain text and marked mistakes (first non-overlapping occurrence). */
function markMistakes(text, mistakes) {
  const ranges = [];
  (mistakes || []).forEach((m, idx) => {
    const quote = String(m.original || '').trim();
    if (quote.length < 2) return;
    let from = 0;
    while (from < text.length) {
      const at = text.indexOf(quote, from);
      if (at < 0) return;
      const end = at + quote.length;
      if (!ranges.some((r) => at < r.end && end > r.start)) {
        ranges.push({ start: at, end, mistake: m, idx });
        return;
      }
      from = at + 1;
    }
  });
  ranges.sort((a, b) => a.start - b.start);
  const out = [];
  let cursor = 0;
  ranges.forEach((r) => {
    if (r.start > cursor) out.push({ text: text.slice(cursor, r.start) });
    out.push({ text: text.slice(r.start, r.end), mistake: r.mistake, idx: r.idx });
    cursor = r.end;
  });
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}

/**
 * Examiner feedback for one Aufgabe: band per criterion, points, knock-out,
 * the essay with colour-coded mistakes, model answer and Redemittel.
 */
export default function WritingEvaluation({ evaluation, essay }) {
  const [showModel, setShowModel] = useState(false);
  const criteria = Object.keys(evaluation.maxScores || evaluation.scores || {});
  const segments = markMistakes(essay, evaluation.mistakes);

  return (
    <div className="flex flex-col gap-4 animate-float-in">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Bewertung · Aufgabe {evaluation.taskNumber} · {evaluation.wordCount} Wörter
            </p>
            <p className="text-2xl font-extrabold tabular-nums">
              {evaluation.totalPoints} <span className="text-base text-slate-400">/ {evaluation.maxPoints} Punkte</span>
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-extrabold ${evaluation.passed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
            {evaluation.praedikat}
          </span>
        </div>

        {evaluation.knockOut && (
          <p className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            Knock-out: Erfüllung wurde mit Band E bewertet (Thema verfehlt oder unter 50 % der Wortzahl). Die gesamte Aufgabe erhält 0 Punkte.
          </p>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="px-5 py-2 font-bold">Kriterium</th>
              <th className="px-3 py-2 font-bold text-center">Band</th>
              <th className="px-5 py-2 font-bold text-right">Punkte</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((key) => {
              const band = evaluation.bands?.[key];
              const detail = evaluation.criteriaAnalysis?.[key];
              return (
                <tr key={key} className="border-b border-slate-100 align-top">
                  <td className="px-5 py-3">
                    <p className="font-bold text-slate-900">{CRITERION_LABELS[key] || key}</p>
                    {detail?.examinerComment && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{detail.examinerComment}</p>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center font-extrabold ${BAND_STYLE[band] || 'bg-slate-200'}`}>{band}</span>
                  </td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums text-slate-900">
                    {evaluation.scores?.[key]} / {evaluation.maxScores?.[key]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {evaluation.verdict && <p className="px-5 py-4 text-sm text-slate-700 leading-relaxed">{evaluation.verdict}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Ihr Text mit Korrekturen</p>
        <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
          {Object.entries(CATEGORY_STYLE).map(([cat, cls]) => (
            <span key={cat} className={`px-2 py-0.5 rounded underline decoration-2 ${cls}`}>
              {cat}
            </span>
          ))}
        </div>
        <p className="text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">
          {segments.map((seg, i) =>
            seg.mistake ? (
              <mark
                key={i}
                title={`${seg.mistake.correction} — ${seg.mistake.explanation || ''}`}
                className={`underline decoration-2 underline-offset-2 text-inherit rounded-sm ${CATEGORY_STYLE[seg.mistake.category] || CATEGORY_STYLE.Grammatik}`}
              >
                {seg.text}
                <sup className="text-[9px] font-bold text-slate-500 ml-0.5">{seg.idx + 1}</sup>
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </p>
        {evaluation.mistakes?.length > 0 && (
          <ol className="mt-4 space-y-2 text-sm">
            {evaluation.mistakes.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-xs font-bold text-slate-400 w-5 pt-0.5">{i + 1}</span>
                <span>
                  <span className="line-through text-rose-700">{m.original}</span> → <span className="font-bold text-emerald-700">{m.correction}</span>
                  {m.explanation && <span className="block text-xs text-slate-500">{m.explanation}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {evaluation.improvedVersion && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50">
          <button
            type="button"
            onClick={() => setShowModel((v) => !v)}
            aria-expanded={showModel}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-bold text-emerald-900"
          >
            <span className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Musterlösung
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showModel ? 'rotate-180' : ''}`} />
          </button>
          {showModel && <p className="px-5 pb-5 text-[15px] leading-relaxed text-slate-800 whitespace-pre-wrap">{evaluation.improvedVersion}</p>}
        </div>
      )}

      {(evaluation.recommendedRedemittel?.length > 0 || evaluation.nextSteps?.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {evaluation.recommendedRedemittel?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Bessere Redemittel</p>
              <ul className="space-y-2 text-sm">
                {evaluation.recommendedRedemittel.map((r, i) => (
                  <li key={i}>
                    <span className="font-bold text-slate-900">{r.phrase || r}</span>
                    {r.function && <span className="text-xs text-slate-500"> · {r.function}</span>}
                    {r.example && <span className="block text-xs text-slate-600 italic">{r.example}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.nextSteps?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Nächste Schritte</p>
              <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-5">
                {evaluation.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
