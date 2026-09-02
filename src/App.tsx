import React, { useState } from 'react';
import { HomeView } from './components/HomeView';
import { CrisisOverlay } from './components/CrisisOverlay';
import { JournalView } from './components/JournalView';

export function App() {
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 font-sans antialiased selection:bg-indigo-500/30">
      <HomeView
        onTriggerSOS={() => setIsCrisisOpen(true)}
        onOpenJournal={() => setIsJournalOpen(true)}
      />

      {isCrisisOpen && (
        <CrisisOverlay onClose={() => setIsCrisisOpen(false)} />
      )}

      {isJournalOpen && (
        <JournalView onClose={() => setIsJournalOpen(false)} />
      )}
    </main>
  );
}

export default App;
