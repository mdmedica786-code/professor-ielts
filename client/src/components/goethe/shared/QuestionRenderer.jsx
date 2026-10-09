import { CheckCircle2, XCircle, Flag } from 'lucide-react';
import { OPTION_TRANSLATIONS_EN } from '../../../data/goethe/goetheInstructionsEn';

const LETTERS = ['a', 'b', 'c', 'd'];

function ResultNote({ result }) {
  if (!result) return null;
  return (
    <div className="mt-3 pt-2.5 border-t border-slate-200 text-xs text-slate-700 space-y-0.5">
      <p className="font-bold text-slate-900">
        Lösung: <span className="text-emerald-700">{result.correctAnswer}</span>
        {!result.isCorrect && result.userAnswer ? (
          <span className="text-rose-700 font-semibold"> · Ihre Antwort: {String(result.userAnswer)}</span>
        ) : null}
      </p>
      {result.explanation && <p className="text-slate-600 leading-relaxed">{result.explanation}</p>}
    </div>
  );
}

function ChoiceChips({ options, value, onChange, disabled, showEn }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`min-w-[88px] px-3 py-2 rounded-xl border text-sm font-bold transition-all disabled:cursor-default ${
              selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
            }`}
          >
            <span className="block">{opt}</span>
            {showEn && OPTION_TRANSLATIONS_EN[opt] && (
              <span className={`block text-[10px] font-semibold ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                {OPTION_TRANSLATIONS_EN[opt]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function McqOptions({ question, value, onChange, disabled }) {
  return (
    <div className="space-y-1.5" role="radiogroup">
      {question.options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt)}
            className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-sm transition-all disabled:cursor-default ${
              selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
            }`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-extrabold ${
                selected ? 'border-white bg-white text-slate-900' : 'border-slate-400 text-slate-600'
              }`}
            >
              {LETTERS[i]}
            </span>
            <span className="pt-0.5 leading-snug">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Dropdown for matching / gap items; labels can carry a short description. */
function SelectAnswer({ question, value, onChange, disabled, describe }) {
  return (
    <select
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Lösung für Aufgabe ${question.number}`}
      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 disabled:bg-slate-50"
    >
      <option value="">– bitte wählen –</option>
      {question.options.map((opt) => (
        <option key={opt} value={opt}>
          {describe ? describe(opt) : opt}
        </option>
      ))}
    </select>
  );
}

/**
 * Renders one exam item according to its type (from the server format):
 * richtig_falsch, ja_nein, rfn, mcq3, mcq4, zuordnung, lueckentext_woerter,
 * lueckentext_saetze, wer_sagt_was (single fallback), kurzantwort.
 */
export default function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
  result = null,
  isLearn = false,
  optionBank = null,
  sentences = null,
  flagged = false,
  onToggleFlag,
}) {
  const type = question.type;
  let body;

  switch (type) {
    case 'richtig_falsch':
    case 'ja_nein':
    case 'rfn':
    case 'wer_sagt_was':
      body = <ChoiceChips options={question.options} value={value} onChange={onChange} disabled={disabled} showEn={isLearn} />;
      break;
    case 'mcq3':
    case 'mcq4':
      body = <McqOptions question={question} value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'zuordnung': {
      const bank = optionBank ? Object.fromEntries(optionBank.map((o) => [o.label, o.text])) : null;
      body = (
        <SelectAnswer
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
          describe={(opt) =>
            bank?.[opt] ? `${opt} – ${bank[opt]}` : opt === '0' || opt === 'X' ? `${opt} – keine passende Anzeige` : `Anzeige / Text ${opt}`
          }
        />
      );
      break;
    }
    case 'lueckentext_woerter':
      body = <SelectAnswer question={question} value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'lueckentext_saetze': {
      const byLabel = sentences ? Object.fromEntries(sentences.map((s) => [s.label, s.text])) : {};
      body = (
        <SelectAnswer
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
          describe={(opt) => (byLabel[opt] ? `${opt}) ${byLabel[opt].slice(0, 70)}${byLabel[opt].length > 70 ? '…' : ''}` : opt)}
        />
      );
      break;
    }
    case 'kurzantwort':
      body = (
        <input
          type="text"
          value={value || ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Antwort in Stichworten"
          aria-label={`Antwort auf Frage ${question.number}`}
          className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 disabled:bg-slate-50"
        />
      );
      break;
    default:
      body = <McqOptions question={question} value={value} onChange={onChange} disabled={disabled} />;
  }

  const isGap = type === 'lueckentext_woerter' || type === 'lueckentext_saetze';

  return (
    <div
      id={`goethe-q-${question.number}`}
      className={`scroll-mt-24 p-4 rounded-2xl border transition-colors ${
        result ? (result.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300') : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start gap-2 mb-2.5">
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-extrabold flex items-center justify-center tabular-nums">
          {question.number}
        </span>
        <p className="flex-1 text-sm font-semibold text-slate-900 leading-snug pt-1">
          {isGap ? `Lücke ${question.number}` : question.prompt}
        </p>
        {result ? (
          result.isCorrect ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-label="richtig" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" aria-label="falsch" />
          )
        ) : (
          onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              title={flagged ? 'Markierung entfernen' : 'Frage merken'}
              aria-pressed={flagged}
              className={`p-1.5 rounded-lg border ${flagged ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-transparent text-slate-300 hover:text-slate-500'}`}
            >
              <Flag className={`w-3.5 h-3.5 ${flagged ? 'fill-amber-400' : ''}`} />
            </button>
          )
        )}
      </div>
      {body}
      <ResultNote result={result} />
    </div>
  );
}

/**
 * "Wer sagt was?" (B1 Hören Teil 4): statements as rows, speakers as columns.
 */
export function WerSagtWasMatrix({ questions, answers, onChange, disabled = false, results = null }) {
  const speakers = questions[0]?.options || [];
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-100 text-slate-700">
            <th className="text-left p-3 font-bold">Aussage</th>
            {speakers.map((s) => (
              <th key={s} className="p-3 font-bold text-center min-w-[96px]">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => {
            const result = results?.find((r) => r.number === q.number);
            return (
              <tr
                key={q.number}
                id={`goethe-q-${q.number}`}
                className={`border-t border-slate-200 scroll-mt-24 ${result ? (result.isCorrect ? 'bg-emerald-50' : 'bg-rose-50') : ''}`}
              >
                <td className="p-3 align-top">
                  <span className="font-extrabold tabular-nums mr-2">{q.number}</span>
                  <span className="text-slate-800">{q.prompt}</span>
                  {result && !result.isCorrect && (
                    <span className="block text-xs text-emerald-700 font-bold mt-1">Lösung: {result.correctAnswer}</span>
                  )}
                </td>
                {speakers.map((s) => (
                  <td key={s} className="p-3 text-center">
                    <input
                      type="radio"
                      name={`wsw-${q.number}`}
                      checked={answers[q.number] === s}
                      disabled={disabled}
                      onChange={() => onChange(q.number, s)}
                      aria-label={`Aussage ${q.number}: ${s}`}
                      className="w-5 h-5 accent-slate-900"
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
