import { Fragment, useRef } from 'react';
import { Highlighter, Eraser, Trash2 } from 'lucide-react';

const HIGHLIGHT_COLORS = {
  yellow: { label: 'Gelb', mark: 'bg-yellow-200', swatch: 'bg-yellow-300' },
  cyan: { label: 'Cyan', mark: 'bg-cyan-200', swatch: 'bg-cyan-300' },
};

const GAP_RE = /\[\[(\d+)\]\]/g;

/** Splits a paragraph into text pieces and gap markers ([[N]]). */
function toPieces(paragraph) {
  const pieces = [];
  let last = 0;
  for (const m of paragraph.matchAll(GAP_RE)) {
    if (m.index > last) pieces.push({ type: 'text', text: paragraph.slice(last, m.index) });
    pieces.push({ type: 'gap', n: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < paragraph.length) pieces.push({ type: 'text', text: paragraph.slice(last) });
  return pieces;
}

/** Adds (or with color 'erase' removes) a highlight range, trimming overlaps. */
function applyHighlight(list, next) {
  const out = [];
  for (const h of list) {
    if (h.end <= next.start || h.start >= next.end) {
      out.push(h);
      continue;
    }
    if (h.start < next.start) out.push({ ...h, end: next.start });
    if (h.end > next.end) out.push({ ...h, start: next.end });
  }
  if (next.color !== 'erase') out.push(next);
  return out.sort((a, b) => a.start - b.start);
}

/** Text length of a range, ignoring elements marked data-nohl (gap selects). */
function textLength(range) {
  const frag = range.cloneContents();
  frag.querySelectorAll('[data-nohl]').forEach((el) => el.remove());
  return frag.textContent.length;
}

function renderTextPiece(text, offset, highlights, keyPrefix) {
  const end = offset + text.length;
  const parts = [];
  let cursor = offset;
  highlights
    .filter((h) => h.end > offset && h.start < end)
    .forEach((h, i) => {
      const s = Math.max(h.start, offset);
      const e = Math.min(h.end, end);
      if (s > cursor) parts.push(<Fragment key={`${keyPrefix}-t${i}`}>{text.slice(cursor - offset, s - offset)}</Fragment>);
      parts.push(
        <mark key={`${keyPrefix}-h${i}`} className={`${HIGHLIGHT_COLORS[h.color]?.mark || 'bg-yellow-200'} text-inherit rounded-sm px-0.5 -mx-0.5`}>
          {text.slice(s - offset, e - offset)}
        </mark>
      );
      cursor = e;
    });
  if (cursor < end) parts.push(<Fragment key={`${keyPrefix}-rest`}>{text.slice(cursor - offset)}</Fragment>);
  return parts;
}

/**
 * Read-only text the candidate can mark with highlighter colours.
 * Paragraphs are split on blank lines; [[N]] markers become gaps rendered
 * via renderGap(n). Highlights are lifted state: { [paragraphKey]: [{start,end,color}] }.
 */
export function HighlightableText({ id, text, highlights = {}, onHighlightsChange, tool = 'yellow', renderGap, paragraphClassName = '' }) {
  const refs = useRef({});
  const paragraphs = String(text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const handleMouseUp = (key) => {
    if (!onHighlightsChange) return;
    const sel = window.getSelection();
    const el = refs.current[key];
    if (!sel || sel.isCollapsed || !el || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) return;

    const before = document.createRange();
    before.selectNodeContents(el);
    before.setEnd(range.startContainer, range.startOffset);
    const start = textLength(before);
    const end = start + textLength(range);
    sel.removeAllRanges();
    if (end <= start) return;

    onHighlightsChange({ ...highlights, [key]: applyHighlight(highlights[key] || [], { start, end, color: tool }) });
  };

  return (
    <>
      {paragraphs.map((para, pIdx) => {
        const key = `${id}:${pIdx}`;
        const list = highlights[key] || [];
        let offset = 0;
        return (
          <p
            key={key}
            ref={(el) => {
              refs.current[key] = el;
            }}
            onMouseUp={() => handleMouseUp(key)}
            onTouchEnd={() => handleMouseUp(key)}
            className={`whitespace-pre-line ${paragraphClassName}`}
          >
            {toPieces(para).map((piece, i) => {
              if (piece.type === 'gap') {
                return (
                  <span key={`${key}-g${i}`} data-nohl="" contentEditable={false} className="inline-block align-baseline mx-0.5">
                    {renderGap ? renderGap(piece.n) : `(${piece.n})`}
                  </span>
                );
              }
              const nodes = renderTextPiece(piece.text, offset, list, `${key}-${i}`);
              offset += piece.text.length;
              return <Fragment key={`${key}-p${i}`}>{nodes}</Fragment>;
            })}
          </p>
        );
      })}
    </>
  );
}

/** Marker colour picker + eraser + clear-all. */
export function HighlighterToolbar({ tool, onToolChange, onClear }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1" aria-label="Textmarker">
      <Highlighter className="w-4 h-4 text-slate-400 mx-1" />
      {Object.entries(HIGHLIGHT_COLORS).map(([key, c]) => (
        <button
          key={key}
          type="button"
          onClick={() => onToolChange(key)}
          aria-pressed={tool === key}
          title={`Textmarker ${c.label}`}
          className={`w-6 h-6 rounded-md ${c.swatch} border-2 ${tool === key ? 'border-slate-900' : 'border-transparent'}`}
        />
      ))}
      <button
        type="button"
        onClick={() => onToolChange('erase')}
        aria-pressed={tool === 'erase'}
        title="Markierung entfernen (Text auswählen)"
        className={`p-1 rounded-md border-2 ${tool === 'erase' ? 'border-slate-900 bg-slate-100' : 'border-transparent'}`}
      >
        <Eraser className="w-4 h-4 text-slate-600" />
      </button>
      {onClear && (
        <button type="button" onClick={onClear} title="Alle Markierungen löschen" className="p-1 rounded-md hover:bg-slate-100">
          <Trash2 className="w-4 h-4 text-slate-400" />
        </button>
      )}
    </div>
  );
}
