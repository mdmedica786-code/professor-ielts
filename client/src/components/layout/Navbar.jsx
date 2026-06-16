import { useApp } from '../../context/AppContext';
import { GraduationCap, Sparkles, Menu } from 'lucide-react';
import MiniScoreCard from '../evaluation/MiniScoreCard';
import StudentMenu from './StudentMenu';

const SUBTITLE = {
  speaking: 'AI Speaking Coach',
  writing: 'AI Writing Coach',
  reading: 'AI Reading Coach',
};

export default function Navbar() {
  const { section, currentEvaluation, toggleSidebar } = useApp();
  const subtitle = SUBTITLE[section] || 'AI Examiner';

  return (
    <header className="h-14 md:h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-30 gap-2">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Menu toggle — opens the drawer on mobile, expands/collapses on desktop */}
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-2 flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 hidden sm:flex items-center justify-center shadow-sm flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
            Professor IELTS
          </h1>
          <p className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {section === 'speaking' && currentEvaluation && (
          <div className="hidden sm:flex items-center gap-2 animate-fade-in">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <MiniScoreCard score={currentEvaluation.overallBand} label="Overall" />
          </div>
        )}
        <StudentMenu />
      </div>
    </header>
  );
}
