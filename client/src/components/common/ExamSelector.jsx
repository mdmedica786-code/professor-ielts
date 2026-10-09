import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Sparkles, ChevronDown } from 'lucide-react';

const GOETHE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function ExamSelector({ className = '' }) {
  const { examType, switchExam, goetheLevel, setGoetheLevel } = useApp();
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setLevelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-flex items-center p-0.5 rounded-full bg-slate-200/70 border border-slate-300/60 shadow-inner ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setLevelDropdownOpen(false);
          switchExam('ielts');
        }}
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

      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={() => {
            if (examType !== 'goethe') {
              switchExam('goethe');
            } else {
              setLevelDropdownOpen((prev) => !prev);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${
            examType === 'goethe'
              ? 'bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-sm scale-[1.02]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Goethe-Zertifikat Deutsch Prüfungstraining (A1–C1)"
        >
          <span className="text-sm">🇩🇪</span>
          <span>Goethe {examType === 'goethe' ? goetheLevel : ''}</span>
          {examType === 'goethe' ? (
            <ChevronDown className={`w-3 h-3 text-amber-200 transition-transform ${levelDropdownOpen ? 'rotate-180' : ''}`} />
          ) : (
            <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
          )}
        </button>

        {/* Level Dropdown */}
        {levelDropdownOpen && examType === 'goethe' && (
          <div className="absolute top-full mt-2 right-0 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 flex flex-col gap-1 min-w-[130px] animate-scale-in">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Goethe Niveau
            </div>
            {GOETHE_LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setGoetheLevel(lvl);
                  setLevelDropdownOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  goetheLevel === lvl
                    ? 'bg-red-50 text-red-700 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{lvl}</span>
                {goetheLevel === lvl && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
