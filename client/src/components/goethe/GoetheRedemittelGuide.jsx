import { useState } from 'react';
import { REDEMITTEL_CATEGORIES } from '../../data/goethe/goetheRedemittel';
import {
  Sparkles,
  Volume2,
  Copy,
  Check,
  Search,
  BookOpen,
  Layers,
  ArrowRight,
} from 'lucide-react';

const GRAMMAR_RULES = [
  {
    title: 'D1. Nebensatz-Wortstellung (weil, dass, obwohl, wenn)',
    rule: 'Im Nebensatz steht das konjugierte Verb IMMER an allerletzter Stelle!',
    example: '„Ich lerne Deutsch, weil ich in Deutschland als Arzt arbeiten möchte.“',
  },
  {
    title: 'D2. Konnektoren mit Inversion (deshalb, trotzdem, sonst, danach)',
    rule: 'Diese Konnektoren besetzen Position 1. Direkt danach folgt das finite Verb auf Position 2!',
    example: '„Es hat geregnet, trotzdem sind wir im Park spazieren gegangen.“',
  },
  {
    title: 'D3. Te-Ka-Mo-Lo (Wortstellung im Mittelfeld)',
    rule: 'Temporal (Wann?) → Kausal (Warum?) → Modal (Wie?) → Lokal (Wohin/Wo?)',
    example: '„Ich fahre morgen (Te) wegen der Prüfung (Ka) mit dem Zug (Mo) nach Berlin (Lo).“',
  },
  {
    title: 'D4. Perfekt mit „sein“ vs. „haben“',
    rule: '„sein“ nur bei Ortswechsel (fahren, gehen, fliegen) oder Zustandsänderung (aufwachen, sterben, wachsen)!',
    example: '„Ich bin nach Hause gefahren.“ aber: „Ich habe ein Buch gelesen.“',
  },
  {
    title: 'D5. Konjunktiv II der Höflichkeit',
    rule: 'In formellen E-Mails (Aufgabe 3) und beim Planen (Sprechen 1): könnten, würden, hätten, wären.',
    example: '„Könnten Sie mir bitte einen neuen Termin vorschlagen?“',
  },
];

export default function GoetheRedemittelGuide() {
  const [activeCategory, setActiveCategory] = useState(REDEMITTEL_CATEGORIES[0].id);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [search, setSearch] = useState('');
  const [showGrammar, setShowGrammar] = useState(false);

  const activeGroup = REDEMITTEL_CATEGORIES.find((c) => c.id === activeCategory) || REDEMITTEL_CATEGORIES[0];

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\(\)…]/g, '').trim();
    const utt = new SpeechSynthesisUtterance(cleanText);
    utt.lang = 'de-DE';
    utt.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.startsWith('de'));
    if (deVoice) utt.voice = deVoice;
    window.speechSynthesis.speak(utt);
  };

  const copyPhrase = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold mb-1.5 border border-blue-200">
          <span>🇩🇪 Goethe-Zertifikat B1 Sprachmittel</span>
          <span>·</span>
          <span>Redemittel- &amp; Grammatikhandbuch</span>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
          Offizielle B1-Redemittel &amp; Satzmuster
        </h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Formulierungshilfen für Schreiben &amp; Sprechen: Meinung äußern, 5-Folien-Präsentationsstruktur, formelle Bitten und Satzverbindungen.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowGrammar(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              !showGrammar
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Redemittel-Bibliothek
          </button>
          <button
            onClick={() => setShowGrammar(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              showGrammar
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            B1-Grammatik-Inventar (D1–D5)
          </button>
        </div>
      </div>

      {!showGrammar ? (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Category Tabs (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-1.5">
            {REDEMITTEL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-3 rounded-xl border text-left text-xs md:text-sm font-semibold transition-all flex items-center justify-between ${
                  activeCategory === cat.id
                    ? 'border-blue-500 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50 bg-white text-slate-700'
                }`}
              >
                <span>{cat.category}</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {cat.phrases.length} Phrasen
                </span>
              </button>
            ))}
          </div>

          {/* Phrases List (8 Cols) */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Kategorie
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {activeGroup.category}
              </h2>
            </div>

            <div className="space-y-3">
              {activeGroup.phrases.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs md:text-sm"
                >
                  <div>
                    <div className="font-bold text-slate-900 font-sans leading-relaxed">
                      {item.de}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{item.en}</div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0">
                    <button
                      onClick={() => speakText(item.de)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-colors shadow-2xs"
                      title="Auf Deutsch anhören"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyPhrase(item.de, idx)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
                      title="Kopieren"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Grammar Inventory (D1–D5) */
        <div className="space-y-4">
          {GRAMMAR_RULES.map((g, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <h3 className="font-bold text-slate-900 text-sm md:text-base">{g.title}</h3>
              <p className="text-xs md:text-sm text-slate-700">{g.rule}</p>
              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 font-mono text-xs text-purple-950">
                Beispiel: {g.example}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
