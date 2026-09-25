import { useApp } from '../../context/AppContext';
import { Sparkles, Menu } from 'lucide-react';
import MiniScoreCard from '../evaluation/MiniScoreCard';
import StudentMenu from './StudentMenu';
import { BrandLogo } from '../common/BrandLogo';
import StreakBar from '../common/StreakBar';
import ExamSelector from '../common/ExamSelector';

const SUBTITLE = {
  speaking: 'AI Speaking Coach',
  writing: 'AI Writing Coach',
  reading: 'AI Reading Coach',
  listening: 'AI Listening Coach',
  // Goethe
  sprechen: 'Goethe B1 · Mündliche Prüfung',
  schreiben: 'Goethe B1 · Schriftlicher Ausdruck',
  lesen: 'Goethe B1 · Leseverstehen',
  hoeren: 'Goethe B1 · Hörverstehen',
  themen: 'Goethe B1 · Themenkatalog C1–C15',
  redemittel: 'Goethe B1 · Redemittel-Bibliothek',
  plan: 'Goethe B1 · 8-Wochen-Trainingsplan',
  rechner: 'Goethe B1 · Punkte- & Notenrechner',
};

export default function Navbar() {
  const { section, currentEvaluation, toggleSidebar, examType } = useApp();
  const defaultSub = examType === 'goethe'
    ? 'Goethe-Zertifikat B1 · Prüfungstraining'
    : 'Decode your IELTS. Quantify your progress.';
  const subtitle = SUBTITLE[section] || defaultSub;

  return (
    <header className="h-14 md:h-16 bg-transparent flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-30 gap-2">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {/* Menu toggle — opens the drawer on mobile, expands/collapses on desktop */}
        <button
          onClick={toggleSidebar}
          className="btn-ghost p-2 flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex flex-shrink-0">
          <BrandLogo size={36} />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight truncate">
            BandLogic
          </h1>
          <p className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-400 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <ExamSelector />
        <StreakBar />
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
