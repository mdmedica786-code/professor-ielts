import { BrandWordmark } from '../common/BrandLogo';
import { Loader2, ArrowRight, BookOpen, Mic, PenTool, Headphones } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';

export default function LandingPage({ onSignInClick }) {
  const { signInAnonymously } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signInAnonymously();
    } catch (err) {
      setLoading(false);
      setError('Failed to start guest session. Please try again.');
    }
  };

  return (
    <div className="min-h-[100dvh] app-canvas flex flex-col font-sans">
      {/* Floating frosted navigation */}
      <div className="sticky top-0 z-40 px-4 pt-3">
        <nav className="glass-panel rounded-2xl w-full px-4 sm:px-6 py-3 flex justify-between items-center max-w-7xl mx-auto">
          <BrandWordmark height={32} />
          <button
            onClick={onSignInClick}
            className="text-sm font-bold text-white px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]"
          >
            Sign In
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto animate-float-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/70 shadow-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-600">Examiner-calibrated AI · All four IELTS skills</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Decode your IELTS.<br className="hidden sm:block"/>
            <span className="gradient-text">Quantify your progress.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Get instant, examiner-style practice across all four skills—Speaking, Writing, Reading, and Listening. Receive band scores, detailed feedback, and personalized action plans powered by advanced AI.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
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
              className="w-full sm:w-auto px-8 py-3.5 bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-200 rounded-xl font-semibold shadow-card hover:bg-white hover:border-slate-300 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Try as Guest (1 Free Test)'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-rose-600 font-medium">{error}</p>
          )}
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {[
            {
              icon: Mic,
              accent: 'from-violet-500 to-purple-700',
              glow: 'hover:shadow-[0_24px_48px_-18px_rgba(139,92,246,0.35)]',
              title: 'Speaking Coach',
              blurb: 'Real-time voice interactions simulating actual IELTS examiners with instant pronunciation and grammar feedback.',
            },
            {
              icon: PenTool,
              accent: 'from-sky-500 to-blue-700',
              glow: 'hover:shadow-[0_24px_48px_-18px_rgba(14,165,233,0.35)]',
              title: 'Writing Evaluation',
              blurb: 'Upload essays or Task 1 charts. Get detailed breakdown on Task Response, Coherence, Lexical Resource & Grammar.',
            },
            {
              icon: BookOpen,
              accent: 'from-emerald-500 to-teal-700',
              glow: 'hover:shadow-[0_24px_48px_-18px_rgba(16,185,129,0.35)]',
              title: 'Reading Tests',
              blurb: 'Dynamically generated reading passages with multiple choice and matching questions matching true IELTS difficulty.',
            },
            {
              icon: Headphones,
              accent: 'from-amber-500 to-orange-700',
              glow: 'hover:shadow-[0_24px_48px_-18px_rgba(245,158,11,0.35)]',
              title: 'Listening Practice',
              blurb: 'Authentic multi-accent audio generation. Practice specific sections or take a full 40-question mock exam.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`group relative overflow-hidden p-6 rounded-[22px] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/50 shadow-card transition-all duration-300 hover:-translate-y-1 ${f.glow}`}
            >
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br ${f.accent} opacity-[0.07] blur-2xl`}
              />
              <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${f.accent} flex items-center justify-center mb-4 shadow-lg ring-1 ring-white/40 ring-inset transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
                <f.icon className="w-6 h-6 text-white drop-shadow-sm" />
              </div>
              <h3 className="relative text-lg font-bold tracking-tight text-slate-900">{f.title}</h3>
              <p className="relative mt-2 text-slate-500 text-sm leading-relaxed">{f.blurb}</p>
            </div>
          ))}
        </div>
        
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} BandLogic. All rights reserved.</p>
      </footer>
    </div>
  );
}
