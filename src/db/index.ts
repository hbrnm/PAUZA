import Dexie, { Table } from 'dexie';
import { CravingEpisode } from '../types';

export class AntiPoftaDB extends Dexie {
  episodes!: Table<CravingEpisode, number>;

  constructor() {
    super('AntiPoftaDB');
    this.version(1).stores({
      episodes: '++id, timestamp, outcome, trigger'
    });
  }
}

export const db = new AntiPoftaDB();

// Solicită persistență DUPĂ primul episod salvat cu succes,
// nu la primul load — crește șansele ca browserul să accepte cererea.
export async function ensurePersistenceAfterEngagement(): Promise<void> {
  if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
}

// Export securizat: încearcă Web Share API (salvează direct în Files pe iOS),
// cu fallback automat la descărcare clasică Blob dacă share eșuează sau nu e suportat.
export async function exportDataSafe(): Promise<void> {
  const episodes = await db.episodes.toArray();
  const jsonString = JSON.stringify(episodes, null, 2);
  const fileName = `antipofta-export-${new Date().toISOString().slice(0, 10)}.json`;

  const triggerBlobDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  try {
    const file = new File([jsonString], fileName, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Export Jurnal Anti-Poftă',
        files: [file]
      });
      return;
    }
  } catch (err) {
    // Prinde atât NotAllowedError (user activation expirat), cât și anularea manuală
    console.warn('Share API nu a răspuns, fallback la Blob:', err);
  }

  triggerBlobDownload();
}
