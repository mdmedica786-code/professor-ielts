import { useState } from 'react';
import QuestionBank from './QuestionBank';
import RecorderPanel from './RecorderPanel';
import BankColumn from '../common/BankColumn';
import { useApp } from '../../context/AppContext';
import { BookOpen, ChevronDown } from 'lucide-react';

export default function PracticeRoom() {
  const { selectedQuestion } = useApp();
  const [showBankMobile, setShowBankMobile] = useState(false);

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

      {/* Recorder + submit */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <RecorderPanel />
      </div>
    </div>
  );
}
