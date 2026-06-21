import { useState } from 'react';
import QuestionBank from './QuestionBank';
import RecorderPanel from './RecorderPanel';
import LiveTutor from './LiveTutor';
import BankColumn from '../common/BankColumn';
import { useApp } from '../../context/AppContext';
import { BookOpen, ChevronDown } from 'lucide-react';

export default function PracticeRoom() {
  const { selectedQuestion } = useApp();
  const [showBankMobile, setShowBankMobile] = useState(false);
  const [mode, setMode] = useState('classic');

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Mobile: collapsible question bank */}
      <div className="md:hidden border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => setShowBankMobile((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={showBankMobile}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 min-w-0">
            <BookOpen className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="truncate">
              {selectedQuestion
                ? `Part ${selectedQuestion.part} · ${selectedQuestion.topic}`
                : 'Choose a question'}
            </span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
              showBankMobile ? 'rotate-180' : ''
            }`}
          />
        </button>
        {showBankMobile && (
          <div className="max-h-[55vh] overflow-y-auto border-t border-slate-100">
            <QuestionBank onPick={() => setShowBankMobile(false)} />
          </div>
        )}
      </div>

      {/* Desktop: collapsible question bank */}
      <BankColumn title="Questions">
        <QuestionBank />
      </BankColumn>

      {/* Recorder + submit OR Live Tutor */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
        
        {/* Mode Toggle */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-slate-100 p-1 rounded-xl inline-flex shadow-sm border border-slate-200">
            <button
              onClick={() => setMode('classic')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'classic'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Classic Recording
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                mode === 'live'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Live Phone Call
              <span className="px-1.5 py-0.5 bg-brand-200 text-brand-800 text-[10px] uppercase tracking-wider rounded-md">New</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {mode === 'classic' ? (
            <RecorderPanel />
          ) : (
            <LiveTutor question={selectedQuestion} />
          )}
        </div>
      </div>
    </div>
  );
}
