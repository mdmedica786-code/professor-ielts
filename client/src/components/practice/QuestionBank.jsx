import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import presetQuestions from '../../data/presetQuestions';
import QuestionCard from './QuestionCard';
import AIGenerateForm from './AIGenerateForm';
import ManualEntryForm from './ManualEntryForm';
import MakkarLibrary from './MakkarLibrary';
import ViewToggle from '../layout/ViewToggle';
import { BookMarked, BookOpen, Plus, Sparkles } from 'lucide-react';

const PART_FILTERS = [
  { value: 'all', label: 'All Parts' },
  { value: 1, label: 'Part 1' },
  { value: 2, label: 'Part 2' },
  { value: 3, label: 'Part 3' },
];

export default function QuestionBank({ onPick = () => {} }) {
  const { selectedQuestion, setSelectedQuestion } = useApp();
  const [partFilter, setPartFilter] = useState('all');
  const [mode, setMode] = useState('makkar'); // 'makkar' | 'preset' | 'ai' | 'manual'
  const [aiQuestions, setAiQuestions] = useState([]);

  const filteredQuestions = [
    ...presetQuestions,
    ...aiQuestions,
  ].filter((q) => partFilter === 'all' || q.part === partFilter);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Question Bank</h2>
          </div>
          {mode === 'preset' && (
            <span className="text-[10px] text-slate-400 font-medium">
              {filteredQuestions.length} questions
            </span>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-1 mb-3">
          <button
            id="mode-makkar"
            onClick={() => setMode('makkar')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'makkar'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BookMarked className="w-3 h-3" /> Library
          </button>
          <button
            id="mode-preset"
            onClick={() => setMode('preset')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'preset'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Preset
          </button>
          <button
            id="mode-ai"
            onClick={() => setMode('ai')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'ai'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3 h-3" /> AI Generate
          </button>
          <button
            id="mode-manual"
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'manual'
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>

        {/* Part Filter */}
        {mode === 'preset' && (
          <div className="flex gap-1">
            {PART_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setPartFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  partFilter === f.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {mode === 'makkar' && <MakkarLibrary onPick={onPick} />}

        {mode === 'ai' && (
          <AIGenerateForm
            onGenerated={(questions) => {
              setAiQuestions((prev) => [...prev, ...questions]);
              setMode('preset');
            }}
          />
        )}

        {mode === 'manual' && (
          <ManualEntryForm
            onSubmit={(question) => {
              setAiQuestions((prev) => [...prev, question]);
              setSelectedQuestion(question);
              setMode('preset');
              onPick();
            }}
          />
        )}

        {mode === 'preset' && (
          <div className="space-y-2">
            {filteredQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                isSelected={selectedQuestion?.id === q.id}
                onClick={() => {
                  setSelectedQuestion(q);
                  onPick();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
