import { useState } from 'react';
import { ChevronLeft, ChevronRight, Presentation, CalendarDays, StickyNote } from 'lucide-react';

/**
 * The candidate's Aufgabenblatt for one Sprechen Teil (never shows the
 * partner-only fields). With `notes` + `onNotesChange` it doubles as the
 * Notizblock of the Vorbereitungsraum; slides get one note field each.
 */
export default function SpeakingTaskSheet({ sheet, partnerName, notes = {}, onNotesChange, readOnly = false }) {
  if (!sheet) return null;
  const setNote = (key, value) => onNotesChange?.({ ...notes, [key]: value });
  const noteField = (key, rows = 3, placeholder = 'Notizen …') =>
    onNotesChange && !readOnly ? (
      <textarea
        value={notes[key] || ''}
        onChange={(e) => setNote(key, e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 text-sm text-slate-800 font-[cursive,sans-serif]"
      />
    ) : notes[key] ? (
      <p className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700 whitespace-pre-wrap">{notes[key]}</p>
    ) : null;

  return (
    <div className="rounded-2xl border border-slate-300 bg-[#fffef9] p-5 flex flex-col gap-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
        Aufgabenblatt · Teil {sheet.teil} · {sheet.title}
      </p>

      {sheet.situation && <p className="text-[15px] text-slate-900 leading-relaxed">{sheet.situation}</p>}
      {sheet.question && <p className="text-lg font-extrabold text-slate-900 leading-snug">{sheet.question}</p>}

      {sheet.cards?.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {sheet.cards.map((c) => (
            <div key={c} className="aspect-[3/2] rounded-xl border-2 border-slate-800 bg-white flex flex-col items-center justify-center shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fragen zur Person</span>
              <span className="text-lg font-extrabold text-slate-900">{c}</span>
            </div>
          ))}
        </div>
      )}

      {sheet.leitpunkte?.length > 0 && (
        <ul className="space-y-2">
          {sheet.leitpunkte.map((lp, i) => (
            <li key={lp} className="flex flex-col gap-1">
              <span className="flex gap-2 text-sm font-bold text-slate-900">
                <span className="text-emerald-600">▸</span>
                {lp}
              </span>
              {noteField(`lp-${i}`, 2)}
            </li>
          ))}
        </ul>
      )}

      {sheet.slides?.length > 0 && (
        <ol className="space-y-3">
          {sheet.slides.map((sl, i) => (
            <li key={sl.title} className="grid gap-2 md:grid-cols-2 rounded-xl border border-slate-200 bg-white p-3">
              <div>
                <p className="text-xs font-extrabold text-emerald-700">Folie {i + 1}</p>
                <p className="text-sm font-bold text-slate-900">{sl.title}</p>
                <p className="text-xs text-slate-600 mt-0.5">{sl.prompt}</p>
              </div>
              {noteField(`slide-${i}`, 3, 'Meine Notizen und Ideen …')}
            </li>
          ))}
        </ol>
      )}

      {sheet.calendar?.candidate?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <p className="px-3 py-2 bg-slate-100 text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> Ihr Terminkalender
          </p>
          <table className="w-full text-sm">
            <tbody>
              {sheet.calendar.candidate.map((e) => (
                <tr key={e.time} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 font-mono font-bold text-slate-600 w-20">{e.time}</td>
                  <td className="px-3 py-1.5 text-slate-800">{e.entry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheet.partnerTopic && (
        <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl p-3">
          <span className="font-bold">Präsentation von {partnerName}:</span> {sheet.partnerTopic}
        </p>
      )}

      {onNotesChange && !readOnly && !sheet.slides?.length && (
        <div>
          <p className="text-xs font-extrabold text-amber-800 flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3.5 h-3.5" /> Notizblock
          </p>
          {noteField('general', 4, 'Stichpunkte, Redemittel, Ideen …')}
        </div>
      )}
      {readOnly && notes.general && noteField('general')}
    </div>
  );
}

/** Slide-by-slide view for the B1 presentation ("Nächste Folie"). */
export function SlideDeck({ slides, notes = {} }) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  if (!slide) return null;
  return (
    <div className="rounded-2xl border-2 border-slate-800 bg-white overflow-hidden">
      <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
        <span className="flex items-center gap-1.5">
          <Presentation className="w-4 h-4" /> Folie {index + 1} / {slides.length}
        </span>
        <span className="flex gap-1">
          {slides.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          ))}
        </span>
      </div>
      <div className="p-5 min-h-[150px]">
        <p className="text-xl font-extrabold text-slate-900">{slide.title}</p>
        <p className="text-sm text-slate-600 mt-1">{slide.prompt}</p>
        {notes[`slide-${index}`] && (
          <p className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700 whitespace-pre-wrap">{notes[`slide-${index}`]}</p>
        )}
      </div>
      <div className="px-4 py-2 border-t border-slate-200 flex justify-between">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 disabled:opacity-30">
          <ChevronLeft className="w-4 h-4" /> Zurück
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm font-bold disabled:opacity-30"
        >
          Nächste Folie <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
