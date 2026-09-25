import { useState } from 'react';
import {
  EIGHT_WEEK_STUDY_PLAN,
  SCHREIBEN_CHECKLIST,
  SPRECHEN_CHECKLIST,
} from '../../data/goethe/goetheGradingRules';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Award,
  BookOpen,
  HelpCircle,
  FileCheck,
} from 'lucide-react';

export default function GoetheStudyPlan() {
  const [completedWeeks, setCompletedWeeks] = useState({});
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'checklists'

  const toggleWeek = (weekNum) => {
    setCompletedWeeks((prev) => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  return (
    <div className="min-h-full px-3 md:px-6 py-6 max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in text-left">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold mb-1.5 border border-emerald-200">
          <span>🇩🇪 Goethe-Zertifikat B1 Vorbereitung</span>
          <span>·</span>
          <span>8-Wochen-Trainingsplan &amp; Checklisten</span>
        </div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
          Strukturierter B1-Trainingsplan (1,5–2 Std. / Tag)
        </h1>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Schritt-für-Schritt-Planung für alle vier Fertigkeiten (Lesen, Hören, Schreiben, Sprechen) mit Fehlerlog und offiziellen Bewertungsbögen.
        </p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'plan'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            8-Wochen-Plan
          </button>
          <button
            onClick={() => setActiveTab('checklists')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'checklists'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Selbstbewertungs-Checklisten
          </button>
        </div>
      </div>

      {activeTab === 'plan' ? (
        <div className="space-y-4">
          {EIGHT_WEEK_STUDY_PLAN.map((item) => {
            const isDone = completedWeeks[item.week];
            return (
              <div
                key={item.week}
                className={`p-5 rounded-2xl border transition-all ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleWeek(item.week)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300" />
                      )}
                    </button>
                    <div>
                      <h3 className={`font-bold text-sm md:text-base ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        <strong className="text-slate-900">Wochenfokus: </strong>
                        {item.focus}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex-shrink-0">
                    Woche {item.week}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="text-slate-600">
                    <strong className="text-slate-800">Themen: </strong>
                    {item.topics}
                  </div>
                  <div className="text-slate-600">
                    <strong className="text-slate-800">Grammatik: </strong>
                    {item.grammar}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Self-Scoring Checklists */
        <div className="space-y-6">
          {/* Schreiben Checklist */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-sky-600" />
              <span>Selbstbewertungsbogen: Schreiben (Aufgaben 1–3)</span>
            </h3>

            <div className="space-y-3">
              {SCHREIBEN_CHECKLIST.map((crit, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Kriterium: {crit.criterion}</span>
                  </div>
                  <p className="text-slate-700">{crit.description}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2 pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    <div><strong>Band A:</strong> {crit.bands.A}</div>
                    <div><strong>Band B:</strong> {crit.bands.B}</div>
                    <div><strong>Band C:</strong> {crit.bands.C}</div>
                    <div><strong>Band D:</strong> {crit.bands.D}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprechen Checklist */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-rose-600" />
              <span>Selbstbewertungsbogen: Sprechen (Teile 1–3 &amp; Aussprache)</span>
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {SPRECHEN_CHECKLIST.map((sp, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block text-xs md:text-sm">
                    {sp.part}
                  </span>
                  <ul className="space-y-1.5 text-slate-700">
                    {sp.checks.map((chk, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{chk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
