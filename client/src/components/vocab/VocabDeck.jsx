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

// Tactile "game button" grades: vertical gradient + colored ambient shadow +
// press-down on tap. Reads like physical keys, not flat admin buttons.
const GRADE_STYLES = {
  1: 'bg-gradient-to-b from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30 hover:shadow-rose-500/45',
  2: 'bg-gradient-to-b from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/45',
  3: 'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/45',
  4: 'bg-gradient-to-b from-sky-400 to-sky-600 shadow-lg shadow-sky-500/30 hover:shadow-sky-500/45',
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
              // Stacked-deck illusion: two offset layers peeking out behind the card.
              <div key={deck.id} className="relative group">
                <div aria-hidden="true" className="absolute inset-x-3 -bottom-1.5 h-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm transition-transform duration-300 group-hover:translate-y-0.5" />
                <div aria-hidden="true" className="absolute inset-x-1.5 -bottom-[3px] h-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm transition-transform duration-300 group-hover:translate-y-[1px]" />
                <div className="relative card p-5 flex flex-col gap-3 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-card-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center shadow-lg shadow-violet-500/25 ring-1 ring-white/40 ring-inset shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
                        <Layers className="w-5 h-5 text-white drop-shadow-sm" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 tracking-tight truncate">{deck.title}</div>
                        <div className="text-xs text-slate-500">{deck.count} cards total</div>
                      </div>
                    </div>
                    <button
                      onClick={() => startStudy(deck.id)}
                      disabled={busy}
                      className="py-2 px-4 text-sm rounded-xl font-bold text-white inline-flex items-center gap-2
                                 bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow
                                 ring-1 ring-white/20 ring-inset transition-all duration-200 active:scale-[0.96] shrink-0"
                    >
                      <Sparkles className="w-4 h-4" /> Study
                    </button>
                  </div>
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
      <div className="text-center py-16 animate-pop">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 flex items-center justify-center mx-auto mb-5">
          <Check className="w-9 h-9 text-white drop-shadow-sm" strokeWidth={3} />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">Session complete</h3>
        <p className="text-sm text-slate-500 mb-6">You reviewed {done} card{done !== 1 ? 's' : ''}. Nice work.</p>
        <button
          onClick={onExit}
          className="px-6 py-3 rounded-xl font-bold text-white text-sm bg-gradient-to-r from-brand-600 to-violet-500
                     shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]"
        >
          Back to decks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[75vh] flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 rounded-full bg-white/70 border border-slate-200/70 shadow-sm tabular-nums">
          {done} done · {Math.max(0, queue.length - pos)} left
        </span>
      </div>

      {/* Session progress rail */}
      <div className="h-1 rounded-full bg-slate-200/70 overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-500"
          style={{ width: `${queue.length ? Math.round((done / (done + Math.max(0, queue.length - pos))) * 100) : 0}%` }}
        />
      </div>

      {/* The card itself — elevated, with stacked layers hinting at the deck */}
      <div className="flex-1 relative min-h-0">
        <div aria-hidden="true" className="absolute inset-x-4 -bottom-2 h-6 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm" />
        <div aria-hidden="true" className="absolute inset-x-2 -bottom-1 h-6 rounded-2xl bg-white border border-slate-200/70 shadow-sm" />
        <div
          key={`${current.id}-${flipped}`}
          className="absolute inset-0 bg-white border border-slate-200/70 shadow-card-lg rounded-[22px] overflow-hidden animate-pop"
        >
          <AnkiRenderer card={current} model={model} side={flipped ? 'back' : 'front'} />
        </div>
      </div>

      <div className="flex-shrink-0">
        {!flipped ? (
          <button
            onClick={() => setFlipped(true)}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm
                       bg-gradient-to-b from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25
                       ring-1 ring-white/10 ring-inset transition-all duration-150
                       hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] active:shadow-pressed"
          >
            Show answer
            <span className="ml-2 text-[10px] font-semibold text-white/50 border border-white/20 rounded-md px-1.5 py-0.5 align-middle">space</span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY].map((g) => (
              <button
                key={g}
                onClick={() => grade(g)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-3 text-white font-bold text-sm min-h-[64px]
                            ring-1 ring-white/25 ring-inset transition-all duration-150
                            active:scale-[0.94] active:translate-y-0.5 ${GRADE_STYLES[g]}`}
              >
                <span className="drop-shadow-sm">{RATING_LABELS[g]}</span>
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
