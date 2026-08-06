import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Brain, Sparkles, ArrowLeft, Check, Loader2,
  Layers, Upload, ChevronRight, Volume2, Star, RefreshCw, AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getManifest, getDeckWithProgress, saveDeck, saveMediaBatch,
  updateCardProgress, getDailyCounters, incrementDailyCounters
} from '../../utils/deckStorage';
import { parseApkg } from '../../utils/ankiParser';
import {
  schedule, previewIntervals, buildSessionQueue, getDeckDueCounts,
  DEFAULT_SETTINGS, RATING, RATING_LABELS
} from '../../utils/srs';
import AnkiRenderer from './AnkiRenderer';

// ─── Built-in deck catalog ──────────────────────────────────────────────────
const BUILTIN_DECKS = [
  {
    serverId: 'cambridge_advanced',
    url: '/decks/cambridge_advanced.apkg',
    title: 'Cambridge Vocabulary for IELTS Advanced',
    desc: '519 notes, 1,038 cards with cloze deletions, phonetics, audio, and type-what-you-hear exercises.',
    filename: 'Cambridge_Vocabulary_for_IELTS_Advanced.apkg',
  },
  {
    serverId: '4000_ielts',
    url: '/decks/4000_ielts.apkg',
    title: '4000 Essential IELTS Words with IPA',
    desc: '4,000 cards with native audio, definitions, IPA transcriptions, and sample sentences.',
    filename: '4000_IELTS_words_with_IPA.apkg',
  },
];

// FSRS settings locked as the algorithm (matches Anki default since v23.10)
const FSRS_SETTINGS = {
  ...DEFAULT_SETTINGS,
  algorithm: 'fsrs',
};

// Grade button appearance
const GRADE_STYLES = {
  1: { bg: 'bg-gradient-to-b from-rose-400 to-rose-600',   shadow: 'shadow-rose-500/30', hover: 'hover:shadow-rose-500/50' },
  2: { bg: 'bg-gradient-to-b from-amber-400 to-amber-600', shadow: 'shadow-amber-500/30', hover: 'hover:shadow-amber-500/50' },
  3: { bg: 'bg-gradient-to-b from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-500/30', hover: 'hover:shadow-emerald-500/50' },
  4: { bg: 'bg-gradient-to-b from-sky-400 to-sky-600',     shadow: 'shadow-sky-500/30', hover: 'hover:shadow-sky-500/50' },
};

