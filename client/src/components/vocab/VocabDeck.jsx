import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen, Brain, Sparkles, Plus, Settings as SettingsIcon, Trash2, Pencil,
  ArrowLeft, Check, X, Loader2, Search, Wand2, Layers, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import * as vocabApi from '../../api/vocab';
import {
  schedule, previewIntervals, deckStats, isDue,
  RATING, RATING_LABELS, DEFAULT_SETTINGS,
} from '../../utils/srs';

const fetchDeck = async (filename) => {
  const res = await fetch(`/decks/${filename}`);
  if (!res.ok) throw new Error('Failed to load deck file');
  return res.json();
};

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
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState('home'); // home | study | manage | add | generate | settings
  const [settings, setSettings] = useLocalStorage('vocab:settings', {
    algorithm: DEFAULT_SETTINGS.algorithm,
    requestRetention: DEFAULT_SETTINGS.requestRetention,
  });

  const effSettings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...settings }), [settings]);

  const reload = useCallback(async () => {
    try {
      const data = await vocabApi.getVocab();
      setCards(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load your vocabulary.');
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [user, reload]);

  const stats = useMemo(() => deckStats(cards), [cards]);

  const patchLocal = useCallback((id, fields) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }, []);

  const seedDeck = useCallback(async (deck, source) => {
    setBusy(true); setError(null);
    try {
      await vocabApi.createCards(deck.map((c) => ({ ...c, source })));
      await reload();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the deck.');
    } finally { setBusy(false); }
  }, [reload]);

  if (!user) return null;

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
          <X className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {children}
    </div>
  );

  if (view === 'study') {
    return shell(
      <StudySession
        cards={cards}
        settings={effSettings}
        onExit={() => setView('home')}
        onGraded={(id, sched) => { patchLocal(id, sched); vocabApi.updateCard(id, sched).catch(() => {}); }}
      />
    );
  }
  if (view === 'manage') {
    return shell(
      <Manage
        cards={cards}
        onBack={() => setView('home')}
        onAdd={() => setView('add')}
        onSave={async (id, fields) => { patchLocal(id, fields); await vocabApi.updateCard(id, fields).catch(() => {}); }}
        onDelete={async (id) => {
          setCards((prev) => prev.filter((c) => c.id !== id));
          await vocabApi.deleteCard(id).catch(() => {});
        }}
      />
    );
  }
  if (view === 'add') {
    return shell(
      <CardForm
        title="Add a card"
        busy={busy}
        onBack={() => setView('manage')}
        onSubmit={async (card) => {
          setBusy(true);
          try { await vocabApi.createCards([{ ...card, source: 'manual' }]); await reload(); setView('manage'); }
          catch (err) { setError(err.response?.data?.error || 'Could not add the card.'); }
          finally { setBusy(false); }
        }}
      />
    );
  }
  if (view === 'generate') {
    return shell(
      <Generate onBack={() => setView('home')} onAdded={async () => { await reload(); setView('home'); }} setError={setError} />
    );
  }
  if (view === 'decks') {
    return shell(
      <DecksView
        cards={cards}
        busy={busy}
        onBack={() => setView('home')}
        onAdd={(deck, source) => seedDeck(deck, source)}
        onGenerate={() => setView('generate')}
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
          <h2 className="text-lg font-bold text-slate-900">Vocabulary</h2>
        </div>
        <button onClick={() => setView('settings')} className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100" aria-label="Vocabulary settings">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {cards.length === 0 ? (
        <div className="card-padded py-12 text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Build your deck</h3>
          <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
            Study IELTS words with spaced repetition — the same memory algorithm Anki uses.
            Start with a curated deck, generate one with AI, or add your own.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={async () => {
              const data = await fetchDeck('starter.json');
              seedDeck(data, 'starter');
            }} disabled={busy} className="btn-primary inline-flex items-center justify-center gap-2 py-3">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Add IELTS deck
            </button>
            <button onClick={async () => {
              const data = await fetchDeck('collocations.json');
              seedDeck(data, 'collocations');
            }} disabled={busy} className="btn-primary inline-flex items-center justify-center gap-2 py-3">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              Add collocations deck
            </button>
          </div>
          <button onClick={() => setView('generate')} className="mt-2 btn-ghost inline-flex items-center justify-center gap-2 py-2 px-4 border border-slate-200 mx-auto">
            <Wand2 className="w-4 h-4" /> Generate with AI
          </button>
          <button onClick={() => setView('add')} className="mt-3 text-xs text-slate-500 hover:text-slate-700 underline">
            or add a card manually
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Stat label="Due" value={stats.due} tone="amber" />
            <Stat label="New" value={stats.new} tone="violet" />
            <Stat label="Learning" value={stats.learning} tone="rose" />
            <Stat label="Total" value={stats.total} tone="slate" />
          </div>

          <button
            onClick={() => setView('study')}
            disabled={stats.due === 0}
            className="w-full btn-primary py-4 text-base inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            {stats.due > 0 ? `Study ${stats.due} card${stats.due > 1 ? 's' : ''}` : 'All caught up'}
          </button>
          {stats.due === 0 && (
            <p className="text-center text-xs text-slate-400 -mt-2">Come back later — your next reviews are scheduled.</p>
          )}

          <div className="grid grid-cols-4 gap-2">
            <ActionTile icon={BookOpen} label="Decks" onClick={() => setView('decks')} />
            <ActionTile icon={Layers} label="Manage" onClick={() => setView('manage')} />
            <ActionTile icon={Wand2} label="Generate" onClick={() => setView('generate')} />
            <ActionTile icon={Plus} label="Add card" onClick={() => setView('add')} />
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Scheduler: <span className="font-semibold">{effSettings.algorithm === 'fsrs' ? 'FSRS' : 'SM-2'}</span>
            {effSettings.algorithm === 'fsrs' && ` · ${Math.round(effSettings.requestRetention * 100)}% target retention`}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Study session ─────────────────────────────────────────────────
function StudySession({ cards, settings, onExit, onGraded }) {
  const [queue, setQueue] = useState(() => shuffle(cards.filter((c) => isDue(c))));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const touch = useRef(null);

  const current = queue[pos];
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

  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) { setFlipped((f) => !f); return; }
    if (!flipped) { setFlipped(true); return; }
    grade(dx > 0 ? RATING.GOOD : RATING.AGAIN);
  };

  if (!current || pos >= queue.length) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">Session complete</h3>
        <p className="text-sm text-slate-500 mb-6">You reviewed {done} card{done !== 1 ? 's' : ''}. Nice work.</p>
        <button onClick={onExit} className="btn-primary px-6 py-3">Back to deck</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onExit} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Exit
        </button>
        <span className="text-xs text-slate-400 font-medium">{done} done · {Math.max(0, queue.length - pos)} left</span>
      </div>

      <div
        onClick={() => setFlipped((f) => !f)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="relative cursor-pointer mx-auto w-full max-w-md aspect-[3/2] perspective-1000 select-none"
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
          <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-6 flex flex-col items-center justify-center text-white shadow-xl">
            <span className="text-2xl md:text-3xl font-extrabold text-center leading-snug">{current.front}</span>
            {current.tags?.length > 0 && (
              <div className="flex gap-1 mt-4 flex-wrap justify-center">
                {current.tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] bg-white/20 rounded-full px-2 py-0.5">{t}</span>
                ))}
              </div>
            )}
            <span className="text-xs mt-6 opacity-60">Tap to reveal</span>
          </div>
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-white border-2 border-emerald-200 p-6 flex flex-col items-center justify-center shadow-xl overflow-auto">
            <span className="text-xl md:text-2xl font-extrabold text-emerald-700 text-center leading-snug">{current.back}</span>
            {current.example && (
              <p className="text-xs text-slate-500 mt-3 text-center italic">&ldquo;{current.example}&rdquo;</p>
            )}
          </div>
        </div>
      </div>

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
      <p className="text-center text-[10px] text-slate-300">Keys: space = flip, 1-4 = grade, swipe for Again/Good</p>
    </div>
  );
}

