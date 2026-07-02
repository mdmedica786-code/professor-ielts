import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import WritingTaskBank from './WritingTaskBank';
import WritingComposer from './WritingComposer';
import WritingEvaluationPanel from './WritingEvaluationPanel';
import BankColumn from '../common/BankColumn';
import { PenLine, ChevronDown } from 'lucide-react';
import WritingFullTest from './WritingFullTest';

export default function WritingRoom() {
  const { ieltsModule, selectedWritingTask, saveEvaluation, testMode } = useApp();
  const [showBankMobile, setShowBankMobile] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  if (testMode === 'full') {
    return <WritingFullTest />;
  }

  const handleEvaluated = (data, task) => {
    setEvaluation(data);
    saveEvaluation(data, { kind: 'writing', module: ieltsModule, question: task });
  };

  if (evaluation) {
    return <WritingEvaluationPanel evaluation={evaluation} onBack={() => setEvaluation(null)} />;
  }

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Mobile: collapsible task bank */}
      <div className="md:hidden border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={() => setShowBankMobile((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={showBankMobile}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800 min-w-0">
            <PenLine className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span className="truncate">
              {selectedWritingTask
                ? `Task ${selectedWritingTask.task} · ${selectedWritingTask.title}`
                : 'Choose a task'}
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
            <WritingTaskBank onPick={() => setShowBankMobile(false)} />
          </div>
        )}
      </div>

      {/* Desktop: collapsible task bank */}
      <BankColumn title="Tasks">
        <WritingTaskBank />
      </BankColumn>

      {/* Composer */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <WritingComposer task={selectedWritingTask} onEvaluated={handleEvaluated} />
      </div>
    </div>
  );
}