// ═══════════════════════════════════════════════════════════════════════════
export default function VocabDeck() {
  const { t } = useTranslation();
  const [manifest, setManifest]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [busyDeckId, setBusyDeckId] = useState(null);    // id of deck currently installing
  const [busyMsg, setBusyMsg]       = useState('');
  const [error, setError]           = useState(null);
  const [view, setView]             = useState('home');  // 'home' | 'study'
  const [activeDeck, setActiveDeck] = useState(null);   // full deck object
  const [deckCounts, setDeckCounts] = useState({});     // { deckId: { new, learning, review } }

  const reloadManifest = useCallback(async () => {
    try {
      const data = await getManifest();
      setManifest(data);
      const counts = {};
      for (const entry of data) {
        try {
          const deck = await getDeckWithProgress(entry.id);
          if (deck) {
            const daily = await getDailyCounters(entry.id);
            counts[entry.id] = getDeckDueCounts(deck.cards, deck.deckConf || {}, daily);
          }
        } catch {}
      }
      setDeckCounts(counts);
    } catch (err) {
      console.error('Error reloading manifest:', err);
    }
  }, []);

  // ── Auto-seed default deck on first load ──────────────────────────────────
  useEffect(() => {
    async function init() {
      setLoading(true);
      const data = await getManifest();

      // If no decks exist yet, auto-install Cambridge Advanced in background
      if (!data || data.length === 0) {
        try {
          setBusyMsg('Setting up default IELTS deck…');
          await installDeckByUrl('/decks/cambridge_advanced.apkg', 'Cambridge_Vocabulary_for_IELTS_Advanced.apkg', 'cambridge_advanced');
        } catch (err) {
          console.warn('Auto-seed fallback to default.apkg:', err);
          try {
            await installDeckByUrl('/default.apkg', 'BandLogic_Default.apkg', 'bandlogic_default');
          } catch (e) {
            console.error('Failed auto-seeding:', e);
          }
        }
      }

      await reloadManifest();
      setLoading(false);
      setBusyMsg('');
    }
    init();
  }, [reloadManifest]);

  // ── Core deck installer function ──────────────────────────────────────────
  const installDeckByUrl = async (url, filename, serverId) => {
    setBusyMsg(`Downloading ${filename.replace('.apkg', '')}…`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download ${filename} (HTTP ${res.status})`);
    
    setBusyMsg(`Extracting cards & media assets…`);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: 'application/octet-stream' });
    const parsed = await parseApkg(file);

    setBusyMsg(`Saving audio & images to local storage…`);
    await saveMediaBatch(parsed.mediaFiles);

    setBusyMsg(`Initializing SRS queue…`);
    for (const pd of parsed.parsedDecks) {
      const deckId = pd.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        || serverId;

      await saveDeck(deckId, {
        id:       deckId,
        title:    pd.name,
        models:   parsed.models,
        deckConf: {
          newPerDay:       pd.newPerDay,
          revPerDay:       pd.revPerDay,
          newOrder:        pd.newOrder,
          learningSteps:   pd.learningSteps,
          relearningSteps: pd.relearningSteps,
        },
        cards: pd.cards.map(c => ({
          ...c,
          id: String(c.id),
        })),
      });
    }

    await reloadManifest();
  };

  const handleInstallClick = async (deckInfo) => {
    setError(null);
    setBusyDeckId(deckInfo.serverId);
    try {
      await installDeckByUrl(deckInfo.url, deckInfo.filename, deckInfo.serverId);
    } catch (err) {
      console.error(err);
      setError(`Could not install ${deckInfo.title}. Make sure the .apkg file is available.`);
    } finally {
      setBusyDeckId(null);
      setBusyMsg('');
    }
  };

  // ── Import custom .apkg ────────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusyDeckId('custom_import');
    setBusyMsg(`Importing "${file.name}"…`);
    try {
      const parsed = await parseApkg(file);
      await saveMediaBatch(parsed.mediaFiles);
      for (const pd of parsed.parsedDecks) {
        const deckId = pd.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          || file.name.replace('.apkg', '').replace(/[^a-z0-9]/g, '_');
        await saveDeck(deckId, {
          id: deckId, title: pd.name, models: parsed.models,
          deckConf: {
            newPerDay: pd.newPerDay, revPerDay: pd.revPerDay,
            newOrder: pd.newOrder, learningSteps: pd.learningSteps,
            relearningSteps: pd.relearningSteps,
          },
          cards: pd.cards.map(c => ({ ...c, id: String(c.id) })),
        });
      }
      await reloadManifest();
    } catch (err) {
      console.error(err);
      setError('Failed to import .apkg file. Make sure it is a valid Anki package.');
    } finally {
      setBusyDeckId(null);
      setBusyMsg('');
      e.target.value = '';
    }
  };

  // ── Start studying a deck ──────────────────────────────────────────────
  const startStudy = async (deckId) => {
    setBusyDeckId(deckId);
    setBusyMsg('Loading deck…');
    try {
      const deck = await getDeckWithProgress(deckId);
      if (!deck) throw new Error('Deck not found');
      setActiveDeck(deck);
      setView('study');
    } catch (err) {
      setError('Failed to load deck: ' + err.message);
    } finally {
      setBusyDeckId(null);
      setBusyMsg('');
    }
  };

  const handleExitStudy = useCallback(async () => {
    setView('home');
    setActiveDeck(null);
    await reloadManifest();
  }, [reloadManifest]);

  // ──────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 animate-pulse" />
          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-white animate-spin" />
        </div>
        {busyMsg && (
          <p className="text-sm text-slate-500 font-medium animate-pulse max-w-xs text-center">{busyMsg}</p>
        )}
      </div>
    );
  }

  if (view === 'study' && activeDeck) {
    return (
      <StudySession
        deck={activeDeck}
        onExit={handleExitStudy}
      />
    );
  }

  const installedServerIds = new Set(manifest.map(m => m.id));

  // ── Home view ──────────────────────────────────────────────────────────
  return (
    <div
      className="p-4 md:p-6 max-w-2xl mx-auto w-full animate-fade-in"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {error && (
        <div className="mb-4 flex items-center gap-2 bg-rose-50 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl border border-rose-200 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button onClick={() => setError(null)} className="font-bold hover:text-rose-900">✕</button>
        </div>
      )}

      {busyMsg && (
        <div className="mb-4 flex items-center gap-2.5 bg-violet-50 text-violet-700 text-xs px-3.5 py-2.5 rounded-xl border border-violet-200 animate-pulse">
          <Loader2 className="w-4 h-4 text-violet-600 animate-spin shrink-0" />
          <span className="font-medium">{busyMsg}</span>
        </div>
      )}

      <header className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {t('vocab.title', 'Vocabulary Decks')}
          </h2>
        </div>
        <label className="text-xs font-bold text-brand-600 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
          <Upload className="w-3.5 h-3.5" />
          Import .apkg
          <input type="file" accept=".apkg" className="hidden" onChange={handleImport} disabled={!!busyDeckId} />
        </label>
      </header>

      {manifest.length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Your Decks</h3>
          <div className="space-y-3">
            {manifest.map(entry => {
              const counts = deckCounts[entry.id] || { new: 0, learning: 0, review: 0 };
              const totalDue = counts.new + counts.learning + counts.review;
              return (
                <DeckCard
                  key={entry.id}
                  entry={entry}
                  counts={counts}
                  totalDue={totalDue}
                  onStudy={() => startStudy(entry.id)}
                  isBusy={busyDeckId === entry.id}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended IELTS Decks Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Official IELTS Decks</h3>
        <div className="grid gap-3">
          {BUILTIN_DECKS.map(deckInfo => {
            const isInstalled = manifest.some(m => m.id.includes(deckInfo.serverId) || m.title.toLowerCase().includes(deckInfo.serverId.replace('_', ' ')));
            const isBusy = busyDeckId === deckInfo.serverId;

            return (
              <div key={deckInfo.serverId} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{deckInfo.title}</span>
                    {isInstalled && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{deckInfo.desc}</p>
                </div>

                {!isInstalled ? (
                  <button
                    onClick={() => handleInstallClick(deckInfo)}
                    disabled={!!busyDeckId}
                    className="px-4 py-2 text-xs rounded-xl font-bold text-white shrink-0
                               bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow
                               ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]
                               inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isBusy ? 'Installing…' : 'Install Deck'}
                  </button>
                ) : (
                  <button
                    onClick={() => startStudy(manifest.find(m => m.id.includes(deckInfo.serverId) || m.title.toLowerCase().includes(deckInfo.serverId.replace('_', ' ')))?.id || deckInfo.serverId)}
                    disabled={!!busyDeckId}
                    className="px-4 py-2 text-xs rounded-xl font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 shrink-0 inline-flex items-center justify-center gap-1"
                  >
                    Study again
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Deck card (home screen) ───────────────────────────────────────────────
function DeckCard({ entry, counts, totalDue, onStudy, isBusy }) {
  return (
    <div className="relative group">
      {/* Stacked deck effect */}
      <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm transition-transform duration-300 group-hover:translate-y-0.5" />
      <div aria-hidden className="absolute inset-x-1.5 -bottom-[3px] h-4 rounded-2xl bg-white border border-slate-200/70 shadow-sm transition-transform duration-300 group-hover:translate-y-[1px]" />

      <div className="relative bg-white border border-slate-200/70 shadow-card rounded-[20px] p-4 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-card-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 grid place-items-center shadow-lg shadow-violet-500/25 ring-1 ring-white/40 ring-inset shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3">
            <Layers className="w-6 h-6 text-white drop-shadow-sm" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 tracking-tight truncate text-sm leading-snug">{entry.title}</div>
            <div className="text-xs text-slate-400 mt-0.5">{entry.count.toLocaleString()} cards total</div>

            {/* Due counts row — matches Anki desktop layout */}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs font-bold text-blue-600">{counts.new} new</span>
              <span className="text-xs font-bold text-orange-500">{counts.learning} learning</span>
              <span className="text-xs font-bold text-green-600">{counts.review} to review</span>
            </div>
          </div>

          <button
            onClick={onStudy}
            disabled={isBusy}
            className="py-2 px-4 text-xs rounded-xl font-bold text-white shrink-0
                       bg-gradient-to-r from-brand-600 to-violet-500 shadow-glow-sm hover:shadow-glow
                       ring-1 ring-white/20 ring-inset transition-all duration-200 active:scale-[0.96]
                       inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : totalDue > 0 ? (
              <><Sparkles className="w-3.5 h-3.5" /> Study</>
            ) : (
              <><Star className="w-3.5 h-3.5" /> Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Study Session
// ═══════════════════════════════════════════════════════════════════════════
function StudySession({ deck, onExit }) {
  const [queue, setQueue]           = useState(null);   // null = loading
  const [pos, setPos]               = useState(0);
  const [flipped, setFlipped]       = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [pendingTyped, setPendingTyped] = useState('');  // typed but not yet submitted
  const [doneToday, setDoneToday]   = useState(0);
  const [newThisSession, setNewThisSession] = useState(0);
  const [revThisSession, setRevThisSession] = useState(0);

  // Build queue on mount
  useEffect(() => {
    async function buildQueue() {
      const daily = await getDailyCounters(deck.id);
      const q = buildSessionQueue(
        deck.cards,
        deck.deckConf || {},
        daily,
        new Date()
      );
      setQueue(q);
    }
    buildQueue();
  }, [deck]);

  const current = queue?.[pos] ?? null;
  const model   = current ? (deck.models[current.mid] || Object.values(deck.models)[0]) : null;

  // Previews for the grade buttons
  const previews = current
    ? previewIntervals(current, { ...FSRS_SETTINGS, ...deck.deckConf })
    : null;

  // Keyboard shortcuts: Space to flip, 1-4 to grade
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.key === ' ')              { e.preventDefault(); if (!flipped) handleFlip(); }
      if (flipped && e.key === '1')   grade(RATING.AGAIN);
      if (flipped && e.key === '2')   grade(RATING.HARD);
      if (flipped && e.key === '3')   grade(RATING.GOOD);
      if (flipped && e.key === '4')   grade(RATING.EASY);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleFlip = useCallback(() => {
    // Carry the pending typed answer to the back
    const el = document.querySelector('#anki-type-answer');
    if (el) setPendingTyped(el.value);
    setFlipped(true);
  }, []);

  const handleTypeAnswer = useCallback((val) => {
    setPendingTyped(val);
    setFlipped(true);
  }, []);

  const grade = useCallback(async (g) => {
    if (!current) return;

    const wasNew = !current.state || current.state === 'new';
    const wasReview = current.state === 'review';

    const sched = schedule(current, g, { ...FSRS_SETTINGS, ...deck.deckConf });
    await updateCardProgress(deck.id, current.id, sched);

    // Increment daily counters
    await incrementDailyCounters(deck.id, {
      newCount: wasNew ? 1 : 0,
      revCount: wasReview ? 1 : 0,
    });

    if (wasNew) setNewThisSession(n => n + 1);
    if (wasReview) setRevThisSession(n => n + 1);

    const updated = { ...current, ...sched };

    setQueue(q => {
      const nq = [...q];
      nq[pos] = updated;
      // Re-insert learning / relearning cards at the right position
      if (sched.state === 'learning' || sched.state === 'relearning') {
        nq.push(updated);
      }
      return nq;
    });

    setDoneToday(d => d + 1);
    setFlipped(false);
    setTypedAnswer('');
    setPendingTyped('');
    setPos(p => p + 1);
  }, [current, pos, deck]);

  // ── Empty / loading state ────────────────────────────────────────────
  if (queue === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  // Queue exhausted
  if (!current || pos >= queue.length) {
    return <SessionDone done={doneToday} newDone={newThisSession} revDone={revThisSession} onExit={onExit} />;
  }

  const totalInSession = queue.length;
  const remaining = Math.max(0, totalInSession - pos);
  const progress = totalInSession > 0 ? Math.round((pos / totalInSession) * 100) : 0;

  // Card type label (new / learning / review)
  const stateLabel = (() => {
    const s = current.state;
    if (!s || s === 'new') return { label: 'New', color: 'text-blue-600 bg-blue-50' };
    if (s === 'learning' || s === 'relearning') return { label: 'Learning', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Review', color: 'text-green-600 bg-green-50' };
  })();

  return (
    <div className="flex flex-col h-[100%] max-h-[100dvh] p-4 md:p-5 max-w-2xl mx-auto w-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stateLabel.color}`}>
            {stateLabel.label}
          </span>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {doneToday} done · {remaining} left
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 relative min-h-0">
        {/* Stacked layers */}
        <div aria-hidden className="absolute inset-x-4 -bottom-2 h-6 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm" />
        <div aria-hidden className="absolute inset-x-2 -bottom-1 h-6 rounded-2xl bg-white border border-slate-200/70 shadow-sm" />
        <div
          key={`${current.id}-${flipped}`}
          className="absolute inset-0 bg-white border border-slate-200/70 shadow-card-lg rounded-[22px] overflow-hidden animate-pop"
        >
          <AnkiRenderer
            card={current}
            model={model}
            side={flipped ? 'back' : 'front'}
            typedAnswer={pendingTyped}
            onTypeAnswer={handleTypeAnswer}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0">
        {!flipped ? (
          <button
            onClick={handleFlip}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm
                       bg-gradient-to-b from-slate-700 to-slate-900 shadow-lg shadow-slate-900/25
                       ring-1 ring-white/10 ring-inset transition-all duration-150
                       hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98]"
          >
            Show answer
            <span className="ml-2 text-[10px] font-semibold text-white/50 border border-white/20 rounded-md px-1.5 py-0.5 align-middle">
              space
            </span>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {[RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY].map(g => {
              const s = GRADE_STYLES[g];
              return (
                <button
                  key={g}
                  onClick={() => grade(g)}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-3 text-white font-bold text-sm min-h-[64px]
                              ring-1 ring-white/25 ring-inset shadow-lg transition-all duration-150
                              active:scale-[0.94] active:translate-y-0.5
                              ${s.bg} ${s.shadow} ${s.hover}`}
                >
                  <span className="drop-shadow-sm">{RATING_LABELS[g]}</span>
                  <span className="text-[10px] font-medium opacity-90">{previews?.[g]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Session Done screen ───────────────────────────────────────────────────
function SessionDone({ done, newDone, revDone, onExit }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-pop">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-100 flex items-center justify-center mb-5">
        <Check className="w-9 h-9 text-white drop-shadow-sm" strokeWidth={3} />
      </div>
      <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-1">
        {done > 0 ? 'Session complete! 🎉' : 'All caught up!'}
      </h3>
      <p className="text-sm text-slate-500 mb-2">
        {done > 0
          ? `You reviewed ${done} card${done !== 1 ? 's' : ''} today.`
          : 'No cards are due right now.'}
      </p>
      {done > 0 && (
        <div className="flex gap-4 mb-6 text-xs font-semibold">
          <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{newDone} new</span>
          <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{revDone} reviewed</span>
        </div>
      )}
      <button
        onClick={onExit}
        className="px-6 py-3 rounded-xl font-bold text-white text-sm
                   bg-gradient-to-r from-brand-600 to-violet-500
                   shadow-glow-sm hover:shadow-glow ring-1 ring-white/20 ring-inset transition-all active:scale-[0.97]"
      >
        Back to decks
      </button>
    </div>
  );
}
