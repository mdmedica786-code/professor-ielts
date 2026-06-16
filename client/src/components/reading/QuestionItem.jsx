/**
 * One reading question during the attempt (input only — marking is shown in
 * ReadingResult). Renders option buttons for tfng/ynng/mcq/heading and a text
 * box for gap-fill.
 */
const FALLBACK_OPTIONS = {
  tfng: ['TRUE', 'FALSE', 'NOT GIVEN'],
  ynng: ['YES', 'NO', 'NOT GIVEN'],
};

export default function QuestionItem({ question, value, onChange }) {
  const q = question;
  const options = q.options && q.options.length ? q.options : FALLBACK_OPTIONS[q.type] || [];
  const isChoice = options.length > 0;

  return (
    <div className="card-padded">
      <div className="flex gap-3">
        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {q.number}
        </span>
        <div className="flex-1 min-w-0">
          {q.paragraph && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Paragraph {q.paragraph}
            </span>
          )}
          <p className="text-sm text-slate-800 leading-relaxed">{q.prompt}</p>
          {q.instruction && (
            <p className="text-[11px] text-slate-400 mt-0.5 italic">{q.instruction}</p>
          )}

          {isChoice ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {options.map((opt) => {
                const selected = value === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                      selected
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/40'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your answer…"
              className="input-field mt-3"
            />
          )}
        </div>
      </div>
    </div>
  );
}