// ─── Manage / browse ───────────────────────────────────────────────
function Manage({ cards, onBack, onAdd, onSave, onDelete }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return cards;
    return cards.filter((c) => c.front?.toLowerCase().includes(t) || c.back?.toLowerCase().includes(t));
  }, [q, cards]);

  if (editing) {
    return (
      <CardForm
        title="Edit card"
        initial={editing}
        onBack={() => setEditing(null)}
        onSubmit={async (fields) => { await onSave(editing.id, fields); setEditing(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onAdd} className="btn-primary py-2 px-3 text-sm inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${cards.length} cards`}
          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <div className="space-y-2">
        {filtered.map((card) => (
          <div key={card.id} className="card-padded flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDue(card) ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{card.front}</div>
              <div className="text-xs text-slate-500 truncate">{card.back}</div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">{card.state || 'new'}</span>
            <button onClick={() => setEditing(card)} className="p-1.5 text-slate-400 hover:text-brand-600"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => onDelete(card.id)} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-sm text-slate-400 py-8">No cards match your search.</p>}
      </div>
    </div>
  );
}

// ─── Add / edit form ───────────────────────────────────────────────
function CardForm({ title, initial, onBack, onSubmit, busy }) {
  const [front, setFront] = useState(initial?.front || '');
  const [back, setBack] = useState(initial?.back || '');
  const [example, setExample] = useState(initial?.example || '');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const valid = front.trim() && back.trim();

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      front: front.trim(),
      back: back.trim(),
      example: example.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <Field label="Word / phrase (front)"><input value={front} onChange={(e) => setFront(e.target.value)} className="vocab-input" autoFocus /></Field>
      <Field label="Meaning (back)"><input value={back} onChange={(e) => setBack(e.target.value)} className="vocab-input" /></Field>
      <Field label="Example sentence (optional)"><textarea value={example} onChange={(e) => setExample(e.target.value)} rows={2} className="vocab-input resize-none" /></Field>
      <Field label="Tags (comma-separated, optional)"><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="environment, C1" className="vocab-input" /></Field>
      <button type="submit" disabled={!valid || busy} className="w-full btn-primary py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
      </button>
      <style>{`.vocab-input{width:100%;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.75rem;font-size:0.875rem;outline:none}.vocab-input:focus{box-shadow:0 0 0 2px rgb(99 102 241 / 0.3)}`}</style>
    </form>
  );
}

// ─── AI generate ───────────────────────────────────────────────────
function Generate({ onBack, onAdded, setError }) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const generated = await vocabApi.generateDeck(topic.trim() || 'general IELTS', count);
      setSuggestions(generated);
      setSelected(Object.fromEntries(generated.map((_, i) => [i, true])));
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed. Please try again.');
    } finally { setLoading(false); }
  };

  const addSelected = async () => {
    const chosen = suggestions.filter((_, i) => selected[i]);
    if (chosen.length === 0) return;
    setSaving(true);
    try { await vocabApi.createCards(chosen); await onAdded(); }
    catch (err) { setError(err.response?.data?.error || 'Could not save cards.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="text-sm font-bold text-slate-800 inline-flex items-center gap-1.5"><Wand2 className="w-4 h-4 text-violet-600" /> Generate a deck</h3>
      </div>

      {!suggestions ? (
        <div className="card-padded space-y-3">
          <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. environment, business, health" className="vocab-input" /></Field>
          <Field label={`How many cards: ${count}`}><input type="range" min={5} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full" /></Field>
          <button onClick={run} disabled={loading} className="w-full btn-primary py-3 inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating' : 'Generate'}
          </button>
          <p className="text-[11px] text-slate-400 text-center">Uses one AI credit. Review the cards before adding them.</p>
          <style>{`.vocab-input{width:100%;padding:0.6rem 0.75rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:0.75rem;font-size:0.875rem;outline:none}`}</style>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{Object.values(selected).filter(Boolean).length} of {suggestions.length} selected</p>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {suggestions.map((c, i) => (
              <label key={i} className={`card-padded flex items-start gap-3 cursor-pointer ${selected[i] ? 'ring-2 ring-brand-500/40' : 'opacity-70'}`}>
                <input type="checkbox" checked={!!selected[i]} onChange={(e) => setSelected((s) => ({ ...s, [i]: e.target.checked }))} className="mt-1" />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800">{c.front}</div>
                  <div className="text-xs text-slate-500">{c.back}</div>
                  {c.example && <div className="text-[11px] text-slate-400 italic mt-0.5">{c.example}</div>}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSuggestions(null)} className="btn-ghost border border-slate-200 py-3 flex-1">Regenerate</button>
            <button onClick={addSelected} disabled={saving} className="btn-primary py-3 flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add selected
            </button>
          </div>
        </div>
      )}
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

      {algo === 'fsrs' && (
        <div className="card-padded space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Target retention</span>
            <span className="text-sm font-bold text-brand-600">{Math.round((settings.requestRetention ?? 0.9) * 100)}%</span>
          </div>
          <input
            type="range" min={80} max={97} value={Math.round((settings.requestRetention ?? 0.9) * 100)}
            onChange={(e) => setSettings({ ...settings, requestRetention: Number(e.target.value) / 100 })}
            className="w-full"
          />
          <p className="text-[11px] text-slate-400">Higher = see cards more often and remember more; lower = fewer reviews. 90% is recommended.</p>
        </div>
      )}

      <div className="card-padded text-[11px] text-slate-400 leading-relaxed">
        <RotateCcw className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
        Changing the algorithm affects how future reviews are scheduled. Existing cards keep their progress and adapt on the next review.
      </div>
    </div>
  );
}

// ─── Small presentational helpers ──────────────────────────────────
function Stat({ label, value, tone }) {
  const tones = {
    amber: 'text-amber-600 bg-amber-50',
    violet: 'text-violet-600 bg-violet-50',
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-600 bg-slate-100',
  };
  return (
    <div className={`rounded-xl py-2.5 text-center ${tones[tone]}`}>
      <div className="text-lg font-extrabold leading-none">{value}</div>
      <div className="text-[10px] font-medium mt-1 opacity-80">{label}</div>
    </div>
  );
}

function ActionTile({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="card-padded flex flex-col items-center gap-1.5 py-4 hover:bg-slate-50 transition-colors">
      <Icon className="w-5 h-5 text-brand-600" />
      <span className="text-xs font-semibold text-slate-700">{label}</span>
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      {children}
    </label>
  );
}

// ─── Browse Pre-made Decks ─────────────────────────────────────────
function DecksView({ onBack, onAdd, busy }) {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    fetch('/decks/manifest.json')
      .then(res => res.json())
      .then(data => {
        setManifest(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load decks manifest', err);
        setLoading(false);
      });
  }, []);

  const handleAdd = async (deck) => {
    setAddingId(deck.id);
    try {
      const data = await fetchDeck(deck.file);
      await onAdd(data, deck.id);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h3 className="text-sm font-bold text-slate-800 inline-flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-violet-600" /> Browse Decks</h3>
      </div>
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
        ) : manifest.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-8">No decks available.</p>
        ) : (
          manifest.map(deck => (
            <div key={deck.id} className="card-padded flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800">{deck.title}</div>
                <div className="text-xs text-slate-500">{deck.count} cards</div>
              </div>
              <button onClick={() => handleAdd(deck)} disabled={busy || addingId === deck.id} className="btn-primary py-1.5 px-3 text-xs min-w-[70px]">
                {(busy || addingId) && addingId === deck.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Add all'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
