import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function ManualEntryForm({ onSubmit }) {
  const [text, setText] = useState('');
  const [part, setPart] = useState(1);
  const [topic, setTopic] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit({
      id: `manual-${Date.now()}`,
      part,
      topic: topic.trim() || 'Custom',
      text: text.trim(),
      isManual: true,
    });
    setText('');
    setTopic('');
  };

  return (
    <div className="card-padded space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Plus className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-slate-800">Custom Question</h3>
      </div>

      <div className="flex gap-2">
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setPart(p)}
            className={`part-tag part-${p} cursor-pointer transition-all ${
              part === p ? 'ring-2 ring-offset-1 ring-slate-300' : 'opacity-60'
            }`}
          >
            Part {p}
          </button>
        ))}
      </div>

      <input
        id="manual-topic"
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (optional)"
        className="input-field"
      />

      <textarea
        id="manual-question-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your IELTS speaking question..."
        rows={4}
        className="textarea-field"
      />

      <button
        id="manual-add-btn"
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Question
      </button>
    </div>
  );
}
