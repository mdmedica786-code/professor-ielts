import { useEffect, useState, useRef, useCallback } from 'react';
import { renderTemplate } from '../../utils/ankiTemplateEngine';

/**
 * AnkiRenderer
 *
 * Renders an Anki card (front or back) using the full template engine.
 * Supports:
 *   - Full HTML template rendering (field substitution, conditionals, FrontSide)
 *   - Model CSS injected into a scoped <style> block
 *   - {{type:Field}} — renders as <input> on front, comparison widget on back
 *   - [sound:file] → <audio> with autoplay on front
 *   - <img src="file"> → blob URL
 *   - <hr id=answer> — truncated on front, shown as divider on back
 *   - Cloze notes (model.type === 1)
 *
 * Props:
 *   card          — card object ({ flds, mid, ord, ... })
 *   model         — note type object ({ flds, tmpls, css, type })
 *   side          — 'front' | 'back'
 *   onTypeAnswer  — callback(value: string) called when user submits their typed answer
 *   typedAnswer   — the typed answer string to show on the back
 */
export default function AnkiRenderer({ card, model, side = 'front', onTypeAnswer, typedAnswer = '' }) {
  const [html, setHtml]         = useState('');
  const [css, setCss]           = useState('');
  const [typeField, setTypeField] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  // Render whenever card, model or side changes
  useEffect(() => {
    let cancelled = false;
    async function doRender() {
      const result = await renderTemplate(card, model, side, typedAnswer);
      if (!cancelled) {
        setHtml(result.html);
        setCss(result.css);
        setTypeField(result.typeField);
        setInputVal('');
      }
    }
    doRender();
    return () => { cancelled = true; };
  }, [card, model, side, typedAnswer]);

  // Auto-focus the type-answer input when on front and the field is rendered
  useEffect(() => {
    if (side === 'front' && typeField && containerRef.current) {
      const el = containerRef.current.querySelector('#anki-type-answer');
      if (el) {
        el.focus();
        // Attach change listener to keep inputVal in sync
        const handleInput = (e) => setInputVal(e.target.value);
        el.addEventListener('input', handleInput);
        // Hook Enter key to submit
        const handleKey = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onTypeAnswer?.(el.value);
          }
        };
        el.addEventListener('keydown', handleKey);
        return () => {
          el.removeEventListener('input', handleInput);
          el.removeEventListener('keydown', handleKey);
        };
      }
    }
  }, [html, side, typeField, onTypeAnswer]);

  const handleSubmitType = useCallback(() => {
    const el = containerRef.current?.querySelector('#anki-type-answer');
    const val = el ? el.value : inputVal;
    onTypeAnswer?.(val);
  }, [inputVal, onTypeAnswer]);

  return (
    <div className="anki-container h-full overflow-y-auto flex flex-col">
      {/* Scoped model CSS + our own Anki-compat overrides */}
      <style>{`
        .anki-card-content {
          ${css}
          background-color: transparent !important;
        }
        .anki-card-content .cloze {
          font-weight: bold;
          color: #3b82f6;
        }
        .anki-card-content .cloze-revealed {
          font-weight: bold;
          color: #10b981;
        }
        .anki-answer-divider {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 16px 0;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .anki-answer-divider::before,
        .anki-answer-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }
        .anki-type-input {
          display: block;
          margin: 12px auto;
          width: 80%;
          max-width: 360px;
          padding: 10px 16px;
          font-size: 20px;
          text-align: center;
          border: 2px solid #cbd5e1;
          border-radius: 12px;
          outline: none;
          background: #f8fafc;
          color: #0f172a;
          transition: border-color 0.15s;
        }
        .anki-type-input:focus {
          border-color: #6366f1;
          background: #fff;
        }
        .anki-type-result {
          margin: 12px auto;
          max-width: 360px;
          padding: 12px 16px;
          border-radius: 12px;
          text-align: center;
          font-size: 16px;
        }
        .anki-type-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }
        .anki-type-ok    { background: #dcfce7; color: #15803d; }
        .anki-type-wrong { background: #fee2e2; color: #b91c1c; }
        .anki-type-missing { background: #fef9c3; color: #854d0e; }
        .anki-type-answer,
        .anki-type-your,
        .anki-type-correct {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.02em;
          line-height: 1.3;
        }
        .anki-type-correct {
          margin-top: 4px;
          font-size: 16px;
          opacity: 0.8;
        }
        .diff-ok   { color: inherit; }
        .diff-wrong {
          color: #ef4444;
          text-decoration: underline wavy;
        }
        .anki-audio-wrap {
          display: flex;
          justify-content: center;
          margin: 8px 0;
        }
        .anki-audio {
          width: 100%;
          max-width: 320px;
          height: 36px;
        }
      `}</style>

      {/* Card HTML */}
      <div
        ref={containerRef}
        className="anki-card-content flex-1 p-5 w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Show "Flip to check" button when front has a type-answer field */}
      {side === 'front' && typeField && (
        <div className="flex justify-center pb-4 flex-shrink-0">
          <button
            onClick={handleSubmitType}
            className="px-6 py-2 rounded-xl text-sm font-bold text-white
                       bg-gradient-to-r from-indigo-500 to-violet-600
                       shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                       transition-all active:scale-[0.97]"
          >
            Check answer ↵
          </button>
        </div>
      )}
    </div>
  );
}
