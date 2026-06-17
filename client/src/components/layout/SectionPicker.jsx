import { useApp } from '../../context/AppContext';
import ModuleToggle from '../common/ModuleToggle';
import { Mic, PenLine, BookOpenText, Headphones, ArrowRight } from 'lucide-react';
import { BrandWordmark } from '../common/BrandLogo';

const SECTIONS = [
  {
    id: 'speaking',
    icon: Mic,
    title: 'Speaking',
    blurb: 'Answer by voice. Get a banded report on Fluency, Vocabulary, Grammar & Pronunciation.',
    criteria: ['FC', 'LR', 'GRA', 'P'],
    accent: 'from-violet-500 to-purple-700',
    chip: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'writing',
    icon: PenLine,
    title: 'Writing',
    blurb: 'Write Task 1 & Task 2 responses. Graded on the four official Writing criteria with a model rewrite.',
    criteria: ['TR', 'CC', 'LR', 'GRA'],
    accent: 'from-sky-500 to-blue-700',
    chip: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'reading',
    icon: BookOpenText,
    title: 'Reading',
    blurb: 'Practice timed passages with mixed question types. Auto-marked, converted to a band, with strategy feedback.',
    criteria: ['T/F/NG', 'MCQ', 'Gap', 'Headings'],
    accent: 'from-emerald-500 to-teal-700',
    chip: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'listening',
    icon: Headphones,
    title: 'Listening',
    blurb: 'Real-test format: 4 sections, 40 questions, multi-voice AI audio. Heard once, auto-marked on the official band scale.',
    criteria: ['Section 1–4', 'Gap', 'MCQ', 'Matching'],
    accent: 'from-amber-500 to-orange-700',
    chip: 'bg-amber-100 text-amber-700',
  },
];

export default function SectionPicker() {
  const { setSection, setCurrentView, setCurrentEvaluation } = useApp();

  const pick = (id) => {
    setCurrentEvaluation(null);
    setCurrentView('practice');
    setSection(id);
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10 animate-fade-in">
      <div className="max-w-5xl w-full">
        {/* Hero */}
        <div className="text-center mb-8">
          <BrandWordmark height={52} className="mx-auto mb-3" />
          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400 font-medium mb-5">
            Decode your IELTS. Quantify your progress.
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            What would you like to practice?
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Choose a test module. Each one is graded by an examiner-calibrated AI against the official IELTS band descriptors.
          </p>
        </div>

        {/* Module toggle (applies to Writing & Reading) */}
        <div className="flex flex-col items-center gap-1.5 mb-8">
          <ModuleToggle />
          <span className="text-[11px] text-slate-400">
            Academic or General Training — applies to Writing &amp; Reading
          </span>
        </div>

        {/* Section cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              id={`section-${s.id}`}
              onClick={() => pick(s.id)}
              className="group text-left card-padded hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center shadow-sm mb-4`}
              >
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                {s.title}
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mt-1.5 flex-1">{s.blurb}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {s.criteria.map((c) => (
                  <span
                    key={c}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${s.chip}`}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
