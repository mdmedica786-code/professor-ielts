import { useEffect, useRef } from 'react';
import { usePersistentState } from './usePersistentState';

/**
 * Countdown state. `running` drives the tick; onExpire fires once at 0.
 * reset(seconds) restarts from a new value. With `persistKey` the remaining
 * time survives a page refresh (it does not run while the page is closed).
 */
export function useCountdown(initialSeconds, { running = false, onExpire, persistKey = null } = {}) {
  const [secondsLeft, setSecondsLeft] = usePersistentState(persistKey, initialSeconds);
  const expireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running, setSecondsLeft]);

  useEffect(() => {
    if (secondsLeft === 0 && running && !firedRef.current) {
      firedRef.current = true;
      expireRef.current?.();
    }
  }, [secondsLeft, running]);

  const reset = (seconds) => {
    firedRef.current = false;
    setSecondsLeft(seconds);
  };

  return { secondsLeft, reset };
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
