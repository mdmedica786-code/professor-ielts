import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpenText,
  Headphones,
  PenLine,
  Mic,
  BookOpen,
  Sparkles,
  Calendar,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  Award,
  Info,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { calculateGoetheReadingListeningScore } from '../../data/goethe/goetheGradingRules';

const GOETHE_MODULES = [
  {
    id: 'lesen',
    title: 'Lesen (Leseverstehen)',
    subtitle: '5 Teile · 30 Aufgaben',
    time: '65 Minuten',
    points: '100 Punkte (Bestehen: ≥ 60 Pkt / 18 Richtige)',
    icon: BookOpenText,
    accent: 'from-emerald-500 to-teal-700',
    border: 'border-emerald-200 hover:border-emerald-400',
    ring: 'hover:shadow-[0_24px_48px_-15px_rgba(16,185,129,0.3)]',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partsDesc: 'Teil 1: Blog (R/F) · Teil 2: 2 Presseartikel (a/b/c) · Teil 3: Anzeigenzuordnung (A–J) · Teil 4: Meinungen (Ja/Nein) · Teil 5: Hausordnung (a/b/c)',
  },
  {
    id: 'hoeren',
    title: 'Hören (Hörverstehen)',
    subtitle: '4 Teile · 30 Aufgaben',
    time: 'ca. 40 Minuten',
    points: '100 Punkte (Bestehen: ≥ 60 Pkt / 18 Richtige)',
    icon: Headphones,
    accent: 'from-amber-500 to-orange-700',
    border: 'border-amber-200 hover:border-amber-400',
    ring: 'hover:shadow-[0_24px_48px_-15px_rgba(245,158,11,0.3)]',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    partsDesc: 'Teil 1: Durchsagen (2×) · Teil 2: Vortrag/Führung (1×) · Teil 3: Gespräch (1×) · Teil 4: Radiodiskussion „Wer sagt was?“ (2×)',
  },
  {
    id: 'schreiben',
    title: 'Schreiben (Schriftlicher Ausdruck)',
    subtitle: '3 Aufgaben · Freies Schreiben',
    time: '60 Minuten',
    points: '100 Punkte (40 + 40 + 20 Pkt)',
    icon: PenLine,
    accent: 'from-sky-500 to-blue-700',
    border: 'border-sky-200 hover:border-sky-400',
    ring: 'hover:shadow-[0_24px_48px_-15px_rgba(14,165,233,0.3)]',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    partsDesc: 'Aufgabe 1: Informelle E-Mail (~80 W, 40 Pkt) · Aufgabe 2: Forumsbeitrag (~80 W, 40 Pkt) · Aufgabe 3: Formelle E-Mail (~40 W, 20 Pkt)',
  },
  {
    id: 'sprechen',
    title: 'Sprechen (Mündliche Prüfung)',
    subtitle: '3 Teile + Aussprache',
    time: 'ca. 15 Min (+ 15 Min Vorbereitung)',
    points: '100 Punkte (28 + 40 + 16 + 16 Pkt)',
    icon: Mic,
    accent: 'from-rose-500 to-red-700',
    border: 'border-rose-200 hover:border-rose-400',
    ring: 'hover:shadow-[0_24px_48px_-15px_rgba(244,63,94,0.3)]',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    partsDesc: 'Teil 1: Gemeinsam planen (28 Pkt) · Teil 2: 5-Folien-Präsentation (40 Pkt) · Teil 3: Feedback & Fragen (16 Pkt) · Aussprache (16 Pkt)',
  },
];

