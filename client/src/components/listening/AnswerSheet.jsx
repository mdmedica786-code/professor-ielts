import { useMemo } from 'react';

/**
 * IELTS-style answer sheet. Questions are grouped by section, then by their
 * `context` (form/notes/table heading) so that a "Booking form" group with 6
 * gaps renders under a single header — same visual structure as the real test.
 */
export default function AnswerSheet({ sections, answers, onAnswer, locked = false }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <SectionBlock
          key={section.number}
          section={section}
          answers={answers}
          onAnswer={onAnswer}
          locked={locked}
        />
      ))}
    </div>
  );
}

function SectionBlock({ section, answers, onAnswer, locked }) {
  // Group consecutive questions sharing the same non-empty `context` string.
  const groups = useMemo(() => groupByContext(section.questions || []), [section.questions]);

  return (
    <div className="card-padded">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            Section {section.number}
          </div>
          <div className="text-sm font-bold text-slate-900">{section.title}</div>
        </div>
        <div className="text-[11px] text-slate-400">
          Questions {section.questions[0]?.number}–{section.questions.at(-1)?.number}
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((g, gi) => (
          <div key={gi} className="space-y-2">
            {g.context && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5">
                {g.context}
              </div>
            )}
            {g.image && (
              <div className="my-4 flex justify-center">
                <img src={g.image} alt="Test Diagram" className="max-w-full rounded-xl border border-slate-200 shadow-sm" />
              </div>
            )}
            {g.questions.map((q) => (
              <QuestionRow
                key={q.id}
                question={q}
                value={answers[q.id] || ''}
                onChange={(v) => onAnswer(q.id, v)}
                locked={locked}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByContext(questions) {
  const groups = [];
  for (const q of questions) {
    const last = groups.at(-1);
    if (last && last.context === (q.context || '')) {
      last.questions.push(q);
      if (q.image && !last.image) last.image = q.image;
    } else {
      groups.push({ context: q.context || '', image: q.image || null, questions: [q] });
    }
  }
  return groups;
}

function QuestionRow({ question, value, onChange, locked }) {
  const number = (
    <span className="font-bold text-slate-900 text-sm mr-2 flex-shrink-0">
      {question.number}.
    </span>
  );

  if (question.type === 'gap') {
    return (
      <div className="flex items-start gap-2 text-sm text-slate-800">
        {number}
        <div className="flex-1 min-w-0">
          <div className="leading-relaxed">{renderGapPrompt(question.prompt, value, onChange, locked)}</div>
          {question.instruction && (
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">
              {question.instruction}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (question.type === 'mcq' || question.type === 'matching' || question.type === 'tfng') {
    return (
      <div className="text-sm text-slate-800">
        <div className="flex items-start">
          {number}
          <div className="flex-1 leading-relaxed">{question.prompt}</div>
        </div>
        {question.instruction && (
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1.5 ml-6">
            {question.instruction}
          </div>
        )}
        <div className="ml-6 mt-1.5 grid gap-1">
          {(question.options || []).map((opt) => {
            const checked = value === opt;
            return (
              <label
                key={opt}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer text-xs transition-all ${
                  checked
                    ? 'border-brand-400 bg-brand-50/60 text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                } ${locked ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={checked}
                  onChange={() => !locked && onChange(opt)}
                  className="accent-brand-500"
                  disabled={locked}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Unknown — render as a plain text input fallback.
  return (
    <div className="flex items-start gap-2 text-sm text-slate-800">
      {number}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        className="flex-1 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
      />
    </div>
  );
}

/**
 * Replace the first run of underscores in the prompt with an inline input.
 * The generator is asked to use "______" but we accept any ≥3 underscores.
 */
function renderGapPrompt(prompt, value, onChange, locked) {
  const parts = (prompt || '').split(/_{3,}/);
  if (parts.length < 2) {
    // No blank placeholder — fall back to prompt + a separate input row.
    return (
      <div className="space-y-1.5">
        <div>{prompt}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          className="w-full px-2 py-1 text-sm rounded-lg border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
        />
      </div>
    );
  }
  return (
    <span>
      {parts[0]}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        className="inline-block mx-1 px-2 py-0.5 min-w-[7rem] text-sm rounded-md border-b-2 border-slate-300 bg-amber-50/40 focus:border-brand-500 focus:bg-white outline-none align-baseline"
      />
      {parts.slice(1).join('')}
    </span>
  );
}
