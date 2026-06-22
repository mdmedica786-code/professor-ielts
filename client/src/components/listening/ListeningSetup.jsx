import { useState, useEffect } from 'react';
import { Headphones, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { getOfficialListeningTests, getOfficialListeningTest } from '../../api/client';
import ListeningFocusMode from './ListeningFocusMode';

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

  const [mode, setMode] = useState('official'); // 'official' | 'ai'
  const [officialTests, setOfficialTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);

  useEffect(() => {
    if (mode === 'official' && officialTests.length === 0) {
      setLoadingTests(true);
      getOfficialListeningTests()
        .then(res => setOfficialTests(res.data || []))
        .catch(console.error)
        .finally(() => setLoadingTests(false));
    }
  }, [mode]);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (busy) return;
    onGenerate({
      size,
      whichSection: size === 'section' ? whichSection : undefined,
      topic: topic.trim() || undefined,
      difficulty,
    });
  };

  const handleSelectOfficial = async (id) => {
    if (busy) return;
    try {
      const res = await getOfficialListeningTest(id);
      if (res.success) {
        // Bypass typical 'onGenerate' logic by mimicking a successful generation
        // But since onGenerate currently wraps the generation API, we should pass it back.
        // Wait, onGenerate takes config. Let's pass { isOfficial: true, testId: id }
        onGenerate({ isOfficial: true, testId: id });
      }
    } catch (err) {
      console.error(err);
    }
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

      <div className="flex bg-slate-200/60 p-1 rounded-xl mb-6 w-full max-w-sm mx-auto">
        <button
          onClick={() => setMode('official')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
            mode === 'official' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Official 
        </button>
        <button
          onClick={() => setMode('focus')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
            mode === 'focus' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Headphones className="w-4 h-4" /> Focus Mode 
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
            mode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI 
        </button>
      </div>

      {mode === 'focus' ? (
        <ListeningFocusMode onComplete={(answers) => alert(JSON.stringify(answers))} />
      ) : mode === 'official' ? (
        <div className="card-padded">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Select a Test</h2>
          {loadingTests ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : officialTests.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed">
              No official tests have been processed yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {officialTests.map(t => (
                <button
                  key={t.id}
                  disabled={busy}
                  onClick={() => onGenerate({ isOfficial: true, testId: t.id })}
                  className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:border-brand-400 hover:bg-brand-50 transition-colors disabled:opacity-50"
                >
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Test</span>
                  <span className="text-2xl font-black text-slate-800">{t.id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
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
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
            {size === 'full'
              ? 'Full-test audio generation takes 3–6 minutes (script + TTS for all 4 sections). Keep this tab open.'
              : 'Single-section generation takes ~45–120 seconds (script + multi-voice TTS). Keep this tab open.'}
          </p>
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
      )}
    </div>
  );
}