export default function GoetheSectionPicker() {
  const { setSection, setCurrentView, setCurrentEvaluation } = useApp();
  const [activeTab, setActiveTab] = useState('pruefung'); // 'pruefung' | 'leitfaden' | 'rechner'

  // Calculator states
  const [calcLesen, setCalcLesen] = useState(21);
  const [calcHoeren, setCalcHoeren] = useState(19);
  const [calcSchreiben, setCalcSchreiben] = useState(72);
  const [calcSprechen, setCalcSprechen] = useState(76);

  const lesenScore = calculateGoetheReadingListeningScore(calcLesen);
  const hoerenScore = calculateGoetheReadingListeningScore(calcHoeren);
  const schreibenPassed = calcSchreiben >= 60;
  const sprechenPassed = calcSprechen >= 60;
  const allModulesPassed = lesenScore.passed && hoerenScore.passed && schreibenPassed && sprechenPassed;
  const avgPoints = Math.round((lesenScore.points100 + hoerenScore.points100 + Number(calcSchreiben) + Number(calcSprechen)) / 4);

  const pickSection = (secId) => {
    setCurrentEvaluation(null);
    setCurrentView('practice');
    setSection(secId);
  };

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-8 max-w-6xl mx-auto animate-fade-in">
      {/* Hero Header with German Banner */}
      <div className="w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-3 shadow-xs">
          <span className="text-base">🇩🇪</span>
          <span>Goethe-Zertifikat B1 · Prüfungsstandard Stand September 2025</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        </div>

        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Deutscher B1 Prüfungstrainer
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          Prüfungssimulation, KI-Bewertung nach offiziellen Goethe-Kriterien, authentische Aufgaben &amp; Notenberechnung nach dem Gemeinsamen Europäischen Referenzrahmen (GER).
        </p>

        {/* Tab switchers */}
        <div className="flex justify-center mt-6 gap-2">
          <button
            onClick={() => setActiveTab('pruefung')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeTab === 'pruefung'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Vier Prüfungsmodule
          </button>
          <button
            onClick={() => setActiveTab('leitfaden')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
              activeTab === 'leitfaden'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Prüfungsordnung &amp; Format
          </button>
          <button
            onClick={() => setActiveTab('rechner')}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rechner'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Notenrechner (Prädikat)
          </button>
        </div>
      </div>

      {activeTab === 'pruefung' && (
        <>
          {/* Official Pass Rule Banner */}
          <div className="w-full bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200/90 rounded-2xl p-4 mb-6 flex items-start sm:items-center gap-3 shadow-xs">
            <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs md:text-sm text-slate-800 leading-relaxed">
              <span className="font-bold text-amber-900">Modulares Goethe-System:</span> Sie müssen jedes Modul separat mit mindestens <strong className="text-amber-900 font-bold">60 von 100 Punkten</strong> bestehen. Es gibt keinen Notenausgleich zwischen den Modulen. Bestanden wird ab 18/30 Items (Lesen/Hören).
            </div>
          </div>

          {/* 4 Core Modules Grid */}
          <div className="w-full grid gap-4 sm:grid-cols-2 mb-8">
            {GOETHE_MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  onClick={() => pickSection(m.id)}
                  className={`group relative overflow-hidden rounded-2xl border bg-white p-5 cursor-pointer transition-all duration-300 shadow-sm ${m.border} ${m.ring} hover:-translate-y-1 flex flex-col justify-between`}
                >
                  {/* Subtle top color bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${m.accent}`} />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.accent} flex items-center justify-center text-white shadow-sm`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-slate-950">
                            {m.title}
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">{m.subtitle}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${m.badge}`}>
                        {m.time}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {m.partsDesc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {m.points}
                    </span>
                    <button className="flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:translate-x-0.5 transition-transform">
                      <span>Starten</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Learning Tools Grid */}
          <div className="w-full">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Prüfungsvorbereitung &amp; Lernwerkzeuge
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => pickSection('themen')}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-purple-50 text-purple-700 group-hover:bg-purple-100 transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    Themenkatalog C1–C15
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alle 15 B1-Prüfungsthemen mit 450+ Kernwörtern, Nomen &amp; Sprechimpulsen.
                  </p>
                </div>
              </button>

              <button
                onClick={() => pickSection('redemittel')}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-100 transition-colors">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Redemittel &amp; Grammatik
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Satzmuster für Meinung, 5-Folien-Präsentation, E-Mail-Formeln &amp; B1-Konnektoren.
                  </p>
                </div>
              </button>

              <button
                onClick={() => pickSection('plan')}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all text-left flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    8-Wochen-Trainingsplan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Strukturierter Lernplan, Diagnostik-Tracker und offizielle Selbstbewertungsbögen.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'leitfaden' && (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs animate-fade-in text-left">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Info className="w-6 h-6 text-brand-500" />
            Goethe-Zertifikat B1 — Offizielles Prüfungsformat
          </h2>

          <div className="grid gap-6 md:grid-cols-2 text-sm text-slate-700">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base mb-2">Prüfungsteile &amp; Zeiten</h3>
              <ul className="space-y-2">
                <li className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-medium">Lesen (5 Teile, 30 Items)</span>
                  <span className="text-slate-600 font-semibold">65 Min.</span>
                </li>
                <li className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-medium">Hören (4 Teile, 30 Items)</span>
                  <span className="text-slate-600 font-semibold">ca. 40 Min.</span>
                </li>
                <li className="flex justify-between border-b border-slate-200 pb-1">
                  <span className="font-medium">Schreiben (3 Aufgaben)</span>
                  <span className="text-slate-600 font-semibold">60 Min.</span>
                </li>
                <li className="flex justify-between pb-1">
                  <span className="font-medium">Sprechen (Paarprüfung, 3 Teile)</span>
                  <span className="text-slate-600 font-semibold">ca. 15 Min.</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-bold text-slate-900 text-base mb-2">Notenstufen (Prädikate)</h3>
              <ul className="space-y-1.5">
                <li className="flex justify-between">
                  <span>100–90 Punkte</span>
                  <span className="font-bold text-emerald-700">sehr gut</span>
                </li>
                <li className="flex justify-between">
                  <span>89–80 Punkte</span>
                  <span className="font-bold text-blue-700">gut</span>
                </li>
                <li className="flex justify-between">
                  <span>79–70 Punkte</span>
                  <span className="font-bold text-amber-700">befriedigend</span>
                </li>
                <li className="flex justify-between">
                  <span>69–60 Punkte</span>
                  <span className="font-bold text-orange-700">ausreichend (Bestanden)</span>
                </li>
                <li className="flex justify-between border-t border-slate-200 pt-1">
                  <span>59–0 Punkte</span>
                  <span className="font-bold text-rose-700">nicht bestanden</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs md:text-sm text-slate-800">
            <h4 className="font-bold text-amber-900 mb-1">Wichtige Prüfungsregeln:</h4>
            <p className="mb-2">
              • <strong>Knock-Out-Regel Schreiben:</strong> Wenn das Kriterium <em>Erfüllung</em> mit Band E (0 Punkte) bewertet wird (z.B. bei unter 50% der geforderten Wortzahl oder Thema verfehlt), erhält die gesamte Aufgabe 0 Punkte!
            </p>
            <p className="mb-2">
              • <strong>Antwortbogen-Übertrag:</strong> Bei Lesen und Hören sind jeweils ca. 5 Minuten zum Übertrag auf den Antwortbogen eingeplant. Nur der Antwortbogen wird gewertet.
            </p>
            <p>
              • <strong>Sprechen Notizen:</strong> In der 15-minütigen Vorbereitungszeit dürfen kurze Stichpunkte notiert werden. Es muss frei gesprochen werden – Ablesen führt zu Punktabzug.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'rechner' && (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs animate-fade-in text-left">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-brand-500" />
            Goethe B1 Punkte- &amp; Notenrechner
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Geben Sie Ihre Rohpunkte aus den vier Modulen ein, um Ihre offizielle Goethe-Gesamtnote und das Prädikat zu berechnen.
          </p>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Input sliders */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Lesen: {calcLesen} / 30 richtige Items</span>
                  <span className="text-brand-600 font-bold">{lesenScore.points100} / 100 Pkt</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={calcLesen}
                  onChange={(e) => setCalcLesen(parseInt(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <span className={`text-[11px] font-semibold ${lesenScore.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {lesenScore.passed ? '✓ Bestanden (≥18 Items)' : '✗ Nicht bestanden (mind. 18 erforderlich)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Hören: {calcHoeren} / 30 richtige Items</span>
                  <span className="text-brand-600 font-bold">{hoerenScore.points100} / 100 Pkt</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={calcHoeren}
                  onChange={(e) => setCalcHoeren(parseInt(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
                <span className={`text-[11px] font-semibold ${hoerenScore.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {hoerenScore.passed ? '✓ Bestanden (≥18 Items)' : '✗ Nicht bestanden (mind. 18 erforderlich)'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Schreiben: {calcSchreiben} / 100 Punkte</span>
                  <span className={`font-bold ${schreibenPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {schreibenPassed ? 'Bestanden' : 'Nicht bestanden'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={calcSchreiben}
                  onChange={(e) => setCalcSchreiben(parseInt(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex justify-between text-sm font-semibold mb-1">
                  <span>Sprechen: {calcSprechen} / 100 Punkte</span>
                  <span className={`font-bold ${sprechenPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {sprechenPassed ? 'Bestanden' : 'Nicht bestanden'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={calcSprechen}
                  onChange={(e) => setCalcSprechen(parseInt(e.target.value))}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between shadow-md">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Prüfungsauswertung
                </span>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-extrabold text-white">
                    {avgPoints}
                  </span>
                  <span className="text-slate-400 text-lg">/ 100 Ø</span>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Lesen (GER B1):</span>
                    <span className="font-bold text-white">{lesenScore.points100} Pkt ({lesenScore.praedikat.label})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Hören (GER B1):</span>
                    <span className="font-bold text-white">{hoerenScore.points100} Pkt ({hoerenScore.praedikat.label})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Schreiben (GER B1):</span>
                    <span className="font-bold text-white">{calcSchreiben} Pkt</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Sprechen (GER B1):</span>
                    <span className="font-bold text-white">{calcSprechen} Pkt</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-700">
                {allModulesPassed ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <span>Gesamtprüfung bestanden (B1-Zertifikat erteilt)!</span>
                  </div>
                ) : (
                  <div className="text-rose-400 text-xs md:text-sm font-semibold">
                    Mindestens ein Modul liegt unter 60 Punkten. Das Zertifikat wird erst erteilt, wenn alle 4 Module bestanden sind.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
