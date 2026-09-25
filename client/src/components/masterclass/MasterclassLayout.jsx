import React, { useState } from 'react';
import Task1Masterclass from './Task1Masterclass';
import Task2Masterclass from './Task2Masterclass';
import './masterclass.css';
import { PenTool, PenLine } from 'lucide-react';

export default function MasterclassLayout() {
  const [activeTab, setActiveTab] = useState('task1');

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex gap-2 overflow-x-auto shadow-sm sticky top-0 z-20 shrink-0">
        <button
          onClick={() => setActiveTab('task1')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'task1'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <PenLine className="w-4 h-4" />
          Task 1 Masterclass
        </button>
        <button
          onClick={() => setActiveTab('task2')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'task2'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <PenTool className="w-4 h-4" />
          Task 2 Masterclass
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'task1' ? <Task1Masterclass /> : <Task2Masterclass />}
      </div>
    </div>
  );
}
