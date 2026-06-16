import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import writingTasks from '../../data/writingTasks';
import WritingTaskCard from './WritingTaskCard';
import ModuleToggle from '../common/ModuleToggle';
import { PenLine, BookOpen, Plus } from 'lucide-react';

const TASK_FILTERS = [
  { value: 'all', label: 'All Tasks' },
  { value: 1, label: 'Task 1' },
  { value: 2, label: 'Task 2' },
];

export default function WritingTaskBank({ onPick = () => {} }) {
  const { ieltsModule, selectedWritingTask, setSelectedWritingTask } = useApp();
  const [taskFilter, setTaskFilter] = useState('all');
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'

  // Custom-task form state
  const [customTask, setCustomTask] = useState(2);
  const [customText, setCustomText] = useState('');

  const filtered = writingTasks.filter(
    (t) => t.module === ieltsModule && (taskFilter === 'all' || t.task === taskFilter)
  );

  const submitCustom = () => {
    if (!customText.trim()) return;
    setSelectedWritingTask({
      id: `custom-${Date.now()}`,
      module: ieltsModule,
      task: customTask,
      topic: 'Custom',
      title: 'Custom task',
      text: customText.trim(),
      custom: true,
    });
    setMode('preset');
    onPick();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-slate-900">Task Bank</h2>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">{filtered.length} tasks</span>
        </div>

        {/* Module */}
        <div className="mb-3">
          <ModuleToggle size="sm" />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setMode('preset')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'preset' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Preset
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'custom' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>

        {/* Task filter */}
        {mode === 'preset' && (
          <div className="flex gap-1">
            {TASK_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTaskFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  taskFilter === f.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
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
        {mode === 'preset' && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-8">
                No preset tasks for this filter.
              </p>
            )}
            {filtered.map((t) => (
              <WritingTaskCard
                key={t.id}
                task={t}
                isSelected={selectedWritingTask?.id === t.id}
                onClick={() => {
                  setSelectedWritingTask(t);
                  onPick();
                }}
              />
            ))}
          </div>
        )}

        {mode === 'custom' && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {[1, 2].map((t) => (
                <button
                  key={t}
                  onClick={() => setCustomTask(t)}
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    customTask === t
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Task {t}
                </button>
              ))}
            </div>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={8}
              placeholder={`Paste any IELTS ${ieltsModule === 'general' ? 'General Training' : 'Academic'} Task ${customTask} prompt here…`}
              className="textarea-field text-xs leading-relaxed"
            />
            <button
              onClick={submitCustom}
              disabled={!customText.trim()}
              className="btn-primary w-full py-2 text-sm"
            >
              Use this task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
