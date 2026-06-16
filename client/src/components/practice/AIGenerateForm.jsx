import { useState } from 'react';
import { generatePrompts } from '../../api/client';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AIGenerateForm({ onGenerated }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const result = await generatePrompts(topic.trim());
      if (result.success && result.data) {
        const questions = result.data.map((q, i) => ({
          id: `ai-${Date.now()}-${i}`,
          part: q.part,
          topic: q.topic || topic,
          text: q.text,
          isAI: true,
        }));
        onGenerated(questions);
        setTopic('');
      } else {
        setError('Failed to generate questions');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-padded space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-slate-800">AI Question Generator</h3>
      </div>

      <p className="text-xs text-slate-500">
        Enter a topic and AI will generate 3 realistic IELTS speaking questions (Parts 1, 2, & 3).
      </p>

      <input
        id="ai-topic-input"
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        placeholder="e.g., Space Travel, Social Media, Education..."
        className="input-field"
        disabled={loading}
      />

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        id="ai-generate-btn"
        onClick={handleGenerate}
        disabled={loading || !topic.trim()}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Questions
          </>
        )}
      </button>
    </div>
  );
}
