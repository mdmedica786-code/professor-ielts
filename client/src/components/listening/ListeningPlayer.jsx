import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Headphones, ChevronRight, AlertTriangle } from 'lucide-react';

/**
 * Sequenced multi-voice playback for a Listening test.
 *
 * IELTS audio is heard ONCE — we expose the controls of a real test player:
 *   - Auto-advance through utterances (no per-clip skip-ahead).
 *   - Pause / resume on the whole stream.
 *   - When the final utterance ends, fire onComplete so the parent can move
 *     the user into review/transfer mode.
 *
 * Audio is delivered as base64 mp3 per utterance. We build object URLs lazily
 * (one per utterance) and revoke them on unmount to avoid memory leaks.
 */
export default function ListeningPlayer({ sections, onComplete }) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [uttIdx, setUttIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const audioRef = useRef(null);

  // Build {sectionIdx -> [objectUrl per utterance]} once. base64 -> Blob -> URL.
  const audioUrls = useMemo(() => {
    return sections.map((section) =>
      section.utterances.map((u) => {
        if (u.audioUrl) return u.audioUrl;
        if (!u.audioBase64) return null;
        try {
          const bin = atob(u.audioBase64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const blob = new Blob([bytes], { type: u.mime || 'audio/mpeg' });
          return URL.createObjectURL(blob);
        } catch (err) {
          console.warn('Listening: failed to decode audio for utterance', u.id, err);
          return null;
        }
      })
    );
    // sections is stable for the life of the test — generated once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections]);

  // Revoke all object URLs on unmount.
  useEffect(() => {
    return () => {
      audioUrls.forEach((arr) => arr.forEach((u) => u && URL.revokeObjectURL(u)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const section = sections[sectionIdx];
  const utterance = section?.utterances?.[uttIdx];
  const currentUrl = audioUrls[sectionIdx]?.[uttIdx] || null;

  // Whenever the (section, uttIdx) changes, load the audio source. If we were
  // already playing, kick off the new clip automatically.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!currentUrl) {
      // Failed clip — skip to next on next tick.
      const t = setTimeout(() => advance(), 600);
      return () => clearTimeout(t);
    }
    el.src = currentUrl;
    if (playing) {
      el.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUrl]);

  const advance = () => {
    // Move to next utterance, or next section, or fire onComplete.
    const lastUttInSection = uttIdx >= (section?.utterances?.length || 0) - 1;
    const lastSection = sectionIdx >= sections.length - 1;
    if (!lastUttInSection) {
      setUttIdx((i) => i + 1);
    } else if (!lastSection) {
      setSectionIdx((i) => i + 1);
      setUttIdx(0);
    } else {
      setPlaying(false);
      onComplete?.();
    }
  };

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      setStarted(true);
      try {
        await el.play();
        setPlaying(true);
      } catch (err) {
        console.warn('Listening: play() rejected', err);
      }
    }
  };

  const totalUtts = section?.utterances?.length || 0;
  const sectionProgress = totalUtts ? Math.round(((uttIdx + 1) / totalUtts) * 100) : 0;

  const audioMissing = utterance && !currentUrl;

  return (
    <div className="card-padded">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-sm">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">
            Section {section?.number} of {sections.length}
          </div>
          <div className="text-sm font-bold text-slate-900 truncate">{section?.title}</div>
        </div>
      </div>

      {/* Scenario context */}
      {section?.context && (
        <div className="text-[12px] text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 mb-3">
          {section.context}
        </div>
      )}

      {/* Speakers legend */}
      {section?.speakers?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {section.speakers.map((sp) => (
            <span
              key={sp.label + sp.voice}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800"
              title={`Voice: ${sp.voice}`}
            >
              {sp.label}
            </span>
          ))}
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-300"
          style={{ width: `${sectionProgress}%` }}
        />
      </div>

      {/* Current speaker */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs">
          <span className="text-slate-400">Now speaking: </span>
          <span className="font-semibold text-slate-800">
            {utterance?.speaker || '—'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          {uttIdx + 1} / {totalUtts}
        </div>
      </div>

      {/* Audio-missing graceful fallback */}
      {audioMissing && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-800 flex gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold mb-0.5">Audio unavailable for this line</div>
            {utterance?.text ? (
              <div className="text-amber-700">{utterance.text}</div>
            ) : (
              <div className="text-amber-700">Continuing to next line shortly…</div>
            )}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={togglePlay}
          disabled={!currentUrl}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <>
              <Pause className="w-4 h-4" /> Pause
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {started ? 'Resume' : 'Start listening'}
            </>
          )}
        </button>

        <button
          onClick={() => onComplete?.()}
          className="btn-ghost text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 ml-auto"
          title="End audio early (you still need to submit answers)"
        >
          End audio
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        In a real IELTS test the recording is played once and you write while you listen — pausing is for practice only.
      </p>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={advance}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        className="hidden"
      />
    </div>
  );
}
