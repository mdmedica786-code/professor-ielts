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
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { calculateGoetheReadingListeningScore, GOETHE_LEVEL_SPECS } from '../../data/goethe/goetheGradingRules';

export default function GoetheSectionPicker() {
  const { setSection, setCurrentView, setCurrentEvaluation, goetheLevel, setGoetheLevel } = useApp();
  const [activeTab, setActiveTab] = useState('pruefung'); // 'pruefung' | 'leitfaden' | 'rechner'

  const currentLevel = goetheLevel || 'B1';
  const spec = GOETHE_LEVEL_SPECS[currentLevel] || GOETHE_LEVEL_SPECS.B1;

  // Calculator states
  const [calcLesen, setCalcLesen] = useState(spec.lesen?.passRaw || 18);
  const [calcHoeren, setCalcHoeren] = useState(spec.hoeren?.passRaw || 18);
  const [calcSchreiben, setCalcSchreiben] = useState(70);
  const [calcSprechen, setCalcSprechen] = useState(72);

  const lesenScore = calculateGoetheReadingListeningScore(calcLesen, currentLevel);
  const hoerenScore = calculateGoetheReadingListeningScore(calcHoeren, currentLevel, 'hoeren');
  const schreibenPassed = calcSchreiben >= 60;
  const sprechenPassed = calcSprechen >= 60;
  const allModulesPassed = lesenScore.passed && hoerenScore.passed && schreibenPassed && sprechenPassed;

  const pickSection = (secId) => {
    setCurrentEvaluation(null);
    setCurrentView('practice');
    setSection(secId);
  };

  const dynamicModules = [
    {
      id: 'lesen',
      title: `Lesen (Leseverstehen) · ${currentLevel}`,
      subtitle: `${spec.lesen.partsCount} Teile · ${spec.lesen.totalQuestions} Aufgaben`,
      time: `${spec.lesen.timeMinutes} Minuten`,
      points: `100 Punkte (Bestehen: ≥ 60 Pkt / ${spec.lesen.passRaw} Richtige)`,
      icon: BookOpenText,
      accent: 'from-emerald-500 to-teal-700',
      border: 'border-emerald-200 hover:border-emerald-400',
      ring: 'hover:shadow-[0_24px_48px_-15px_rgba(16,185,129,0.3)]',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      partsDesc: spec.lesen.partsDesc,
    },
    {
      id: 'hoeren',
      title: `Hören (Hörverstehen) · ${currentLevel}`,
      subtitle: `${spec.hoeren.partsCount} Teile · ${spec.hoeren.totalQuestions} Aufgaben`,
      time: `ca. ${spec.hoeren.timeMinutes} Minuten`,
      points: `100 Punkte (Bestehen: ≥ 60 Pkt / ${spec.hoeren.passRaw} Richtige)`,
      icon: Headphones,
      accent: 'from-amber-500 to-orange-700',
      border: 'border-amber-200 hover:border-amber-400',
      ring: 'hover:shadow-[0_24px_48px_-15px_rgba(245,158,11,0.3)]',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      partsDesc: spec.hoeren.partsDesc,
    },
    {
      id: 'schreiben',
      title: `Schreiben (Schriftlicher Ausdruck) · ${currentLevel}`,
      subtitle: `${spec.schreiben.partsCount} Aufgaben · Freie Textproduktion`,
      time: `${spec.schreiben.timeMinutes} Minuten`,
      points: '100 Punkte (Bestehen: ≥ 60 Pkt)',
      icon: PenLine,
      accent: 'from-sky-500 to-blue-700',
      border: 'border-sky-200 hover:border-sky-400',
      ring: 'hover:shadow-[0_24px_48px_-15px_rgba(14,165,233,0.3)]',
      badge: 'bg-sky-50 text-sky-700 border-sky-200',
      partsDesc: spec.schreiben.partsDesc,
    },
    {
      id: 'sprechen',
      title: `Sprechen (Mündliche Prüfung) · ${currentLevel}`,
      subtitle: `${spec.sprechen.partsCount} Teile · Interaktiv mit KI-Partner`,
      time: `ca. ${spec.sprechen.timeMinutes} Minuten`,
      points: '100 Punkte (Bestehen: ≥ 60 Pkt)',
      icon: Mic,
      accent: 'from-rose-500 to-red-700',
      border: 'border-rose-200 hover:border-rose-400',
      ring: 'hover:shadow-[0_24px_48px_-15px_rgba(244,63,94,0.3)]',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      partsDesc: spec.sprechen.partsDesc,
    },
  ];

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-8 max-w-6xl mx-auto animate-fade-in text-left">
      {/* Hero Header with German Banner & Level Selector */}
      <div className="w-full text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-900 text-xs font-semibold mb-3 shadow-xs">
          <span className="text-base">🇩🇪</span>
          <span>Goethe-Zertifikat {currentLevel} · {spec.label}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        </div>

        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
          Deutscher {currentLevel} Prüfungstrainer
        </h1>
        <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">
          Dynamische Prüfungssimulation für jedes GER-Niveau (A2–C1), KI-Prüfungspartner mit Spracheingabe &amp; Sprachausgabe, sowie authentische Themenauswahl.
        </p>

        {/* Level Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Niveau wählen:</span>
          {['A2', 'B1', 'B2', 'C1'].map((lvl) => {
            const isActive = currentLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => setGoetheLevel(lvl)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                  isActive
                    ? 'bg-slate-900 text-white ring-2 ring-amber-400 scale-105'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {lvl} ({GOETHE_LEVEL_SPECS[lvl]?.subLabel || lvl})
              </button>
            );
          })}
        </div>

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

      {/* TAB 1: 4 Modules Grid */}
      {activeTab === 'pruefung' && (
        <div className="w-full flex flex-col gap-6">
          <button
            type="button"
            onClick={() => pickSection('mock')}
            className="w-full text-left rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-lg hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Neu · Unter Prüfungsbedingungen</span>
              <span className="block text-xl md:text-2xl font-extrabold mt-1">Vollständige Modellprüfung {currentLevel}</span>
              <span className="block text-sm text-slate-300 mt-1">
                Lesen → Hören → Pause → Schreiben → Sprechen, mit Ergebnisbericht über alle vier Module (0–400 Punkte).
              </span>
            </span>
            <span className="inline-flex items-center gap-2 self-start md:self-center px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-900 text-sm font-extrabold">
              <ShieldCheck className="w-4 h-4" /> Starten
            </span>
          </button>
          <div className="grid gap-6 md:grid-cols-2">
            {dynamicModules.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.id}
                  onClick={() => pickSection(m.id)}
                  className={`group relative flex flex-col justify-between p-6 rounded-3xl bg-white border ${m.border} shadow-sm transition-all duration-300 hover:-translate-y-1 ${m.ring} cursor-pointer`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${m.accent} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${m.badge}`}>
                        {m.points}
                      </span>
                    </div>

                    <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
                      {m.title}
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2">
                      <span>{m.subtitle}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {m.time}
                      </span>
                    </p>

                    <p className="text-xs text-slate-600 leading-relaxed mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {m.partsDesc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Dynamisch generieren oder Standardtest
                    </span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold group-hover:bg-brand-600 transition-colors">
                      <span>Starten</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Goethe Resources Banner */}
          <div className="grid gap-3 sm:grid-cols-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => pickSection('themen')}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-left transition-all hover:shadow-xs flex items-center gap-3"
            >
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Themenkatalog C1–C15</h4>
                <p className="text-[11px] text-slate-500">15 thematische Wortschatzmodule</p>
              </div>
            </button>

            <button
              onClick={() => pickSection('redemittel')}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-left transition-all hover:shadow-xs flex items-center gap-3"
            >
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Redemittel &amp; Grammatik</h4>
                <p className="text-[11px] text-slate-500">Prüfungsformulierungen für Dialoge</p>
              </div>
            </button>

            <button
              onClick={() => pickSection('plan')}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 text-left transition-all hover:shadow-xs flex items-center gap-3"
            >
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Trainingsplan</h4>
                <p className="text-[11px] text-slate-500">Gezielte Vorbereitung auf die Prüfung</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Guide / Exam Regulations */}
      {activeTab === 'leitfaden' && (
        <div className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Offizielle Goethe-Prüfungsordnung für Niveau {currentLevel}
              </h2>
              <p className="text-xs text-slate-500">
                Gemeinsamer Europäischer Referenzrahmen (GER)
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm">Prüfungsdauer</span>
              <p className="text-slate-600">
                Lesen: {spec.lesen.timeMinutes} Min · Hören: {spec.hoeren.timeMinutes} Min · Schreiben: {spec.schreiben.timeMinutes} Min · Sprechen: ca. {spec.sprechen.timeMinutes} Min.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
              <span className="font-bold text-slate-900 text-sm">Bestehensgrenze</span>
              <p className="text-slate-600">
                In jedem Modul müssen mindestens 60 Punkte (60%) erreicht werden.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Score Calculator */}
      {activeTab === 'rechner' && (
        <div className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Goethe Noten- &amp; Prädikatsrechner</h2>
              <p className="text-xs text-slate-500">Niveau {currentLevel} · Offizielle Umrechnungstabelle</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${allModulesPassed ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
              {allModulesPassed ? 'Gesamtprüfung Bestanden' : 'Nicht bestanden (mind. ein Modul < 60P)'}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block mb-1">Lesen (Richtige von {spec.lesen.maxRaw})</label>
              <input
                type="number"
                min="0"
                max={spec.lesen.maxRaw}
                value={calcLesen}
                onChange={(e) => setCalcLesen(Math.max(0, Math.min(spec.lesen.maxRaw, parseInt(e.target.value) || 0)))}
                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold mb-2"
              />
              <div className="flex justify-between font-bold">
                <span>{lesenScore.points100} / 100 Pkt</span>
                <span className={lesenScore.passed ? 'text-emerald-600' : 'text-rose-600'}>{lesenScore.praedikat.label}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block mb-1">Hören (Richtige von {spec.hoeren.maxRaw})</label>
              <input
                type="number"
                min="0"
                max={spec.hoeren.maxRaw}
                value={calcHoeren}
                onChange={(e) => setCalcHoeren(Math.max(0, Math.min(spec.hoeren.maxRaw, parseInt(e.target.value) || 0)))}
                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold mb-2"
              />
              <div className="flex justify-between font-bold">
                <span>{hoerenScore.points100} / 100 Pkt</span>
                <span className={hoerenScore.passed ? 'text-emerald-600' : 'text-rose-600'}>{hoerenScore.praedikat.label}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block mb-1">Schreiben (Punkte von 100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={calcSchreiben}
                onChange={(e) => setCalcSchreiben(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold mb-2"
              />
              <div className="flex justify-between font-bold">
                <span>{calcSchreiben} / 100 Pkt</span>
                <span className={schreibenPassed ? 'text-emerald-600' : 'text-rose-600'}>{schreibenPassed ? 'Bestanden' : 'Nicht bestanden'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="font-bold text-slate-700 block mb-1">Sprechen (Punkte von 100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={calcSprechen}
                onChange={(e) => setCalcSprechen(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold mb-2"
              />
              <div className="flex justify-between font-bold">
                <span>{calcSprechen} / 100 Pkt</span>
                <span className={sprechenPassed ? 'text-emerald-600' : 'text-rose-600'}>{sprechenPassed ? 'Bestanden' : 'Nicht bestanden'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
