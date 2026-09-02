import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  isActive: boolean;
  initialDurationSeconds: number;
  onComplete: () => void;
}

export function useWallClockTimer({
  isActive,
  initialDurationSeconds,
  onComplete
}: Options) {
  const startedAtRef = useRef(0);
  const endsAtRef = useRef(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [totalDuration, setTotalDuration] = useState(initialDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  onCompleteRef.current = onComplete;

  const syncNow = useCallback(() => {
    if (!isActive || startedAtRef.current === 0) return;

    const now = Date.now();
    const elapsed = Math.floor((now - startedAtRef.current) / 1000);
    const remaining = Math.max(0, Math.ceil((endsAtRef.current - now) / 1000));
    const duration = Math.max(
      1,
      Math.ceil((endsAtRef.current - startedAtRef.current) / 1000)
    );

    setElapsedSeconds(elapsed);
    setSecondsLeft(remaining);
    setTotalDuration(duration);

    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      startedAtRef.current = 0;
      completedRef.current = false;
      return;
    }

    const now = Date.now();
    startedAtRef.current = now;
    endsAtRef.current = now + initialDurationSeconds * 1000;
    completedRef.current = false;

    syncNow();

    const interval = setInterval(syncNow, 1000);

    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('pageshow', handleResume);
    window.addEventListener('focus', handleResume);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('pageshow', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [isActive, initialDurationSeconds, syncNow]);

  const extend = useCallback(
    (extraSeconds: number) => {
      if (!isActive || completedRef.current) return;
      endsAtRef.current += extraSeconds * 1000;
      syncNow();
    },
    [isActive, syncNow]
  );

  return { secondsLeft, totalDuration, elapsedSeconds, extend, syncNow };
}
