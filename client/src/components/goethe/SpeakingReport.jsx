import { Award, Volume2 } from 'lucide-react';
import { getPraedikat } from '../../data/goethe/goetheGradingRules';
import { summarizeSpeaking } from './speakingScore';

const LABELS = {
  erfuellung: 'Erfüllung',
  interaktion: 'Interaktion',
  kohaerenz: 'Kohärenz',
  wortschatz: 'Wortschatz',
  strukturen: 'Strukturen',
  aussprache: 'Aussprache',
};
const BAND_STYLE = {
  A: 'bg-emerald-600 text-white',
  B: 'bg-lime-500 text-slate-900',
  C: 'bg-amber-400 text-slate-900',
  D: 'bg-orange-500 text-white',
  E: 'bg-rose-600 text-white',
};

const norm = (s) => String(s || '').toLowerCase().replace(/[.,;:!?„“"'()]/g, '').replace(/\s+/g, ' ').trim();

/** Corrections from the examiner that quote this utterance. */
function correctionsFor(text, evaluation) {
  const t = norm(text);
  const items = [
    ...(evaluation?.grammarAndVocabFeedback || []).map((f) => ({ spoken: f.candidateSpoke, corrected: f.correction, why: f.explanation })),
    ...(evaluation?.mistakes || []).map((m) => ({ spoken: m.spoken, corrected: m.corrected, why: m.why })),
  ];
  const seen = new Set();
  return items.filter((c) => {
    const q = norm(c.spoken);
    if (q.length < 3 || !t.includes(q) || seen.has(q)) return false;
    seen.add(q);
    return true;
  });
}

export default function SpeakingReport({ level, sprechen, evaluations, histories, partnerName }) {
  const summary = summarizeSpeaking(sprechen, evaluations);
  if (!summary) return null;

  return (
    <div className="flex flex-col gap-5 animate-float-in">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Prüfungsbericht · Sprechen {level} {summary.complete ? '' : '(Teilprüfung)'}
          </p>
          <p className="text-4xl font-extrabold tabular-nums">
            {summary.points100} <span className="text-base text-slate-300">/ 100 Punkte</span>
          </p>
          <p className="text-sm text-slate-400">
            {summary.total} von {summary.max} Rohpunkten · Aussprache {Math.round(summary.aussprache * 10) / 10} / {sprechen.ausspracheMax}
          </p>
        </div>
        <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold ${summary.passed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
          <Award className="w-5 h-5" /> {summary.passed ? getPraedikat(summary.points100).label : 'Nicht bestanden'}
        </span>
      </div>

      {sprechen.teile
        .filter((t) => evaluations[t.teil])
        .map((t) => {
          const ev = evaluations[t.teil];
          const candidateTurns = (histories[t.teil] || []).filter((h) => h.speaker === 'candidate');
          return (
            <section key={t.teil} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <header className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-extrabold text-slate-900">
                  Teil {t.teil}: {t.title}
                </h3>
                <span className="text-sm font-bold tabular-nums text-slate-700">
                  {ev.teilPoints} / {ev.teilMaxPoints} Punkte{ev.knockOut ? ' · Knock-out (Erfüllung E)' : ''}
                </span>
              </header>

              <div className="p-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.keys(ev.maxScores || {}).map((key) => (
                        <tr key={key} className="border-b border-slate-100">
                          <td className="py-2 font-semibold text-slate-800">{LABELS[key] || key}</td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex w-7 h-7 rounded-md items-center justify-center text-xs font-extrabold ${BAND_STYLE[ev.bands?.[key]] || 'bg-slate-200'}`}>
                              {ev.bands?.[key]}
                            </span>
                          </td>
                          <td className="py-2 text-right font-bold tabular-nums">
                            {ev.scores?.[key]} / {ev.maxScores[key]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {ev.verdict && <p className="mt-3 text-sm text-slate-700 leading-relaxed">{ev.verdict}</p>}
                  {ev.slideBreakdown?.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs">
                      {ev.slideBreakdown.map((sl) => (
                        <li key={sl.slide} className={sl.covered ? 'text-emerald-800' : 'text-rose-700'}>
                          {sl.covered ? '✓' : '✗'} Folie {sl.slide}: {sl.title} — {sl.comment}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid gap-3 content-start">
                  {ev.strengths?.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Stärken</p>
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
                        {ev.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ev.areasForImprovement?.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-amber-700 mb-1">Verbessern</p>
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
                        {ev.areasForImprovement.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(ev.recommendedPhrases?.length > 0 || ev.recommendedRedemittel?.length > 0) && (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-sky-700 mb-1">Bessere Redemittel</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[...new Set([...(ev.recommendedPhrases || []), ...(ev.recommendedRedemittel || [])])].map((p) => (
                          <span key={p} className="px-2 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {ev.pronunciationTips?.length > 0 && (
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-violet-700 mb-1">Aussprache</p>
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-0.5">
                        {ev.pronunciationTips.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {candidateTurns.length > 0 && (
                <div className="px-5 pb-5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Ihre Äußerungen · Satz für Satz</p>
                  <ol className="space-y-3">
                    {candidateTurns.map((turn) => {
                      const fixes = correctionsFor(turn.text, ev);
                      return (
                        <li key={turn.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start gap-3">
                            {turn.audioUrl ? (
                              <button
                                type="button"
                                onClick={() => new Audio(turn.audioUrl).play()}
                                aria-label="Aufnahme abspielen"
                                className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="w-8" />
                            )}
                            <p className="text-sm text-slate-800 leading-relaxed">{turn.text}</p>
                          </div>
                          {fixes.map((f) => (
                            <p key={f.spoken} className="mt-2 ml-11 text-xs">
                              <span className="line-through text-rose-700">{f.spoken}</span> → <span className="font-bold text-emerald-700">{f.corrected}</span>
                              {f.why && <span className="block text-slate-500">{f.why}</span>}
                            </p>
                          ))}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </section>
          );
        })}
      <p className="text-xs text-slate-500">Partner in dieser Prüfung: {partnerName}. Die Aussprache wird aus der Transkription geschätzt.</p>
    </div>
  );
}
