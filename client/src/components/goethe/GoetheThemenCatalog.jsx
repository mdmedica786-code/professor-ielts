import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { GOETHE_TOPICS } from '../../data/goethe/goetheTopics';
import {
  BookOpen,
  Search,
  MessageSquare,
  PenLine,
  Mic,
  ArrowRight,
  Sparkles,
  Tag,
  CheckCircle,
} from 'lucide-react';

export default function GoetheThemenCatalog() {
  const { setSection } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState(GOETHE_TOPICS[0].id);

  const filteredTopics = GOETHE_TOPICS.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.title.toLowerCase().includes(term) ||
      t.subtitle.toLowerCase().includes(term) ||
      t.nouns.some((n) => n.word.toLowerCase().includes(term) || n.meaning.toLowerCase().includes(term))
    );
  });

  const activeTopic = GOETHE_TOPICS.find((t) => t.id === selectedTopicId) || GOETHE_TOPICS[0];

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-xs font-bold mb-1.5 border border-purple-200">
          <span>🇩🇪 Goethe-Zertifikat B1 Wortschatz</span>
          <span>·</span>
          <span>Themenkatalog C1–C15 (ca. 450 Kernwörter)</span>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
          Die 15 offiziellen B1-Prüfungsthemen
        </h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Alle 15 Prüfungsfelder mit B1-Nomen (inkl. Genitiv &amp; Plural), Verben mit Präpositionen, typischen Sprechimpulsen und Schreibaufgaben.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Thema oder Vokabel suchen (z.B. Wohnen, Miete, Umwelt, Gesundheit)..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm text-slate-800 outline-none focus:border-purple-500 bg-white shadow-xs"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Topic List (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-2 max-h-[75vh] overflow-y-auto pr-1">
          {filteredTopics.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTopicId(t.id)}
              className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                selectedTopicId === t.id
                  ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-bold shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 bg-white text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {t.code}
                  </span>
                  <span className="text-xs md:text-sm">{t.title}</span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                  {t.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Right Column: Detailed Topic Sheet (8 Cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col gap-6">
          {/* Topic Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">
                {activeTopic.code} · Prüfungsmodul
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-0.5">
                {activeTopic.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeTopic.subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSection('schreiben')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <PenLine className="w-3.5 h-3.5 text-sky-600" />
                <span>Schreiben</span>
              </button>
              <button
                onClick={() => setSection('sprechen')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5"
              >
                <Mic className="w-3.5 h-3.5 text-rose-600" />
                <span>Sprechen</span>
              </button>
            </div>
          </div>

          {/* Exam Contexts */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong className="text-slate-900">Typische Prüfungssituationen: </strong>
            {activeTopic.examSituations}
          </div>

          {/* Core Nouns Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              <span>Kernsubstantive (Nomen mit Artikel &amp; Plural)</span>
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeTopic.nouns.map((n, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 font-sans">{n.word}</span>
                    <span className="text-slate-400 ml-1">, {n.plural}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 italic">{n.meaning}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Verbs & Adjectives */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Wichtige Verben (mit Kasus / Präposition)
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-800">
                {activeTopic.verbs.map((v, i) => (
                  <li key={i} className="p-1.5 rounded bg-slate-50 border border-slate-100 font-mono text-[11px]">
                    {v}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Passende Adjektive
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {activeTopic.adjectives.map((adj, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md bg-purple-50 text-purple-900 text-xs font-semibold border border-purple-100"
                  >
                    {adj}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Official Discussion & Writing Prompts for this topic */}
          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                <span>Typische Sprechthemen &amp; Diskussionsfragen:</span>
              </h4>
              <ul className="space-y-1 text-slate-700 pl-4 list-disc">
                {activeTopic.speakingPrompts.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5 text-purple-600" />
                <span>Typische Schreibanlässe im Examen:</span>
              </h4>
              <ul className="space-y-1 text-slate-700 pl-4 list-disc">
                {activeTopic.writingPrompts.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
