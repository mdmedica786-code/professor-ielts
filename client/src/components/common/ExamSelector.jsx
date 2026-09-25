import { useApp } from '../../context/AppContext';
import { Sparkles } from 'lucide-react';

export default function ExamSelector({ className = '' }) {
  const { examType, switchExam } = useApp();

  return (
    <div className={`inline-flex items-center p-0.5 rounded-full bg-slate-200/70 border border-slate-300/60 shadow-inner ${className}`}>
      <button
        type="button"
        onClick={() => switchExam('ielts')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          examType === 'ielts'
            ? 'bg-white text-purple-700 shadow-sm scale-[1.02]'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="IELTS Academic & General Practice"
      >
        <span className="text-sm">🇬🇧</span>
        <span>IELTS</span>
      </button>

      <button
        type="button"
        onClick={() => switchExam('goethe')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
          examType === 'goethe'
            ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-sm scale-[1.02]'
            : 'text-slate-600 hover:text-slate-900'
        }`}
        title="Goethe-Zertifikat B1 Deutsch Prüfungstraining"
      >
        <span className="text-sm">🇩🇪</span>
        <span>Goethe B1</span>
        <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
      </button>
    </div>
  );
}
