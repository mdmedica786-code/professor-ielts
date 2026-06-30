import React, { useEffect, useState, useRef } from 'react';
import { getMediaUrl } from '../../utils/deckStorage';

export default function AnkiRenderer({ card, model, side = 'front' }) {
  const [html, setHtml] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    async function renderTemplate() {
      if (!card || !model) return;

      // Find the card template based on the card's ord (card type index)
      const template = model.tmpls[card.ord] || model.tmpls[0];
      let format = side === 'front' ? template.qfmt : template.afmt;

      // Extract field values
      const fields = card.flds.split('\x1f');
      const fieldData = {};
      model.flds.forEach((f, idx) => {
        fieldData[f.name] = fields[idx] || '';
      });

      // Replace {{Field}} with actual values
      let output = format;
      for (const [name, value] of Object.entries(fieldData)) {
        // Handle basic replacement {{Field}}
        const regex = new RegExp(`{{\\s*${name}\\s*}}`, 'g');
        output = output.replace(regex, value);

        // Handle Cloze replacements {{c1::Cloze text}}
        if (model.type === 1) { // 1 = Cloze model type
          const clozeRegex = new RegExp(`{{c\\d+::(.*?)(::.*?)?}}`, 'g');
          if (side === 'front') {
            output = output.replace(clozeRegex, '<span class="cloze">[...]</span>');
          } else {
            output = output.replace(clozeRegex, '<span class="cloze">$1</span>');
          }
        }
      }

      // Handle conditional fields {{#Field}}...{{/Field}}
      output = output.replace(/{{\s*#(\w+)\s*}}(.*?){{\s*\/\1\s*}}/gs, (match, field, content) => {
        return fieldData[field] ? content : '';
      });
      output = output.replace(/{{\s*\^(\w+)\s*}}(.*?){{\s*\/\1\s*}}/gs, (match, field, content) => {
        return !fieldData[field] ? content : '';
      });

      // Replace images <img src="xxx.jpg"> with blob URLs
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/g;
      const imgMatches = [...output.matchAll(imgRegex)];
      for (const match of imgMatches) {
        const filename = match[1];
        const url = await getMediaUrl(filename);
        if (url) {
          output = output.replace(match[0], match[0].replace(filename, url));
        }
      }

      // Handle sounds [sound:xxx.mp3] -> create an audio player or just play it
      // For simplicity, we'll convert it to a standard HTML5 audio element
      const soundRegex = /\[sound:(.*?)\]/g;
      const soundMatches = [...output.matchAll(soundRegex)];
      for (const match of soundMatches) {
        const filename = match[1];
        const url = await getMediaUrl(filename);
        if (url) {
          const audioHtml = `<audio controls src="${url}" class="w-full mt-2" ${side === 'front' ? 'autoplay' : ''}></audio>`;
          output = output.replace(match[0], audioHtml);
        } else {
          output = output.replace(match[0], ''); // Remove if media not found
        }
      }

      setHtml(output);
    }

    renderTemplate();
  }, [card, model, side]);

  return (
    <div className="anki-container h-full overflow-y-auto">
      {/* Inject Anki Custom CSS scoped to this component */}
      <style>
        {`
          .anki-content {
            ${model?.css || ''}
            /* Override background for dark/light mode compatibility if needed */
            background-color: transparent !important;
          }
          .anki-content .cloze {
            font-weight: bold;
            color: #3b82f6; /* Tailwind blue-500 */
          }
        `}
      </style>
      <div 
        ref={containerRef}
        className="anki-content p-6 text-center w-full"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
