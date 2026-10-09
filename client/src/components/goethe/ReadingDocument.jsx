import { Mail, Newspaper, Megaphone, ScrollText, MessageCircle, MapPin } from 'lucide-react';
import { HighlightableText } from './shared/TextHighlighter';

/** Picks an authentic layout for the Lesetext from the Teil's format. */
function documentStyle(part) {
  const t = (part.title || '').toLowerCase();
  if (part.textKind === 'gap_words' || part.textKind === 'gap_sentences') return 'gap';
  if (part.textKind === 'multi') {
    if (part.qType === 'zuordnung' && /anzeige/.test(t)) return 'ads';
    if (/kommentar|meinung/.test(t)) return 'comments';
    if (/leserbrief/.test(t)) return 'letters';
    return 'articles';
  }
  if (/e-mail/.test(t)) return 'email';
  if (/tafel|wegweiser/.test(t)) return 'board';
  if (/ordnung|regeln/.test(t)) return 'rules';
  if (/blog/.test(t)) return 'blog';
  return 'newspaper';
}

function GapSelect({ question, value, onChange, disabled, result }) {
  if (!question) return null;
  const tone = result ? (result.isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-500 bg-rose-50') : value ? 'border-slate-900 bg-slate-50' : 'border-amber-400 bg-amber-50';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[10px] font-extrabold text-white bg-slate-900 rounded px-1 tabular-nums">{question.number}</span>
      <select
        value={value || ''}
        disabled={disabled}
        onChange={(e) => onChange(question.number, e.target.value)}
        aria-label={`Lücke ${question.number}`}
        className={`max-w-[11rem] text-sm font-sans font-semibold rounded-md border-2 px-1 py-0.5 ${tone}`}
      >
        <option value="">……</option>
        {question.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * The left-hand "paper" of the reading exam. Supports highlighter marks and
 * inline gap selects for Lückentexte.
 */
export default function ReadingDocument({ part, test, answers, onAnswer, disabled, results, highlights, onHighlightsChange, tool }) {
  const style = documentStyle(part);
  const passage = test.passage || {};
  const hl = { highlights, onHighlightsChange, tool };
  const qByNumber = Object.fromEntries((test.questions || []).map((q) => [q.number, q]));
  const resultByNumber = Object.fromEntries((results?.breakdown || []).map((r) => [r.number, r]));

  const renderGap = (n) => (
    <GapSelect question={qByNumber[n]} value={answers[n]} onChange={onAnswer} disabled={disabled} result={resultByNumber[n]} />
  );

  const texts = passage.texts?.length ? passage.texts : null;

  if (style === 'ads' && texts) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {texts.map((t) => (
          <article key={t.label} className="relative rounded-xl border-2 border-slate-800 bg-white p-4 shadow-sm">
            <span className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-900 text-white font-extrabold flex items-center justify-center">
              {t.label}
            </span>
            {t.title && <h4 className="font-extrabold text-slate-900 mb-1 pl-3 uppercase text-sm tracking-wide">{t.title}</h4>}
            <div className="text-sm text-slate-800 leading-relaxed space-y-2">
              <HighlightableText id={`ad-${t.label}`} text={t.text} {...hl} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if ((style === 'comments' || style === 'letters' || style === 'articles') && texts) {
    return (
      <div className="space-y-4">
        {passage.title && style !== 'articles' && <h3 className="font-serif text-xl font-bold text-slate-900">{passage.title}</h3>}
        {texts.map((t) => (
          <article
            key={t.label}
            className={`rounded-xl border bg-white p-5 ${style === 'comments' ? 'border-slate-200 border-l-4 border-l-sky-500' : 'border-slate-300'}`}
          >
            <header className="flex items-center gap-2 mb-2">
              {style === 'comments' ? <MessageCircle className="w-4 h-4 text-sky-600" /> : style === 'letters' ? <Mail className="w-4 h-4 text-slate-500" /> : <Newspaper className="w-4 h-4 text-slate-500" />}
              <span className="font-extrabold text-slate-900 text-sm">{t.label}</span>
              {t.title && <span className="text-sm font-serif font-bold text-slate-700">· {t.title}</span>}
            </header>
            <div className={`text-[15px] text-slate-800 leading-relaxed space-y-3 ${style === 'articles' ? 'font-serif' : ''}`}>
              <HighlightableText id={`txt-${t.label}`} text={t.text} {...hl} />
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (style === 'email') {
    return (
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
        <div className="bg-slate-100 border-b border-slate-300 px-4 py-2.5 text-xs text-slate-600 space-y-0.5">
          <p className="flex items-center gap-2 font-bold text-slate-800">
            <Mail className="w-4 h-4" /> Posteingang
          </p>
          <p>
            <span className="font-semibold">Betreff:</span> {passage.title}
          </p>
        </div>
        <div className="p-5 text-[15px] text-slate-800 leading-relaxed space-y-3">
          <HighlightableText id="email" text={passage.text} {...hl} />
        </div>
      </div>
    );
  }

  if (style === 'board') {
    return (
      <div className="rounded-xl bg-slate-800 p-5 text-slate-50 shadow-inner">
        <h3 className="flex items-center gap-2 font-extrabold uppercase tracking-widest text-amber-300 mb-3">
          <MapPin className="w-4 h-4" /> {passage.title}
        </h3>
        <div className="font-mono text-sm leading-relaxed space-y-2">
          <HighlightableText id="board" text={passage.text} {...hl} paragraphClassName="border-b border-slate-600 pb-2" />
        </div>
      </div>
    );
  }

  if (style === 'rules') {
    return (
      <div className="rounded-xl border border-slate-300 bg-[#fffef9] p-6">
        <h3 className="flex items-center gap-2 font-extrabold text-slate-900 text-lg mb-3 border-b-2 border-slate-800 pb-2">
          <ScrollText className="w-5 h-5" /> {passage.title}
        </h3>
        <div className="text-[15px] text-slate-800 leading-relaxed space-y-3">
          <HighlightableText id="rules" text={passage.text} {...hl} />
        </div>
      </div>
    );
  }

  if (style === 'gap') {
    return (
      <div className="space-y-4">
        <article className="rounded-xl border border-slate-300 bg-white p-6">
          <h3 className="font-serif text-xl font-bold text-slate-900 mb-1">{passage.title}</h3>
          {passage.source && <p className="text-xs italic text-slate-500 mb-3">{passage.source}</p>}
          <div className="font-serif text-[15px] text-slate-800 leading-loose space-y-3">
            <HighlightableText id="gap" text={passage.text} renderGap={renderGap} {...hl} />
          </div>
        </article>
        {test.wordBank?.length > 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Wortliste</p>
            <div className="flex flex-wrap gap-2">
              {test.wordBank.map((w) => {
                const used = Object.values(answers).includes(w);
                return (
                  <span key={w} className={`px-2.5 py-1 rounded-lg border text-sm font-semibold ${used ? 'bg-slate-200 text-slate-400 line-through border-slate-200' : 'bg-white text-slate-800 border-slate-300'}`}>
                    {w}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {test.sentences?.length > 0 && (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Sätze</p>
            {test.sentences.map((s) => {
              const used = Object.values(answers).includes(s.label);
              return (
                <p key={s.label} className={`text-sm flex gap-2 ${used ? 'text-slate-400' : 'text-slate-800'}`}>
                  <span className="font-extrabold w-5">{s.label}</span>
                  <span>{s.text}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // newspaper (default) and blog
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6">
      <header className={`mb-3 pb-3 ${style === 'newspaper' ? 'border-b-4 border-double border-slate-800' : 'border-b border-slate-200'}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">
          {style === 'blog' ? <Megaphone className="w-3.5 h-3.5" /> : <Newspaper className="w-3.5 h-3.5" />}
          {passage.source || (style === 'blog' ? 'Blog' : 'Zeitung')}
        </p>
        <h3 className="font-serif text-2xl font-bold text-slate-900 leading-tight">{passage.title}</h3>
      </header>
      <div className={`text-[15px] text-slate-800 leading-relaxed space-y-3 ${style === 'newspaper' ? 'font-serif md:columns-2 md:gap-6' : ''}`}>
        <HighlightableText id="main" text={passage.text} {...hl} paragraphClassName="break-inside-avoid" />
      </div>
    </article>
  );
}
