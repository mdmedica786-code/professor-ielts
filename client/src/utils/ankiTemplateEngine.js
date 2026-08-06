/**
 * ankiTemplateEngine.js
 *
 * Full Anki template renderer — handles everything the official Anki
 * clients support in card templates:
 *
 *   {{Field}}                  — basic field substitution
 *   {{#Field}} ... {{/Field}}  — show if field non-empty
 *   {{^Field}} ... {{/Field}}  — show if field empty
 *   {{FrontSide}}              — embed the rendered front into the back
 *   {{type:Field}}             — typing-answer input (converted to <input>)
 *   {{cloze:Field}}            — cloze deletion (handled via cloze regex in field value)
 *   [sound:filename]           — convert to <audio> element
 *   <img src="filename">       — resolve to blob URL
 *   <hr id=answer>             — on front: truncate here; on back: shown as divider
 */

import { getMediaUrl } from './deckStorage';

/**
 * Render an Anki card template.
 *
 * @param {object}  card        — card object with .flds, .mid, .ord
 * @param {object}  model       — note type with .flds[], .tmpls[], .css, .type
 * @param {'front'|'back'} side
 * @param {string}  [typedAnswer] — user's typed answer (for back side comparison)
 * @returns {Promise<{ html: string, css: string, typeField: string|null }>}
 *   html      — rendered HTML to inject into the card
 *   css       — the model's CSS string (inject into a <style> tag)
 *   typeField — name of the {{type:Field}} field if present, else null
 */
