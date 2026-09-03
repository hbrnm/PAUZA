import { useEffect, useState } from 'react';
import { HomeView } from './components/HomeView';
import { CrisisOverlay } from './components/CrisisOverlay';
import { JournalView } from './components/JournalView';
import { clearActiveSession, loadActiveSession, saveActiveSession } from './db';
import { ActiveCrisisSession, INITIAL_DURATION_SECONDS } from './types';

export function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [restoredSession, setRestoredSession] = useState<ActiveCrisisSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadActiveSession();
      if (cancelled) return;
      if (session) {
        setRestoredSession(session);
        setIsCrisisOpen(true);
      }
      setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTriggerSOS = async () => {
    const now = Date.now();
    const session: Omit<ActiveCrisisSession, 'id' | 'updatedAtMs'> = {
      step: 'RUNNING_3_MIN',
      startedAtMs: now,
      endsAtMs: now + INITIAL_DURATION_SECONDS * 1000,
      extendedOnce: false,
      elapsedSeconds: 0,
      finalOutcome: 'iesire_rapida'
    };
    await saveActiveSession(session);
    setRestoredSession({ ...session, id: 'current', updatedAtMs: now });
    setIsCrisisOpen(true);
  };

  const handleCrisisClose = async () => {
    await clearActiveSession();
    setRestoredSession(null);
    setIsCrisisOpen(false);
  };

  if (!bootstrapped) {
    return (
      <main className="min-h-screen bg-slate-950" aria-busy="true" aria-label="PAUZĂ se încarcă" />
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 font-sans antialiased selection:bg-indigo-500/30">
      <HomeView
        onTriggerSOS={() => void handleTriggerSOS()}
        onOpenJournal={() => setIsJournalOpen(true)}
      />

      {isCrisisOpen && (
        <CrisisOverlay
          key={restoredSession?.startedAtMs ?? 'new'}
          initialSession={restoredSession}
          onClose={() => void handleCrisisClose()}
        />
      )}

      {isJournalOpen && (
        <JournalView onClose={() => setIsJournalOpen(false)} />
      )}
    </main>
  );
}

export default App;
