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

export type SaveEpisodeResult =
  | { saved: true }
  | { saved: false; reason: 'skipped' | 'storage_error'; message?: string };

export type ExportResult =
  | { ok: true; method: 'share' | 'download' }
  | { ok: false; reason: 'aborted' | 'storage_error' | 'unknown'; message?: string };

export type LoadEpisodesResult =
  | { ok: true; episodes: CravingEpisode[] }
  | { ok: false; message: string };

// Solicită persistență DUPĂ primul episod salvat cu succes,
// nu la primul load — crește șansele ca browserul să accepte cererea.
export async function ensurePersistenceAfterEngagement(): Promise<void> {
  try {
    if (navigator.storage?.persist && navigator.storage.persisted) {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
    }
  } catch (err) {
    console.warn('Persistența storage nu a putut fi solicitată:', err);
  }
}

// Ignoră deschiderile accidentale sub 5 secunde fără trigger selectat.
export async function saveEpisodeValidated(
  episode: Omit<CravingEpisode, 'id'>
): Promise<SaveEpisodeResult> {
  if (episode.durationSeconds < 5 && episode.trigger === undefined) {
    return { saved: false, reason: 'skipped' };
  }

  try {
    const hadEpisodes = (await db.episodes.count()) > 0;
    await db.episodes.add(episode);

    if (!hadEpisodes) {
      await ensurePersistenceAfterEngagement();
    }

    return { saved: true };
  } catch (err) {
    console.error('Salvarea episodului a eșuat:', err);
    return {
      saved: false,
      reason: 'storage_error',
      message: 'Nu am putut salva episodul pe acest dispozitiv.'
    };
  }
}

export async function loadEpisodesSafe(): Promise<LoadEpisodesResult> {
  try {
    const episodes = await db.episodes.orderBy('timestamp').reverse().toArray();
    return { ok: true, episodes };
  } catch (err) {
    console.error('Citirea jurnalului a eșuat:', err);
    return {
      ok: false,
      message: 'Nu am putut încărca jurnalul. Verifică spațiul de stocare al browserului.'
    };
  }
}

// Export securizat: încearcă Web Share API (salvează direct în Files pe iOS),
// cu fallback automat la descărcare clasică Blob dacă share eșuează sau nu e suportat.
export async function exportDataSafe(): Promise<ExportResult> {
  let episodes: CravingEpisode[];

  try {
    episodes = await db.episodes.toArray();
  } catch (err) {
    console.error('Export: citirea datelor a eșuat:', err);
    return {
      ok: false,
      reason: 'storage_error',
      message: 'Nu am putut citi datele pentru export.'
    };
  }

  const jsonString = JSON.stringify(episodes, null, 2);
  const fileName = `pauza-export-${new Date().toISOString().slice(0, 10)}.json`;

  const triggerBlobDownload = (): ExportResult => {
    try {
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
      return { ok: true, method: 'download' };
    } catch (err) {
      console.error('Export Blob a eșuat:', err);
      return {
        ok: false,
        reason: 'unknown',
        message: 'Exportul nu a putut fi finalizat pe acest browser.'
      };
    }
  };

  try {
    const file = new File([jsonString], fileName, { type: 'application/json' });
    const canShareFiles =
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        await navigator.share({
          title: 'Export Jurnal PAUZĂ',
          files: [file]
        });
        return { ok: true, method: 'share' };
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return { ok: false, reason: 'aborted' };
        }
        console.warn('Share API nu a răspuns, fallback la Blob:', err);
      }
    }
  } catch (err) {
    console.warn('File/Share API indisponibil, fallback la Blob:', err);
  }

  return triggerBlobDownload();
}
