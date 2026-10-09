import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Lock, SkipForward, Headphones } from 'lucide-react';
import { getAudioContext, playGong } from './examSounds';
import { formatClock } from './useCountdown';

function base64ToBlobUrl(base64, mimeType) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

/** Browser speech fallback when the server could not render audio. */
function speakUtterances(utterances, level) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth || !utterances?.length) return resolve();
    synth.cancel();
    let i = 0;
    const next = () => {
      if (i >= utterances.length) return resolve();
      const u = new SpeechSynthesisUtterance(utterances[i++].text);
      u.lang = 'de-DE';
      u.rate = level === 'A2' ? 0.9 : 1;
      u.onend = () => setTimeout(next, 600);
      u.onerror = () => resolve();
      synth.speak(u);
    };
    next();
  });
}

/**
 * Plays the server-rendered Hörtext (base64 mp3) like in the exam room:
 * announcement gong, strict maxPlays, a timed pause between plays
 * ("Sie haben 30 Sekunden Zeit …") and a live level visualizer.
 * Pausing mid-play is only allowed in Lernmodus. Remount (key) per Hörtext;
 * pass initialPlaysUsed so leaving and re-entering a Teil cannot reset the count.
 */
export default function AudioPlayerWithLimits({
  audioData,
  mimeType = 'audio/mpeg',
  maxPlays = 1,
  isLearn = false,
  utterances = [],
  level = 'B1',
  pauseSeconds = 30,
  initialPlaysUsed = 0,
  onStatusChange,
}) {
  // Plays already used survive remounts (tab switches) via initialPlaysUsed.
  const [phase, setPhase] = useState(initialPlaysUsed >= maxPlays ? 'done' : 'ready'); // ready | gong | playing | paused | between | done
  const [playsUsed, setPlaysUsed] = useState(initialPlaysUsed);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [vizFallback, setVizFallback] = useState(false);

  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const playsRef = useRef(initialPlaysUsed);
  const statusRef = useRef(onStatusChange);

  useEffect(() => {
    statusRef.current = onStatusChange;
  }, [onStatusChange]);

  const stopViz = () => cancelAnimationFrame(rafRef.current);

  const drawViz = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;
    const g = canvas.getContext('2d');
    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const { width, height } = canvas;
      g.clearRect(0, 0, width, height);
      const bars = 32;
      const barW = width / bars;
      for (let i = 0; i < bars; i++) {
        const v = data[Math.floor((i / bars) * data.length * 0.75)] / 255;
        const h = Math.max(3, v * height);
        g.fillStyle = `rgba(52, 211, 153, ${0.35 + v * 0.65})`;
        g.fillRect(i * barW + 2, (height - h) / 2, barW - 4, h);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const finishPlay = () => {
    stopViz();
    const used = playsRef.current + 1;
    playsRef.current = used;
    setPlaysUsed(used);
    setProgress(0);
    setCountdown(pauseSeconds);
    setPhase('between');
    statusRef.current?.({ playsUsed: used, playing: false });
  };
  const finishRef = useRef(finishPlay);
  useEffect(() => {
    finishRef.current = finishPlay;
  });

  useEffect(() => {
    if (!audioData) return undefined;
    const src = base64ToBlobUrl(audioData, mimeType);
    const a = new Audio(src);
    a.preload = 'auto';
    a.onloadedmetadata = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.ontimeupdate = () => setProgress(a.currentTime);
    a.onended = () => finishRef.current();
    audioRef.current = a;
    analyserRef.current = null;
    return () => {
      a.pause();
      a.removeAttribute('src');
      audioRef.current = null;
      cancelAnimationFrame(rafRef.current);
      URL.revokeObjectURL(src);
    };
  }, [audioData, mimeType]);

  useEffect(
    () => () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    },
    []
  );

  const ensureAnalyser = () => {
    if (analyserRef.current || !audioRef.current) return;
    try {
      const c = getAudioContext();
      const source = c.createMediaElementSource(audioRef.current);
      const analyser = c.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(c.destination);
      analyserRef.current = analyser;
    } catch {
      setVizFallback(true);
    }
  };

  const startPlay = async (withGong) => {
    if (playsRef.current >= maxPlays) return;
    setPhase('gong');
    statusRef.current?.({ playsUsed: playsRef.current, playing: true });
    if (withGong) await playGong();

    const a = audioRef.current;
    if (a) {
      ensureAnalyser();
      a.currentTime = 0;
      try {
        await a.play();
        setPhase('playing');
        drawViz();
      } catch {
        // Autoplay blocked: let the candidate press play again without losing a Durchgang.
        setPhase('ready');
        statusRef.current?.({ playsUsed: playsRef.current, playing: false });
      }
    } else {
      setPhase('playing');
      setVizFallback(true);
      await speakUtterances(utterances, level);
      finishRef.current();
    }
  };

  // Pause between plays (and review time after the last one).
  useEffect(() => {
    if (phase !== 'between') return undefined;
    if (countdown <= 0) {
      if (playsRef.current < maxPlays) startPlay(false);
      else setPhase('done');
      return undefined;
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // startPlay is stable enough for this timer; re-running on its identity would restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown, maxPlays]);

  const togglePause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (phase === 'playing') {
      a.pause();
      stopViz();
      setPhase('paused');
    } else if (phase === 'paused') {
      a.play().then(() => {
        setPhase('playing');
        drawViz();
      });
    }
  };

  const playsLeft = maxPlays - playsUsed;
  const isActive = phase === 'gong' || phase === 'playing' || phase === 'paused';
  const statusText =
    phase === 'gong'
      ? 'Achtung, gleich beginnt der Hörtext …'
      : phase === 'playing'
      ? `Durchgang ${playsUsed + 1} von ${maxPlays}`
      : phase === 'paused'
      ? 'Pausiert (nur im Lernmodus)'
      : phase === 'between'
      ? playsLeft > 0
        ? `Pause — Sie haben ${countdown} Sekunden Zeit. Danach hören Sie den Text noch einmal.`
        : `Sie haben jetzt ${countdown} Sekunden Zeit, Ihre Lösungen zu überprüfen.`
      : phase === 'done'
      ? `Sie haben den Text ${maxPlays === 1 ? 'einmal' : `${maxPlays}-mal`} gehört.`
      : `Sie hören den Text ${maxPlays === 1 ? 'einmal' : 'zweimal'}. Drücken Sie auf Start, wenn Sie bereit sind.`;

  return (
    <div className="rounded-2xl bg-slate-900 text-white p-4 shadow-md">
      <div className="flex items-center gap-3">
        {phase === 'paused' || (phase === 'playing' && isLearn) ? (
          <button
            type="button"
            onClick={togglePause}
            aria-label={phase === 'paused' ? 'Fortsetzen' : 'Pausieren'}
            className="w-14 h-14 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center hover:bg-emerald-300"
          >
            {phase === 'paused' ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startPlay(playsUsed === 0)}
            disabled={phase !== 'ready'}
            aria-label="Hörtext starten"
            className="w-14 h-14 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center hover:bg-emerald-300 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {phase === 'done' ? <Lock className="w-5 h-5" /> : isActive ? <Volume2 className="w-6 h-6 animate-pulse" /> : <Play className="w-6 h-6 fill-current" />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <Headphones className="w-4 h-4" />
              {audioData ? 'Prüfungsaudio' : 'Browser-Sprachausgabe (Ersatz)'}
            </span>
            <span className="flex items-center gap-1" aria-label={`${playsUsed} von ${maxPlays} Durchgängen gehört`}>
              {Array.from({ length: maxPlays }, (_, i) => (
                <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < playsUsed ? 'bg-slate-600' : 'bg-emerald-400'}`} />
              ))}
            </span>
          </div>

          <div className="mt-2 h-10 flex items-center">
            {vizFallback || !audioData ? (
              <div className="flex items-end gap-1 h-8 w-full" aria-hidden="true">
                {Array.from({ length: 28 }, (_, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm bg-emerald-400/70 ${phase === 'playing' ? 'animate-pulse' : ''}`}
                    style={{ height: phase === 'playing' ? `${25 + ((i * 37) % 70)}%` : '10%', animationDelay: `${(i % 7) * 90}ms` }}
                  />
                ))}
              </div>
            ) : (
              <canvas ref={canvasRef} width={480} height={40} className="w-full h-10" aria-hidden="true" />
            )}
          </div>

          {audioData && (
            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-[width]" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
              </div>
              <span className="tabular-nums">
                {formatClock(progress)} / {formatClock(duration)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${phase === 'between' ? 'text-amber-300 font-bold' : 'text-slate-300'}`} aria-live="polite">
          {statusText}
        </p>
        {phase === 'between' && isLearn && (
          <button
            type="button"
            onClick={() => setCountdown(0)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
          >
            <SkipForward className="w-3.5 h-3.5" /> Pause überspringen
          </button>
        )}
      </div>
    </div>
  );
}
