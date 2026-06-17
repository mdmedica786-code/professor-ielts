import { useState } from 'react';
import { Headphones, Loader2, Sparkles } from 'lucide-react';

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy (5.0–6.0)', value: '5.0–6.0' },
  { id: 'medium', label: 'Medium (6.0–7.0)', value: '6.0–7.0' },
  { id: 'hard', label: 'Hard (7.5–9.0)', value: '7.5–9.0' },
];

const SECTION_OPTIONS = [
  { id: 1, label: 'Section 1', sub: 'Everyday conversation — form completion' },
  { id: 2, label: 'Section 2', sub: 'Everyday monologue — notes / map / MCQ' },
  { id: 3, label: 'Section 3', sub: 'Academic discussion — MCQ / matching' },
  { id: 4, label: 'Section 4', sub: 'Academic lecture — note completion' },
];

export default function ListeningSetup({ onGenerate, busy, error }) {
  const [size, setSize] = useState('section'); // 'full' | 'section'
  const [whichSection, setWhichSection] = useState(1);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('6.0–7.0');

  const submit = (e) => {
    e?.preventDefault?.();
    if (busy) return;
    onGenerate({
      size,
      whichSection: size === 'section' ? whichSection : undefined,
      topic: topic.trim() || undefined,
      difficulty,
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-sm">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">IELTS Listening Practice</h1>
          <p className="text-xs text-slate-500">
            Multi-voice AI audio. Played once — just like the real test. Auto-marked on the official band scale.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="card-padded space-y-6">
        {/* Test size */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Test size
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSize('section')}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                size === 'section'
                  ? 'border-brand-500 bg-brand-50/60'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-semibold text-slate-900">Single section</div>
              <div className="text-[11px] text-slate-500 mt-0.5">10 questions, ~5 min audio</div>
            </button>
            <button
              type="button"
              onClick={() => setSize('full')}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                size === 'full'
                  ? 'border-brand-500 bg-brand-50/60'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-sm font-semibold text-slate-900">Full test</div>
              <div className="text-[11px] text-slate-500 mt-0.5">4 sections, 40 questions</div>
            </button>
          </div>
          {size === 'full' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
              Full-test audio generation can take 2–4 minutes (TTS synthesis runs server-side).
            </p>
          )}
        </div>

        {/* Section selector — only when single section */}
        {size === 'section' && (
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
              Which section
            </div>
            <div className="grid gap-2">
              {SECTION_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setWhichSection(s.id)}
                  className={`text-left p-2.5 rounded-xl border-2 transition-all ${
                    whichSection === s.id
                      ? 'border-brand-500 bg-brand-50/60'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
            Difficulty
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDifficulty(d.value)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  difficulty === d.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide block">
            Topic / scenario <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              size === 'full'
                ? 'e.g. university campus tour for Section 2'
                : whichSection === 1
                  ? 'e.g. booking a swimming class'
                  : whichSection === 2
                    ? 'e.g. introduction to a city library'
                    : whichSection === 3
                      ? 'e.g. tutorial on a marketing project'
                      : 'e.g. lecture on renewable energy'
            }
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
          />
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 text-xs px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Building your test… (this can take a minute)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate listening test
            </>
          )}
        </button>
      </form>
    </div>
  );
}
