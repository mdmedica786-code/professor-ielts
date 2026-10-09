const SHORT = { Richtig: 'R', Falsch: 'F', Ja: 'J', Nein: 'N', 'Nicht im Text': 'N' };
const LETTERS = ['a', 'b', 'c', 'd'];

/** Bubble labels and the filled bubble for one item on the optical answer sheet. */
function bubblesFor(q, value) {
  switch (q.type) {
    case 'mcq3':
    case 'mcq4': {
      const idx = q.options.indexOf(value);
      return { bubbles: q.options.map((_, i) => LETTERS[i]), filled: idx >= 0 ? LETTERS[idx] : null };
    }
    case 'richtig_falsch':
    case 'ja_nein':
    case 'rfn':
      return { bubbles: q.options.map((o) => SHORT[o] || o[0]), filled: value ? SHORT[value] || value[0] : null };
    case 'wer_sagt_was':
      return { bubbles: q.options.map((o) => o.split(/\s+/)[0].slice(0, 6)), filled: value ? value.split(/\s+/)[0].slice(0, 6) : null };
    case 'zuordnung':
    case 'lueckentext_saetze':
      return { bubbles: q.options, filled: value || null };
    default:
      return { written: value || '' };
  }
}

/**
 * Simulated Antwortbogen: every item of the module with its bubbles, filled
 * from the candidate's answers (correct/incorrect after evaluation).
 */
export default function AnswerSheet({ moduleLabel, parts, tests, answers, results }) {
  return (
    <div className="rounded-2xl border-2 border-slate-300 bg-[#fdfdf8] p-4 md:p-6 font-mono text-slate-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-dashed border-slate-300 pb-3 mb-4">
        <span className="font-sans font-extrabold text-sm uppercase tracking-widest">Antwortbogen · {moduleLabel}</span>
        <span className="text-[11px] text-slate-500 font-sans">Markieren Sie nur eine Lösung pro Aufgabe.</span>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {parts.map((p) => {
          const test = tests[p.teil];
          const teilAnswers = answers[p.teil] || {};
          const teilResults = results[p.teil]?.breakdown || null;
          const numbers = Array.from({ length: p.count }, (_, i) => p.from + i);
          return (
            <div key={p.teil}>
              <p className="font-sans text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                Teil {p.teil} · {p.title}
              </p>
              <div className="space-y-1">
                {numbers.map((n) => {
                  const q = test?.questions?.find((x) => x.number === n);
                  const value = teilAnswers[n];
                  const result = teilResults?.find((r) => r.number === n);
                  const cell = q ? bubblesFor(q, value) : null;
                  return (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      <span className="w-6 text-right font-bold tabular-nums">{n}</span>
                      {!cell ? (
                        <span className="text-slate-300">– noch nicht bearbeitet –</span>
                      ) : cell.bubbles ? (
                        <span className="flex flex-wrap gap-1">
                          {cell.bubbles.map((b) => {
                            const filled = b === cell.filled;
                            return (
                              <span
                                key={b}
                                className={`min-w-[22px] h-[22px] px-1 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                                  filled
                                    ? result
                                      ? result.isCorrect
                                        ? 'bg-emerald-600 border-emerald-700 text-white'
                                        : 'bg-rose-600 border-rose-700 text-white'
                                      : 'bg-slate-900 border-slate-900 text-white'
                                    : 'border-slate-400 text-slate-500'
                                }`}
                              >
                                {b}
                              </span>
                            );
                          })}
                        </span>
                      ) : (
                        <span className={`flex-1 border-b border-slate-400 px-1 ${result ? (result.isCorrect ? 'text-emerald-700' : 'text-rose-700') : ''}`}>
                          {cell.written || ' '}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
