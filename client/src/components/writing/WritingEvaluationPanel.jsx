import { useState } from 'react';
import WritingReport from './WritingReport';
import WritingCriteria from './WritingCriteria';
import WritingMistakes from './WritingMistakes';
import WritingModelAnswer from './WritingModelAnswer';
import ActionPlan from '../evaluation/ActionPlan';
import { FileText, BarChart3, AlertTriangle, Sparkles, Target, ArrowLeft } from 'lucide-react';

const TABS = [
  { id: 'report', icon: FileText, label: 'Report Card' },
  { id: 'criteria', icon: BarChart3, label: 'Criteria' },
  { id: 'mistakes', icon: AlertTriangle, label: 'Corrections' },
  { id: 'model', icon: Sparkles, label: 'Model Answer' },
  { id: 'plan', icon: Target, label: 'Action Plan' },
];

export default function WritingEvaluationPanel({ evaluation, onBack }) {
  const [activeTab, setActiveTab] = useState('report');
  if (!evaluation) return null;
  const ev = evaluation;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tab Bar */}
      <div className="border-b border-slate-200 bg-white px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="btn-ghost flex items-center gap-1.5 text-xs flex-shrink-0 my-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">New response</span>
            </button>
          )}
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`writing-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id ? 'active' : ''
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'report' && <WritingReport evaluation={ev} />}
          {activeTab === 'criteria' && <WritingCriteria evaluation={ev} />}
          {activeTab === 'mistakes' && <WritingMistakes evaluation={ev} />}
          {activeTab === 'model' && <WritingModelAnswer evaluation={ev} />}
          {activeTab === 'plan' && <ActionPlan evaluation={ev} />}
        </div>
      </div>
    </div>
  );
}
