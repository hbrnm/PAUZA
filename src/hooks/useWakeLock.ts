import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(isActive: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const releaseLock = useCallback(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    sentinelRef.current = null;
    sentinel.release().catch(() => {});
  }, []);

  const acquireLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      return;
    }

    if (sentinelRef.current) {
      return;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (document.visibilityState !== 'visible') {
        await sentinel.release().catch(() => {});
        return;
      }
      sentinelRef.current = sentinel;
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
        }
      });
    } catch (err) {
      console.warn('Nu s-a putut activa Wake Lock:', err);
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      releaseLock();
      return releaseLock;
    }

    acquireLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        acquireLock();
      } else {
        releaseLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [isActive, acquireLock, releaseLock]);
}
