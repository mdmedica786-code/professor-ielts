import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { BookOpen, Brain, Sparkles, Plus, Settings as SettingsIcon, ArrowLeft, Check, Loader2, Search, Layers, RotateCcw, Upload } from 'lucide-react';
import useLocalStorage from '../../hooks/useLocalStorage';
import { schedule, previewIntervals, deckStats, isDue, RATING, RATING_LABELS, DEFAULT_SETTINGS } from '../../utils/srs';
import { getManifest, getDeck, saveDeck, saveMediaBatch, updateCardProgress } from '../../utils/deckStorage';
import { parseApkg } from '../../utils/ankiParser';
import AnkiRenderer from './AnkiRenderer';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const GRADE_STYLES = {
  1: 'bg-rose-500 hover:bg-rose-600',
  2: 'bg-amber-500 hover:bg-amber-600',
  3: 'bg-emerald-500 hover:bg-emerald-600',
  4: 'bg-sky-500 hover:bg-sky-600',
};

export default function VocabDeck() {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('home'); // home | study | settings
  const [activeDeck, setActiveDeck] = useState(null);

  const [settings, setSettings] = useLocalStorage('vocab:settings', {
    algorithm: DEFAULT_SETTINGS.algorithm,
    requestRetention: DEFAULT_SETTINGS.requestRetention,
  });

  const effSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);

  const reloadManifest = useCallback(async () => {
    try {
      const data = await getManifest();
      setManifest(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reloadManifest().finally(() => setLoading(false));
  }, [reloadManifest]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const parsed = await parseApkg(file);
      
      const deckId = file.name.replace('.apkg', '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      // Save Media
      await saveMediaBatch(parsed.mediaFiles);
      
      // Save Deck
      await saveDeck(deckId, {
        id: deckId,
        title: file.name.replace('.apkg', ''),
        models: parsed.models,
        cards: parsed.cards.map(c => ({
          ...c,
          id: c.id.toString(),
          state: 'new',
          due: Date.now()
        }))
      });
      
      await reloadManifest();
    } catch (err) {
      console.error(err);
      setError('Failed to import .apkg file. Make sure it is a valid Anki deck.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const startStudy = async (deckId) => {
    setBusy(true);
    try {
      const deck = await getDeck(deckId);
      setActiveDeck(deck);
      setView('study');
    } catch (err) {
      setError('Failed to load deck for studying.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  const shell = (children) => (
    <div
      className="p-4 md:p-6 max-w-2xl mx-auto w-full animate-fade-in"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {error && (
        <div className="mb-3 flex items-center gap-2 bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded-xl">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>Close</button>
        </div>
      )}
      {children}
    </div>
  );

  if (view === 'study' && activeDeck) {
    return shell(
      <StudySession
        deck={activeDeck}
        settings={effSettings}
        onExit={() => { setView('home'); setActiveDeck(null); reloadManifest(); }}
        onGraded={async (cardId, sched) => {
           await updateCardProgress(activeDeck.id, cardId, sched);
        }}
      />
    );
  }

  if (view === 'settings') {
    return shell(<SettingsView settings={settings} setSettings={setSettings} onBack={() => setView('home')} />);
  }

  return shell(
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-slate-900">Offline Anki Decks</h2>
        </div>
        <button onClick={() => setView('settings')} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {manifest.length === 0 ? (
        <div className="card-padded py-12 text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No Decks Found</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
            You are now using the full offline Anki engine. Import a real `.apkg` file to begin, with full support for images, audio, and cloze deletions!
          </p>
          <label className="btn-primary inline-flex items-center justify-center gap-2 py-3 px-6 cursor-pointer">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import .apkg file
            <input type="file" accept=".apkg" className="hidden" onChange={handleImport} disabled={busy} />
          </label>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
               <h3 className="text-sm font-bold text-slate-800">Your Decks</h3>
               <label className="text-xs font-semibold text-brand-600 cursor-pointer flex items-center gap-1">
                 <Upload className="w-3 h-3" /> Import
                 <input type="file" accept=".apkg" className="hidden" onChange={handleImport} disabled={busy} />
               </label>
            </div>
            
            {manifest.map(deck => (
              <div key={deck.id} className="card-padded flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">{deck.title}</div>
                    <div className="text-xs text-slate-500">{deck.count} cards total</div>
                  </div>
                  <button onClick={() => startStudy(deck.id)} disabled={busy} className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Study
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            Data is saved securely offline on your device (IndexedDB). No cloud quota used.
          </p>
        </>
      )}
    </div>
  );
}

// ─── Study session ─────────────────────────────────────────────────
function StudySession({ deck, settings, onExit, onGraded }) {
  const [queue, setQueue] = useState(() => shuffle(deck.cards.filter((c) => isDue(c))));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const touch = useRef(null);

  const current = queue[pos];
  const model = current ? deck.models[current.mid] : null;
  const previews = useMemo(() => (current ? previewIntervals(current, settings) : null), [current, settings]);

  const grade = useCallback((g) => {
    if (!current) return;
    const sched = schedule(current, g, settings);
    onGraded(current.id, sched);
    const updated = { ...current, ...sched };
    setQueue((q) => {
      const nq = [...q];
      nq[pos] = updated;
      if (sched.state === 'learning' || sched.state === 'relearning') nq.push(updated);
      return nq;
    });
    setDone((d) => d + 1);
    setFlipped(false);
    setPos((p) => p + 1);
  }, [current, pos, settings, onGraded]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, grade]);

  if (!current || pos >= queue.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Session complete</h3>
        <p className="text-sm text-slate-500 mb-6">You reviewed {done} card{done !== 1 ? 's' : ''}.</p>
        <button onClick={onExit} className="btn-primary px-6 py-3">Back to decks</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[75vh] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <span className="text-xs text-slate-400 font-medium">{done} done · {Math.max(0, queue.length - pos)} left</span>
      </div>

      <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden relative">
         <AnkiRenderer card={current} model={model} side={flipped ? 'back' : 'front'} />
      </div>

      <div className="flex-shrink-0">
        {!flipped ? (
          <button onClick={() => setFlipped(true)} className="w-full btn-primary py-3.5">Show answer</button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY].map((g) => (
              <button
                key={g}
                onClick={() => grade(g)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-3 text-white font-bold text-sm min-h-[64px] transition-colors ${GRADE_STYLES[g]}`}
              >
                <span>{RATING_LABELS[g]}</span>
                <span className="text-[10px] font-medium opacity-90">{previews?.[g]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings ──────────────────────────────────────────────────────
function SettingsView({ settings, setSettings, onBack }) {
  const algo = settings.algorithm || 'fsrs';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="text-sm font-bold text-slate-800">Study settings</h3>
      </div>
      <div className="card-padded space-y-3">
        <div className="text-xs font-semibold text-slate-700">Scheduling algorithm</div>
        <div className="grid grid-cols-2 gap-2">
          {[['fsrs', 'FSRS', 'Modern (Anki default)'], ['sm2', 'SM-2', 'Classic SuperMemo']].map(([id, name, sub]) => (
            <button
              key={id}
              onClick={() => setSettings({ ...settings, algorithm: id })}
              className={`rounded-xl p-3 text-left border-2 transition-colors ${algo === id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="text-sm font-bold text-slate-800">{name}</div>
              <div className="text-[11px] text-slate-500">{sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
