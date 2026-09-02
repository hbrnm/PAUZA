import { useEffect } from 'react';

// Blochează gestul iOS swipe-back doar când protocolul de 3 minute rulează.
export function usePreventSwipeBack(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    const url = window.location.href;
    history.pushState({ crisisRunning: true }, '', url);

    const handlePopState = () => {
      history.pushState({ crisisRunning: true }, '', url);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isActive]);
}
