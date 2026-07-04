import { BrandWordmark } from '../common/BrandLogo';
import {
  Loader2, ArrowRight, BookOpen, Mic, PenTool, Headphones,
  ChevronDown, Library, GraduationCap, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lazy, Suspense, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import LanguagePicker from '../common/LanguagePicker';
import { useTranslation } from 'react-i18next';

// three.js is ~600 KB — lazy-load so the hero text paints instantly and the
// 3D scene fades in when ready. If the chunk fails (old device, no WebGL),
// the CSS gradient fallback below simply stays.
const Scene3D = lazy(() => import('./Scene3D'));

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// ---------- motion presets ----------
const rise = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

const SKILLS = [
  {
    icon: Mic, key: 'speaking',
    accent: 'from-violet-500 to-purple-700',
    glow: 'hover:shadow-[0_24px_48px_-18px_rgba(139,92,246,0.35)]',
    title: 'Speaking Coach',
    blurb: 'Real-time voice interactions simulating actual IELTS examiners with instant pronunciation and grammar feedback.',
    materials: [
      '86 examiner-predicted cue cards with 600+ Part-3 follow-up questions',
      'Live phone-call examiner — real-time corrections as you speak',
      'Acoustic scoring: phoneme-level pronunciation, pauses & fluency diagnostics',
    ],
  },
  {
    icon: Headphones, key: 'listening',
    accent: 'from-amber-500 to-orange-700',
    glow: 'hover:shadow-[0_24px_48px_-18px_rgba(245,158,11,0.35)]',
    title: 'Listening Practice',
    blurb: 'Authentic multi-accent audio. Practice specific sections or take a full 40-question mock exam.',
    materials: [
      '80 full listening tests with real exam audio',
      'Section-by-section practice or full 40-question mocks',
      'Instant band conversion with answer-variant tolerance (harbour/harbor)',
    ],
  },
  {
    icon: BookOpen, key: 'reading',
    accent: 'from-emerald-500 to-teal-700',
    glow: 'hover:shadow-[0_24px_48px_-18px_rgba(16,185,129,0.35)]',
    title: 'Reading Tests',
    blurb: 'Dynamically generated passages with question types matching true IELTS difficulty.',
    materials: [
      'AI-generated passages calibrated to real exam difficulty',
      'Every official question type: T/F/NG, matching headings, completion',
      'Timed mode with per-question-type accuracy breakdown',
    ],
  },
  {
    icon: PenTool, key: 'writing',
    accent: 'from-sky-500 to-blue-700',
    glow: 'hover:shadow-[0_24px_48px_-18px_rgba(14,165,233,0.35)]',
    title: 'Writing Evaluation',
    blurb: 'Upload essays or Task 1 charts. Detailed breakdown on all four scoring criteria.',
    materials: [
      'Task 1 & Task 2 evaluation against official band descriptors',
      'Sentence-level corrections: task response, coherence, lexis, grammar',
      'Personalised action plan targeting your next half-band',
    ],
  },
];

const GUIDE_STEPS = [
  { step: '1', title: 'Diagnose', text: 'Take one mock per skill. Your band profile shows exactly where the easy points are.' },
  { step: '2', title: 'Drill daily', text: 'One cue card + one listening section a day beats a 6-hour Sunday cram — fluency is muscle memory.' },
  { step: '3', title: 'Review mistakes', text: 'Your error patterns (grammar slips, mispronounced words) are tracked. Re-drill them until they disappear.' },
  { step: '4', title: 'Simulate', text: 'In the final two weeks, switch to full timed mocks and the live examiner call to build exam stamina.' },
];

export default function LandingPage({ onSignInClick }) {
  const { t } = useTranslation();
  const { signInAnonymously } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [openSkill, setOpenSkill] = useState(null);

  const prefersReducedMotion = useReducedMotion();
  const webgl = useMemo(supportsWebGL, []);

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInAnonymously();
    } catch {
      setLoading(false);
      setError('Failed to start guest session. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] app-canvas flex flex-col font-sans relative">
      {/* ===== Fixed background layer: 3D scene (or gradient fallback) ===== */}
      <div className="fixed inset-0 z-0" aria-hidden="true">
        {/* CSS fallback blobs — always present, sit under the canvas */}
        <div className="absolute -top-32 -right-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-violet-400/25 to-purple-600/15 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-sky-400/20 to-blue-600/10 blur-3xl" />
        <div className="absolute -bottom-24 right-1/4 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-emerald-400/15 to-teal-600/10 blur-3xl" />
        {webgl && (
          <Suspense fallback={null}>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <Scene3D still={!!prefersReducedMotion} />
            </motion.div>
          </Suspense>
        )}
      </div>

      {/* ===== Foreground UI ===== */}
      {/* Floating frosted navigation */}
      <div className="sticky top-0 z-40 px-4 pt-3">
        <nav className="glass-panel backdrop-blur-xl bg-white/60 rounded-2xl w-full px-4 sm:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
          <BrandWordmark height={32} />
          <div className="flex items-center gap-4">
            <LanguagePicker />
            <button
              onClick={onSignInClick}
              className="text-sm font-bold text-white px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]"
            >
              {t('landing.signIn')}
            </button>
          </div>
        </nav>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">

        {/* ===== Hero ===== */}
        <motion.div
          className="text-center max-w-3xl mx-auto min-h-[62vh] flex flex-col items-center justify-center"
          initial="hidden"
          animate="show"
        >
          <motion.div variants={rise} custom={0}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/60 backdrop-blur-md border border-white/60 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">Examiner-calibrated AI · All four IELTS skills</span>
          </motion.div>

          <motion.h1 variants={rise} custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            {t('landing.title')}
          </motion.h1>

          <motion.p variants={rise} custom={2}
            className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('landing.subtitle')}
          </motion.p>

          <motion.div variants={rise} custom={3}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
            <button
              onClick={onSignInClick}
              className="group w-full sm:w-auto px-8 py-3.5 text-white rounded-xl font-bold
                         bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow
                         ring-1 ring-white/20 ring-inset focus:ring-2 focus:ring-offset-2 focus:ring-brand-500
                         transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Start Practicing Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-white/50 backdrop-blur-xl text-slate-700 border border-white/60 rounded-xl font-semibold shadow-card hover:bg-white/70 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('landing.tryAsGuest')}
            </button>
          </motion.div>

          {error && <p className="mt-4 text-sm text-rose-600 font-medium">{error}</p>}

          <motion.div variants={rise} custom={4} className="mt-16 text-slate-400">
            <ChevronDown className="w-6 h-6 mx-auto animate-bounce" />
          </motion.div>
        </motion.div>

        {/* ===== Feature grid (scroll reveal) ===== */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {SKILLS.map((f, i) => (
            <motion.div
              key={f.title}
              variants={rise}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className={`group relative overflow-hidden p-6 rounded-[22px] border border-white/60 bg-white/55 backdrop-blur-xl shadow-card transition-all duration-300 hover:-translate-y-1 ${f.glow}`}
            >
              <div aria-hidden="true"
                className={`pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br ${f.accent} opacity-[0.07] blur-2xl`} />
              <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/40 ring-inset transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                <f.icon className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <h3 className="relative text-lg font-bold tracking-tight text-slate-900">{f.title}</h3>
              <p className="relative mt-2 text-slate-600 text-sm leading-relaxed">{f.blurb}</p>
            </motion.div>
          ))}
        </div>

        {/* ===== Materials & Resources (collapsible) ===== */}
        <motion.section
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="mt-24 w-full max-w-4xl"
        >
          <button
            onClick={() => setResourcesOpen((v) => !v)}
            aria-expanded={resourcesOpen}
            className="w-full glass-panel backdrop-blur-xl bg-white/55 border border-white/60 rounded-[22px] px-6 py-5 flex items-center justify-between shadow-card hover:bg-white/70 transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 flex items-center justify-center shadow-lg">
                <Library className="w-5 h-5 text-white" />
              </span>
              <span className="text-left">
                <span className="block text-lg font-bold text-slate-900">Materials & Resources</span>
                <span className="block text-sm text-slate-500">Everything inside — cue cards, test banks, and your study guide</span>
              </span>
            </span>
            <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${resourcesOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence initial={false}>
            {resourcesOpen && (
              <motion.div
                key="resources"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-3">
                  {SKILLS.map((s) => (
                    <div key={s.key} className="glass-panel backdrop-blur-xl bg-white/55 border border-white/60 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setOpenSkill(openSkill === s.key ? null : s.key)}
                        aria-expanded={openSkill === s.key}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/50 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.accent} flex items-center justify-center`}>
                            <s.icon className="w-4 h-4 text-white" />
                          </span>
                          <span className="font-semibold text-slate-800">{s.title.split(' ')[0]}</span>
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${openSkill === s.key ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence initial={false}>
                        {openSkill === s.key && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            {s.materials.map((m) => (
                              <li key={m} className="px-5 py-2.5 flex items-start gap-2.5 text-sm text-slate-600 border-t border-white/50">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                {m}
                              </li>
                            ))}
                            <li className="px-5 py-3 border-t border-white/50">
                              <button onClick={onSignInClick}
                                className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                                Open in the app <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Study guide */}
                  <div className="glass-panel backdrop-blur-xl bg-white/55 border border-white/60 rounded-2xl p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <GraduationCap className="w-5 h-5 text-brand-600" />
                      <h3 className="font-bold text-slate-900">How to use BandLogic — the 4-step method</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {GUIDE_STEPS.map((g) => (
                        <div key={g.step} className="flex gap-3 p-3 rounded-xl bg-white/50">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-600 to-violet-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{g.step}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{g.title}</p>
                            <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{g.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ===== Bottom CTA ===== */}
        <motion.div
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-24 mb-8 text-center glass-panel backdrop-blur-xl bg-white/55 border border-white/60 rounded-[26px] px-8 py-12 w-full max-w-3xl shadow-card"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Your band score is a <span className="gradient-text">solvable problem.</span>
          </h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">Join students practicing with examiner-calibrated AI across all four skills.</p>
          <button
            onClick={onSignInClick}
            className="mt-8 px-8 py-3.5 text-white rounded-xl font-bold bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.98] inline-flex items-center gap-2"
          >
            Start Practicing Free <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </main>

      <footer className="relative z-10 w-full py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} BandLogic. All rights reserved.</p>
      </footer>
    </div>
  );
}
