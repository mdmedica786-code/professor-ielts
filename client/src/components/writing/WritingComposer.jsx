import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { evaluateWriting } from '../../api/client';
import { PenLine, Sparkles, Send, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';

const LOADING_STEPS = [
  'Reading your response...',
  'Checking task achievement...',
  'Assessing coherence & cohesion...',
  'Analyzing vocabulary & grammar...',
  'Drafting your model answer...',
  'Calibrating your IELTS band...',
];

export default function WritingComposer({ task, onEvaluated }) {
  const { ieltsModule, studentName } = useApp();
  const [essay, setEssay] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [busy, setBusy] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState(null);

  // Reset the draft when the task changes.
  useEffect(() => {
    setEssay('');
    setImageBase64(null);
    setError(null);
  }, [task?.id]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStepIndex((p) => (p + 1) % LOADING_STEPS.length), 2200);
    return () => clearInterval(t);
  }, [busy]);

  const wordCount = useMemo(
    () => (essay.trim() ? essay.trim().split(/\s+/).filter(Boolean).length : 0),
    [essay]
  );
  const minWords = task?.task === 1 ? 150 : 250;
  const under = wordCount > 0 && wordCount < minWords;

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageBase64(event.target.result);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!task || !essay.trim() || busy) return;
    setBusy(true);
    setError(null);
    setStepIndex(0);
    try {
      const res = await evaluateWriting({
        module: ieltsModule,
        taskType: task.task,
        prompt: task.text,
        essay,
        studentName,
        imageBase64,
      });
      if (res.success) {
        onEvaluated(res.data, task);
      } else {
        setError(res.error || 'Evaluation failed.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (!task) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card-padded text-center py-12">
          <PenLine className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Select a writing task to begin</p>
          <p className="text-xs text-slate-400 mt-1">Choose from the task bank, or paste your own.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Task prompt */}
      <div className="card-padded animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-brand-500" />
          <span className={`part-tag part-${task.task}`}>Task {task.task}</span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {task.module === 'general' ? 'General Training' : 'Academic'} · {task.topic}
          </span>
        </div>
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{task.text}</p>
        
        {task.task === 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-2">
              <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Reference Image (Optional)
            </label>
            
            {imageBase64 ? (
              <div className="relative inline-block">
                <img src={imageBase64} alt="Task reference" className="max-h-48 rounded-lg border border-slate-200" />
                <button
                  onClick={() => setImageBase64(null)}
                  className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={busy}
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-slate-400" />
                  Upload Chart / Graph
                </label>
                <p className="text-[11px] text-slate-400 mt-2">
                  Upload the chart or diagram for this task so the AI can evaluate your data descriptions accurately.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="card-padded">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
            <PenLine className="w-3.5 h-3.5 text-slate-400" /> Your response
          </label>
          <span
            className={`text-[11px] font-semibold ${
              under ? 'text-rose-500' : wordCount >= minWords ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {wordCount} / {minWords} words
          </span>
        </div>
        <textarea
          id="writing-essay"
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          rows={14}
          placeholder={`Write your Task ${task.task} response here… (aim for at least ${minWords} words)`}
          className="textarea-field text-sm leading-relaxed"
          disabled={busy}
        />
        {under && (
          <p className="text-[11px] text-rose-500 mt-1.5">
            Below the {minWords}-word minimum — under-length responses are capped on Task Achievement.
          </p>
        )}
      </div>

      {/* Submit / loading */}
      {busy ? (
        <div className="card-padded text-center animate-fade-in">
          <Sparkles className="w-8 h-8 text-brand-500 mx-auto mb-3 animate-pulse-slow" />
          <p className="text-sm font-semibold text-slate-800 mb-2">Marking your writing...</p>
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i <= stepIndex ? 'bg-brand-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 h-5">{LOADING_STEPS[stepIndex]}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl">{error}</div>
          )}
          <button
            id="evaluate-writing-btn"
            onClick={handleSubmit}
            disabled={!essay.trim()}
            className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" /> Evaluate Writing
          </button>
        </div>
      )}
    </div>
  );
}
