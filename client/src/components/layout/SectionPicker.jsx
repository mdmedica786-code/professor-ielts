import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModuleToggle from '../common/ModuleToggle';
import { Mic, PenLine, BookOpenText, Headphones, ArrowRight, Lock } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import useEntitlements from '../../hooks/useEntitlements';

const SECTIONS = [
  {
    id: 'speaking',
    icon: Mic,
    title: 'Speaking',
    tagline: 'Answer by voice',
    accent: 'from-violet-500 to-purple-700',
    glow: 'hover:shadow-[0_28px_56px_-20px_rgba(139,92,246,0.38)]',
    ring: 'ring-violet-400/70 shadow-[0_28px_56px_-20px_rgba(139,92,246,0.38)]',
    text: 'text-violet-600',
    arrowHover: 'group-hover:text-violet-600',
  },
  {
    id: 'writing',
    icon: PenLine,
    title: 'Writing',
    tagline: 'Task 1 & 2 essays',
    accent: 'from-sky-500 to-blue-700',
    glow: 'hover:shadow-[0_28px_56px_-20px_rgba(14,165,233,0.38)]',
    ring: 'ring-sky-400/70 shadow-[0_28px_56px_-20px_rgba(14,165,233,0.38)]',
    text: 'text-sky-600',
    arrowHover: 'group-hover:text-sky-600',
  },
  {
    id: 'reading',
    icon: BookOpenText,
    title: 'Reading',
    tagline: 'Timed passages',
    accent: 'from-emerald-500 to-teal-700',
    glow: 'hover:shadow-[0_28px_56px_-20px_rgba(16,185,129,0.38)]',
    ring: 'ring-emerald-400/70 shadow-[0_28px_56px_-20px_rgba(16,185,129,0.38)]',
    text: 'text-emerald-600',
    arrowHover: 'group-hover:text-emerald-600',
  },
  {
    id: 'listening',
    icon: Headphones,
    title: 'Listening',
    tagline: '4 sections · 40 Qs',
    accent: 'from-amber-500 to-orange-700',
    glow: 'hover:shadow-[0_28px_56px_-20px_rgba(245,158,11,0.38)]',
    ring: 'ring-amber-400/70 shadow-[0_28px_56px_-20px_rgba(245,158,11,0.38)]',
    text: 'text-amber-600',
    arrowHover: 'group-hover:text-amber-600',
  },
];

export default function SectionPicker() {
  const { setSection, setCurrentView, setCurrentEvaluation, setTestMode } = useApp();
  const [expandedSection, setExpandedSection] = useState(null);
  const { isPremium, loaded } = useEntitlements();

  const pick = (id, mode) => {
    setCurrentEvaluation(null);
    setCurrentView('practice');
    setTestMode(mode);
    setSection(id);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 animate-fade-in">
      <div className="max-w-5xl w-full">
        {/* Hero — tight, one line */}
        <div className="text-center mb-7">
          <BrandLogo size={48} className="mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            What would you like to practice?
          </h1>
        </div>

        {/* Module toggle (applies to Writing & Reading) */}
        <div className="flex justify-center mb-8">
          <ModuleToggle />
        </div>

        {/* Section cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((s) => {
            const isExpanded = expandedSection === s.id;
            return (
              <div
                key={s.id}
                id={`section-${s.id}`}
                className={`relative overflow-hidden rounded-[22px] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50 p-5
                            transition-all duration-300 flex flex-col
                            ${isExpanded
                              ? `ring-2 ${s.ring} scale-[1.02]`
                              : `shadow-card hover:-translate-y-1 ${s.glow}`}`}
              >
                {/* Ambient tint bleeding from the icon corner */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -top-12 -left-12 w-40 h-40 rounded-full bg-gradient-to-br ${s.accent} opacity-[0.08] blur-2xl transition-opacity duration-300 ${isExpanded ? 'opacity-[0.14]' : ''}`}
                />

                <button
                  onClick={() => setExpandedSection(isExpanded ? null : s.id)}
                  className="group relative text-left flex flex-col items-center text-center w-full h-full focus:outline-none py-2"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.accent} flex items-center justify-center mb-4
                                shadow-lg ring-1 ring-white/40 ring-inset
                                transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    <s.icon className="w-7 h-7 text-white drop-shadow-sm" />
                  </div>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
                    {s.title}
                    <ArrowRight className={`w-4 h-4 text-slate-300 transition-all ${isExpanded ? `rotate-90 ${s.text}` : `${s.arrowHover} group-hover:translate-x-0.5`}`} />
                  </h2>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{s.tagline}</p>
                </button>

                {isExpanded && (
                  <div className="relative mt-5 pt-5 border-t border-slate-200/70 flex flex-col gap-2 animate-float-in">
                    <button
                      onClick={() => pick(s.id, 'practice')}
                      className="w-full py-2.5 text-sm rounded-xl font-bold text-white
                                 bg-gradient-to-b from-slate-700 to-slate-900
                                 shadow-md shadow-slate-900/20 ring-1 ring-white/10 ring-inset
                                 transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/30 active:scale-[0.97]"
                    >
                      Practice Mode
                    </button>
                    <button
                      onClick={() => {
                        if (!loaded) return;
                        if (isPremium) {
                          pick(s.id, 'full');
                        } else {
                          window.dispatchEvent(new CustomEvent('show-paywall', {
                            detail: { error: 'Full Test Mode is exclusively available on the Pro plan.', retryAfterMs: 0 }
                          }));
                        }
                      }}
                      disabled={!loaded}
                      className={`w-full py-2.5 text-sm rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.97] ${
                        isPremium
                          ? 'text-white bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset'
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'
                      } ${!loaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {!isPremium && <Lock className="w-3.5 h-3.5" />}
                      Full Test Mode
                      {!isPremium && <span className="text-[9px] uppercase tracking-widest bg-gradient-to-r from-brand-600 to-violet-500 text-white px-1.5 py-0.5 rounded-md ml-1 shadow-sm">Pro</span>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
