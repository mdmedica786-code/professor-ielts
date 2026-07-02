import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getDeckCards, getCard, toPart2Question, toPart3Question } from '../../api/library';
import { ArrowLeft, BookMarked, Eye, EyeOff, Loader2, Mic, Search } from 'lucide-react';

/**
 * MakkarLibrary — the global cue-card deck, rendered inside QuestionBank.
 * List view -> tap a card -> detail view with "Practice Part 2" and each
 * Part-3 follow-up practicable individually. Selecting anything feeds the
 * exact same selectedQuestion pipeline as preset/AI questions.
 */
export default function MakkarLibrary({ onPick = () => {} }) {
  const { selectedQuestion, setSelectedQuestion } = useApp();
  const [cards, setCards] = useState(null);
  const [deckTitle, setDeckTitle] = useState('Cue Card Library');
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);       // full card in detail view
  const [loadingCard, setLoadingCard] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    let alive = true;
    getDeckCards()
      .then(({ deck, cards }) => {
        if (!alive) return;
        setCards(cards);
        if (deck?.title) setDeckTitle(deck.title);
      })
      .catch(() => alive && setError('Could not load the library. Check your connection and try again.'));
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.prompts || []).some((p) => p.toLowerCase().includes(q))
    );
  }, [cards, query]);

  const openCard = async (cardNumber) => {
    setLoadingCard(true);
    setShowAnswers(false);
    try {
      setOpen(await getCard(cardNumber));
    } catch {
      setError('Could not load that card. Please try again.');
    } finally {
      setLoadingCard(false);
    }
  };

  const pick = (question) => {
    setSelectedQuestion(question);
    onPick();
  };

  // ---------- states ----------
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-slate-500">{error}</p>
        <button
          onClick={() => { setError(null); setCards(null); getDeckCards().then(({ cards }) => setCards(cards)).catch(() => setError('Still unreachable.')); }}
          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!cards || loadingCard) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  // ---------- detail view ----------
  if (open) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setOpen(null)}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All cue cards
        </button>

        {/* Part 2 cue card */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="part-tag part-2">Part 2</span>
              <h3 className="text-sm font-semibold text-slate-900 mt-1.5">{open.title}</h3>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-2">You should say:</p>
          <ul className="mt-1 space-y-0.5">
            {(open.prompts || []).map((p, i) => (
              <li key={i} className="text-xs text-slate-700 leading-relaxed">• {p}</li>
            ))}
          </ul>
          <button
            onClick={() => pick(toPart2Question(open))}
            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
          >
            <Mic className="w-3.5 h-3.5" /> Practice this cue card
          </button>
        </div>

        {/* Model answer (study aid — collapsed by default) */}
        {open.sampleAnswer && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              onClick={() => setShowAnswers((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600"
            >
              <span>Model answer & follow-up answers</span>
              {showAnswers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            {showAnswers && (
              <div className="px-3 pb-3">
                <p className="text-[10px] text-amber-600 mb-2">
                  Use as inspiration — memorized answers lower band scores.
                </p>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {open.sampleAnswer}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Part 3 follow-ups */}
        {(open.followUps || []).length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Part 3 follow-ups ({open.followUps.length})
            </p>
            <div className="space-y-1.5">
              {open.followUps.map((f) => {
                const q = toPart3Question(open, f);
                const isSel = selectedQuestion?.id === q.id;
                return (
                  <div
                    key={f.position}
                    className={`p-2.5 rounded-xl border ${isSel ? 'border-brand-300 bg-brand-50/50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-700 leading-relaxed min-w-0">{f.question}</p>
                      <button
                        onClick={() => pick(q)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                        title="Practice this question"
                      >
                        <Mic className="w-3 h-3" />
                      </button>
                    </div>
                    {showAnswers && f.answer && (
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{f.answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- list view ----------
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <BookMarked className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-slate-600 truncate">{deckTitle}</span>
        <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{filtered.length} cards</span>
      </div>
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cue cards…"
          className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-300"
        />
      </div>
      <div className="space-y-1.5">
        {filtered.map((c) => (
          <button
            key={c.cardNumber}
            onClick={() => openCard(c.cardNumber)}
            className="w-full text-left p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-slate-300 flex-shrink-0 mt-0.5 w-5">
                {c.cardNumber}
              </span>
              <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">{c.title}</p>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-6">No cards match “{query}”.</p>
        )}
      </div>
    </div>
  );
}