export async function renderTemplate(card, model, side, typedAnswer = '') {
  if (!card || !model) return { html: '', css: '', typeField: null };

  // Select the template by card's ord (template index)
  const template = model.tmpls[card.ord] || model.tmpls[0];
  if (!template) return { html: '', css: '', typeField: null };

  // Build field map: { fieldName: fieldValue }
  const rawFields = card.flds.split('\x1f');
  const fieldMap = {};
  model.flds.forEach((f, i) => {
    fieldMap[f.name] = rawFields[i] ?? '';
  });

  // Detect {{type:Field}} — we need special handling
  let typeField = null;
  const typeMatch = (template.qfmt + template.afmt).match(/\{\{\s*type:([^}]+)\s*\}\}/);
  if (typeMatch) typeField = typeMatch[1].trim();

  // Choose raw template text
  let rawFmt = side === 'front' ? template.qfmt : template.afmt;

  // Handle {{FrontSide}} on back — recursively render the front and inject it
  if (side === 'back' && rawFmt.includes('{{FrontSide}}')) {
    const { html: frontHtml } = await renderTemplate(card, model, 'front', '');
    rawFmt = rawFmt.replace(/\{\{\s*FrontSide\s*\}\}/g, frontHtml);
  }

  let output = rawFmt;

  // ── 1. Conditional blocks (must run before field substitution) ─────────
  // {{#Field}} ... {{/Field}}  — show block only when field has content
  output = output.replace(
    /\{\{\s*#([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/\1\s*\}\}/g,
    (_, field, content) => (fieldMap[field.trim()] ? content : '')
  );
  // {{^Field}} ... {{/Field}}  — show block only when field is EMPTY
  output = output.replace(
    /\{\{\s*\^([^}]+)\s*\}\}([\s\S]*?)\{\{\s*\/\1\s*\}\}/g,
    (_, field, content) => (!fieldMap[field.trim()] ? content : '')
  );

  // ── 2. {{type:Field}} handling ─────────────────────────────────────────
  if (side === 'front') {
    // Replace with a styled text input
    output = output.replace(
      /\{\{\s*type:([^}]+)\s*\}\}/g,
      (_, field) =>
        `<input type="text" id="anki-type-answer" data-field="${field.trim()}"
          class="anki-type-input" autocomplete="off" autocorrect="off"
          autocapitalize="off" spellcheck="false" placeholder="Type answer…" />`
    );
  } else {
    // On back: show the comparison widget
    const correct = fieldMap[typeField] ?? '';
    output = output.replace(
      /\{\{\s*type:([^}]+)\s*\}\}/g,
      () => buildTypeAnswerComparison(typedAnswer, correct)
    );
  }

  // ── 3. Cloze note type (model.type === 1) ─────────────────────────────
  if (model.type === 1) {
    const clozeOrd = (card.ord ?? 0) + 1; // Anki cloze ord is 1-based
    output = output.replace(/\{\{cloze:(\w+)\}\}/g, (_, field) => {
      const val = fieldMap[field] ?? '';
      return renderCloze(val, clozeOrd, side);
    });
  }

  // ── 4. Basic field substitution ────────────────────────────────────────
  for (const [name, value] of Object.entries(fieldMap)) {
    output = output.replace(new RegExp(`\\{\\{\\s*${escapeRegex(name)}\\s*\\}\\}`, 'g'), value);
  }

  // ── 5. Strip leftover unresolved {{tokens}} ────────────────────────────
  output = output.replace(/\{\{[^}]+\}\}/g, '');

  // ── 6. <hr id=answer> handling ────────────────────────────────────────
  // On front: hide everything after the hr (shouldn't be there, but guard)
  // On back: replace with a styled divider
  if (side === 'front') {
    const hrIdx = output.search(/<hr[^>]*id\s*=\s*["']?answer["']?[^>]*>/i);
    if (hrIdx !== -1) output = output.slice(0, hrIdx);
  } else {
    output = output.replace(
      /<hr[^>]*id\s*=\s*["']?answer["']?[^>]*>/gi,
      '<div class="anki-answer-divider"><span>Answer</span></div>'
    );
  }

  // ── 7. [sound:filename] → <audio> ─────────────────────────────────────
  const soundMatches = [...output.matchAll(/\[sound:([^\]]+)\]/g)];
  for (const m of soundMatches) {
    const url = await getMediaUrl(m[1]);
    const autoplay = side === 'front' ? 'autoplay' : '';
    const audioHtml = url
      ? `<div class="anki-audio-wrap">
           <audio controls src="${url}" class="anki-audio" ${autoplay}></audio>
         </div>`
      : '';
    output = output.replace(m[0], audioHtml);
  }

  // ── 8. <img src="filename"> → blob URL ───────────────────────────────
  const imgMatches = [...output.matchAll(/<img([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi)];
  for (const m of imgMatches) {
    const filename = m[2];
    // Skip if already a data: / blob: / http URL
    if (/^(data:|blob:|https?:)/.test(filename)) continue;
    const url = await getMediaUrl(filename);
    if (url) {
      output = output.replace(m[0], `<img${m[1]}src="${url}"${m[3]}>`);
    }
  }

  return { html: output, css: model.css || '', typeField };
}

// ── Cloze renderer ──────────────────────────────────────────────────────────

/**
 * Render cloze deletions in a field value.
 * Anki cloze format: {{c1::text}} or {{c1::text::hint}}
 * On front for clozeOrd=1: {{c1::text}} → [...] (or hint if present)
 * On front for other ords: {{c2::text}} → text (revealed)
 * On back: all clozes revealed, active cloze highlighted
 */
function renderCloze(fieldValue, clozeOrd, side) {
  return fieldValue.replace(/\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g, (_, num, text, hint) => {
    const n = parseInt(num, 10);
    if (side === 'front') {
      if (n === clozeOrd) {
        const display = hint ? `[${hint}]` : '[...]';
        return `<span class="cloze">${display}</span>`;
      }
      return text; // other clozes shown normally
    } else {
      // Back: active cloze highlighted, others normal
      if (n === clozeOrd) {
        return `<span class="cloze cloze-revealed">${text}</span>`;
      }
      return text;
    }
  });
}

// ── Type-answer comparison widget ───────────────────────────────────────────

function buildTypeAnswerComparison(typed, correct) {
  const t = (typed || '').trim();
  const c = (correct || '').trim();

  if (!c) return '';

  const isCorrect = t.toLowerCase() === c.toLowerCase();

  if (!t) {
    return `<div class="anki-type-result anki-type-missing">
      <div class="anki-type-label">You didn't answer</div>
      <div class="anki-type-correct">${escapeHtml(c)}</div>
    </div>`;
  }

  if (isCorrect) {
    return `<div class="anki-type-result anki-type-ok">
      <div class="anki-type-label">✓ Correct</div>
      <div class="anki-type-answer">${escapeHtml(t)}</div>
    </div>`;
  }

  // Diff the two strings character-by-character
  return `<div class="anki-type-result anki-type-wrong">
    <div class="anki-type-label">✗ Incorrect</div>
    <div class="anki-type-your">${charDiff(t, c)}</div>
    <div class="anki-type-correct">${escapeHtml(c)}</div>
  </div>`;
}

/** Simple character-level diff: highlight wrong chars in the typed answer. */
function charDiff(typed, correct) {
  let out = '';
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === correct[i]) {
      out += `<span class="diff-ok">${escapeHtml(typed[i])}</span>`;
    } else {
      out += `<span class="diff-wrong">${escapeHtml(typed[i])}</span>`;
    }
  }
  return out;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
