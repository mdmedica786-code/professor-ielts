import { useState } from 'react';
import { Languages, Lightbulb } from 'lucide-react';
import { useExamMode } from './useExamMode';
import { getInstructionTranslation } from '../../../data/goethe/goetheInstructionsEn';

/**
 * Official German instruction for a Teil. In Lernmodus a toggle reveals the
 * English translation plus an exam tip; in Prüfungsmodus only German is shown.
 */
export default function BilingualInstructionBanner({ level, module, teil, title, instruction, from, to, className = '' }) {
  const { isLearn } = useExamMode();
  const [showEn, setShowEn] = useState(false);
  const translation = isLearn ? getInstructionTranslation(level, module, teil, { from, to }) : null;

  return (
    <div className={`rounded-2xl border border-slate-300 bg-white ${className}`}>
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-2xl flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
          {module === 'schreiben' ? 'Aufgabe' : 'Teil'} {teil}
          {title ? <span className="font-semibold normal-case tracking-normal text-slate-500"> · {title}</span> : null}
        </span>
        {translation && (
          <button
            type="button"
            onClick={() => setShowEn((v) => !v)}
            aria-expanded={showEn}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{showEn ? 'Übersetzung ausblenden' : '🇬🇧 Translate instructions / Anweisungen übersetzen'}</span>
          </button>
        )}
      </div>
      <p className="px-4 py-3 text-sm font-semibold text-slate-900 leading-relaxed">{instruction}</p>
      {translation && showEn && (
        <div className="px-4 pb-4 space-y-2 animate-float-in">
          <p className="text-sm text-sky-900 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2 leading-relaxed">
            <span className="font-bold">EN: </span>
            {translation.en}
          </p>
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed flex gap-2">
            <Lightbulb className="w-4 h-4 flex-shrink-0 text-amber-500" />
            <span>
              <span className="font-bold">Exam tip: </span>
              {translation.tip}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
