import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { BookOpen, RotateCcw, Check, X, Loader2, Sparkles, Brain, ArrowRight } from 'lucide-react';

export default function VocabDeck() {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState('browse'); // 'browse' | 'review'

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.get('/vocab')
      .then(res => {
        if (res.data?.success) setCards(res.data.data);
      })
      .catch(err => console.error('Failed to fetch vocab:', err))
      .finally(() => setLoading(false));
  }, [user]);

  // Cards due for review (nextReview <= now)
  const dueCards = cards.filter(c => {
    const nextReview = c.nextReview?._seconds
      ? new Date(c.nextReview._seconds * 1000)
      : new Date(c.nextReview);
    return nextReview <= new Date();
  });

  const reviewDeck = mode === 'review' ? dueCards : cards;
  const currentCard = reviewDeck[currentIndex];

  const handleReview = async (quality) => {
    if (!currentCard) return;
    try {
      await api.post(`/vocab/${currentCard.id}/review`, { quality });
      // Move to next card
      setFlipped(false);
      if (currentIndex < reviewDeck.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Deck complete — refresh
        const res = await api.get('/vocab');
        if (res.data?.success) setCards(res.data.data);
        setCurrentIndex(0);
        setMode('browse');
      }
    } catch (err) {
      console.error('Review error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="p-6 max-w-lg mx-auto text-center animate-fade-in">
        <div className="card-padded py-16">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-violet-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No Vocabulary Cards Yet</h2>
          <p className="text-sm text-slate-500 mb-4">
            When the AI corrects your vocabulary during speaking or writing evaluations,
            the corrections will automatically appear here as flashcards.
          </p>
          <p className="text-xs text-slate-400">
            Try completing a speaking or writing evaluation to get started!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-600" />
          <h2 className="text-base md:text-lg font-bold text-slate-900">Vocabulary Deck</h2>
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
            {cards.length} cards
          </span>
        </div>
        {dueCards.length > 0 && mode === 'browse' && (
          <button
            onClick={() => { setMode('review'); setCurrentIndex(0); setFlipped(false); }}
            className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Review ({dueCards.length} due)
          </button>
        )}
      </div>

      {mode === 'review' && currentCard ? (
        /* ─── Flashcard Review Mode ─── */
        <div className="space-y-4">
          <div className="text-center text-xs text-slate-400 font-medium">
            Card {currentIndex + 1} of {reviewDeck.length}
          </div>

          {/* Card */}
          <div
            onClick={() => setFlipped(!flipped)}
            className="relative cursor-pointer mx-auto w-full max-w-md aspect-[3/2] perspective-1000"
          >
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-preserve-3d ${flipped ? 'rotate-y-180' : ''}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-8 flex flex-col items-center justify-center text-white shadow-xl">
                <span className="text-xs uppercase tracking-wider font-bold opacity-70 mb-4">What should you say instead of...</span>
                <span className="text-2xl md:text-3xl font-extrabold text-center leading-snug">
                  "{currentCard.wrong}"
                </span>
                <span className="text-xs mt-6 opacity-60">Tap to reveal</span>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl bg-white border-2 border-emerald-200 p-8 flex flex-col items-center justify-center shadow-xl">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 mb-4">Correct Answer</span>
                <span className="text-2xl md:text-3xl font-extrabold text-emerald-700 text-center leading-snug">
                  "{currentCard.correct}"
                </span>
                {currentCard.context && (
                  <p className="text-xs text-slate-500 mt-4 text-center italic max-w-xs">
                    "{currentCard.context}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Review buttons (only after flip) */}
          {flipped && (
            <div className="flex items-center justify-center gap-4 animate-fade-in">
              <button
                onClick={() => handleReview(1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-colors"
              >
                <X className="w-4 h-4" />
                Still Learning
              </button>
              <button
                onClick={() => handleReview(4)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm hover:bg-emerald-100 transition-colors"
              >
                <Check className="w-4 h-4" />
                I Knew It!
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ─── Browse Mode ─── */
        <div className="space-y-2">
          {cards.map((card) => {
            const nextReview = card.nextReview?._seconds
              ? new Date(card.nextReview._seconds * 1000)
              : new Date(card.nextReview);
            const isDue = nextReview <= new Date();

            return (
              <div key={card.id} className="card-padded flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDue ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-rose-600 line-through">{card.wrong}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-emerald-700">{card.correct}</span>
                  </div>
                  {card.context && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">"{card.context}"</p>
                  )}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isDue ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {isDue ? 'Due' : `${card.interval}d`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
