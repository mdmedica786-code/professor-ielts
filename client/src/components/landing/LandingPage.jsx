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
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
      {/* Navigation Bar */}
      <nav className="w-full px-6 py-4 flex justify-between items-center max-w-7xl mx-auto">
        <BrandWordmark height={32} />
        <button
          onClick={onSignInClick}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
        >
          Sign In
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
            Decode your IELTS.<br className="hidden sm:block"/>
            <span className="text-brand-600">Quantify your progress.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Get instant, examiner-style practice across all four skills—Speaking, Writing, Reading, and Listening. Receive band scores, detailed feedback, and personalized action plans powered by advanced AI.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={onSignInClick}
              className="w-full sm:w-auto px-8 py-3.5 bg-brand-600 text-white rounded-xl font-semibold shadow-sm hover:bg-brand-700 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all flex items-center justify-center gap-2"
            >
              Start Practicing Free
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-slate-700 border border-slate-300 rounded-xl font-semibold shadow-sm hover:bg-slate-50 focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Try as Guest (1 Free Test)'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm text-rose-600 font-medium">{error}</p>
          )}
        </div>

        {/* Feature Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Speaking Coach</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Real-time voice interactions simulating actual IELTS examiners with instant pronunciation and grammar feedback.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <PenTool className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Writing Evaluation</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Upload essays or Task 1 charts. Get detailed breakdown on Task Response, Coherence, Lexical Resource & Grammar.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Reading Tests</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Dynamically generated reading passages with multiple choice and matching questions matching true IELTS difficulty.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Listening Practice</h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed">
              Authentic multi-accent audio generation. Practice specific sections or take a full 40-question mock exam.
            </p>
          </div>
        </div>
        
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} BandLogic. All rights reserved.</p>
      </footer>
    </div>
  );
}
