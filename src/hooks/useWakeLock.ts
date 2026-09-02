import { useEffect, useRef, useCallback } from 'react';

export function useWakeLock(isActive: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  const acquireLock = useCallback(async () => {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      try {
        sentinelRef.current = await navigator.wakeLock.request('screen');
      } catch (err) {
        console.warn('Nu s-a putut activa Wake Lock:', err);
      }
    }
  }, []);

  const releaseLock = useCallback(() => {
    if (sentinelRef.current) {
      sentinelRef.current.release().catch(() => {});
      sentinelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isActive) {
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
    } else {
      releaseLock();
    }
  }, [isActive, acquireLock, releaseLock]);
}
