import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ReportCard from './ReportCard';
import CriteriaBreakdown from './CriteriaBreakdown';
import MistakeLog from './MistakeLog';
import ActionPlan from './ActionPlan';
import TranscriptView from './TranscriptView';
import FluencyView from './FluencyView';
import { FileText, BarChart3, AlertTriangle, Target, MessageSquare, Activity } from 'lucide-react';

const TABS = [
  { id: 'report', icon: FileText, label: 'Report Card' },
  { id: 'criteria', icon: BarChart3, label: 'Criteria' },
  { id: 'mistakes', icon: AlertTriangle, label: 'Mistakes' },
  { id: 'plan', icon: Target, label: 'Action Plan' },
  { id: 'transcript', icon: MessageSquare, label: 'Transcript' },
  { id: 'fluency', icon: Activity, label: 'Fluency' },
];

export default function EvaluationPanel() {
  const { currentEvaluation } = useApp();
  const [activeTab, setActiveTab] = useState('report');

  if (!currentEvaluation) return null;
  const ev = currentEvaluation;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tab Bar */}
      <div className="border-b border-slate-200 bg-white px-3 md:px-6 flex-shrink-0">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
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

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'report' && <ReportCard evaluation={ev} />}
          {activeTab === 'criteria' && <CriteriaBreakdown evaluation={ev} />}
          {activeTab === 'mistakes' && <MistakeLog evaluation={ev} />}
          {activeTab === 'plan' && <ActionPlan evaluation={ev} />}
          {activeTab === 'transcript' && <TranscriptView evaluation={ev} />}
          {activeTab === 'fluency' && <FluencyView evaluation={ev} />}
        </div>
      </div>
    </div>
  );
}
