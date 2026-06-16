import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import ModuleToggle from '../common/ModuleToggle';
import { Sparkles, BookOpenText, Wand2, FileText, Loader2 } from 'lucide-react';

const DIFFICULTIES = [
  { value: '5.0–6.0', label: 'Foundation', sub: 'Band 5–6' },
  { value: '6.0–7.0', label: 'Intermediate', sub: 'Band 6–7' },
  { value: '6.5–7.5', label: 'Advanced', sub: 'Band 6.5–7.5' },
  { value: '7.5–9.0', label: 'Expert', sub: 'Band 7.5–9' },
];
const COUNTS = [6, 8, 10, 12];

export default function ReadingSetup({ onGenerate, busy, error }) {
  const { ieltsModule } = useApp();
  const [mode, setMode] = useState('ai'); // 'ai' | 'byo'
  const [difficulty, setDifficulty] = useState('6.0–7.0');
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(8);
  const [passage, setPassage] = useState('');
  const [questionsHint, setQuestionsHint] = useState('');

  const canGenerate = !busy && (mode === 'ai' || passage.trim().length > 40);

  const submit = () => {
    if (!canGenerate) return;
    onGenerate({
      mode,
      difficulty,
      topic: topic.trim(),
      count,
      passage: mode === 'byo' ? passage.trim() : '',
      questionsHint: mode === 'byo' ? questionsHint.trim() : '',
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-sm mx-auto mb-3">
          <BookOpenText className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Reading practice</h1>
        <p className="text-sm text-slate-500 mt-1">
          Generate an exam-style passage, or bring your own. Answers are auto-marked and converted to a band.
        </p>
      </div>

      {/* Mode */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1">
          <button
            onClick={() => setMode('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" /> AI Practice
          </button>
          <button
            onClick={() => setMode('byo')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'byo' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Your Passage
          </button>
        </div>
      </div>

      <div className="card-padded space-y-5">
        {/* Module */}
        <div>
          <label className="label-caps mb-1.5 block">Module</label>
          <ModuleToggle size="sm" />
        </div>

        {/* Difficulty */}
        <div>
          <label className="label-caps mb-1.5 block">Difficulty</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`rounded-xl border px-2 py-2 text-center transition-all ${
                  difficulty === d.value
                    ? 'border-brand-300 bg-brand-50 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">{d.label}</div>
                <div className="text-[10px] text-slate-400">{d.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* BYO passage */}
        {mode === 'byo' && (
          <div className="space-y-3">
            <div>
              <label className="label-caps mb-1.5 block">Your passage</label>
              <textarea
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                rows={8}
                placeholder="Paste any reading passage here. The AI will write exam-style questions for it…"
                className="textarea-field text-sm leading-relaxed"
              />
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                {passage.trim() ? passage.trim().split(/\s+/).filter(Boolean).length : 0} words
              </p>
            </div>
            <div>
              <label className="label-caps mb-1.5 block">Question hints (optional)</label>
              <input
                value={questionsHint}
                onChange={(e) => setQuestionsHint(e.target.value)}
                placeholder="e.g. focus on the main argument; include some True/False/Not Given"
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* AI topic */}
        {mode === 'ai' && (
          <div>
            <label className="label-caps mb-1.5 block">Topic (optional)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={ieltsModule === 'general' ? 'e.g. workplace safety, library rules' : 'e.g. coral reefs, the history of tea'}
              className="input-field"
            />
          </div>
        )}

        {/* Count */}
        <div>
          <label className="label-caps mb-1.5 block">Questions</label>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  count === c
                    ? 'bg-brand-50 border-brand-300 text-brand-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl">{error}</div>}

        <button
          id="reading-generate-btn"
          onClick={submit}
          disabled={!canGenerate}
          className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating passage…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {mode === 'byo' ? 'Create questions' : 'Generate passage'}
            </>
          )}
        </button>
        {mode === 'byo' && passage.trim().length <= 40 && (
          <p className="text-[10px] text-slate-400 text-center -mt-2">
            Paste a longer passage (40+ words) to generate questions.
          </p>
        )}
      </div>
    </div>
  );
}
