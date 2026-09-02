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
  if (navigator.storage?.persist && navigator.storage.persisted) {
    const isPersisted = await navigator.storage.persisted();
    if (!isPersisted) {
      await navigator.storage.persist();
    }
  }
}

// Ignoră deschiderile accidentale sub 5 secunde fără trigger selectat.
export async function saveEpisodeValidated(
  episode: Omit<CravingEpisode, 'id'>
): Promise<boolean> {
  if (episode.durationSeconds < 5 && episode.trigger === undefined) {
    return false;
  }

  const hadEpisodes = (await db.episodes.count()) > 0;
  await db.episodes.add(episode);

  if (!hadEpisodes) {
    await ensurePersistenceAfterEngagement();
  }

  return true;
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
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const file = new File([jsonString], fileName, { type: 'application/json' });
  const canShareFiles =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    try {
      await navigator.share({
        title: 'Export Jurnal Anti-Poftă',
        files: [file]
      });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      console.warn('Share API nu a răspuns, fallback la Blob:', err);
    }
  }

  triggerBlobDownload();
}
