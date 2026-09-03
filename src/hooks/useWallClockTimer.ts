import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerSnapshot {
  startedAt: number;
  endsAt: number;
  elapsedSeconds: number;
  secondsLeft: number;
  totalDuration: number;
}

interface Options {
  isActive: boolean;
  initialDurationSeconds: number;
  onComplete: () => void;
  /** Restore wall-clock anchors after refresh. Applied once when timer becomes active. */
  restore?: { startedAt: number; endsAt: number } | null;
  onSnapshot?: (snapshot: TimerSnapshot) => void;
}

export function useWallClockTimer({
  isActive,
  initialDurationSeconds,
  onComplete,
  restore = null,
  onSnapshot
}: Options) {
  const startedAtRef = useRef(0);
  const endsAtRef = useRef(0);
  const completedRef = useRef(false);
  const restoreAppliedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onSnapshotRef = useRef(onSnapshot);
  const restoreRef = useRef(restore);

  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [totalDuration, setTotalDuration] = useState(initialDurationSeconds);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  onCompleteRef.current = onComplete;
  onSnapshotRef.current = onSnapshot;
  restoreRef.current = restore;

  const syncNow = useCallback(() => {
    if (!isActive || startedAtRef.current === 0) return;

    const now = Date.now();
    const elapsed = Math.max(0, Math.floor((now - startedAtRef.current) / 1000));
    const remaining = Math.max(0, Math.ceil((endsAtRef.current - now) / 1000));
    const duration = Math.max(
      1,
      Math.ceil((endsAtRef.current - startedAtRef.current) / 1000)
    );

    setElapsedSeconds(elapsed);
    setSecondsLeft(remaining);
    setTotalDuration(duration);

    onSnapshotRef.current?.({
      startedAt: startedAtRef.current,
      endsAt: endsAtRef.current,
      elapsedSeconds: elapsed,
      secondsLeft: remaining,
      totalDuration: duration
    });

    if (remaining <= 0 && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current();
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      startedAtRef.current = 0;
      endsAtRef.current = 0;
      completedRef.current = false;
      restoreAppliedRef.current = false;
      return;
    }

    const now = Date.now();
    const restoreValue = restoreRef.current;

    if (
      !restoreAppliedRef.current &&
      restoreValue &&
      restoreValue.startedAt > 0 &&
      restoreValue.endsAt > restoreValue.startedAt
    ) {
      startedAtRef.current = restoreValue.startedAt;
      endsAtRef.current = restoreValue.endsAt;
      restoreAppliedRef.current = true;
    } else if (startedAtRef.current === 0) {
      startedAtRef.current = now;
      endsAtRef.current = now + initialDurationSeconds * 1000;
      restoreAppliedRef.current = true;
    }

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
