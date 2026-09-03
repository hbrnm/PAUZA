import Dexie, { Table } from 'dexie';
import {
  ActiveCrisisSession,
  APP_VERSION,
  CravingEpisode,
  normalizeEpisode,
  PauzaExportPayload,
  PROTOCOL_VERSION
} from '../types';

/** Păstrăm numele DB pentru a nu pierde datele IndexedDB existente pe device. */
export class PauzaDB extends Dexie {
  episodes!: Table<CravingEpisode, number>;
  activeSessions!: Table<ActiveCrisisSession, string>;

  constructor() {
    super('AntiPoftaDB');
    this.version(1).stores({
      episodes: '++id, timestamp, outcome, trigger'
    });
    this.version(2)
      .stores({
        episodes: '++id, timestamp, startedAt, outcome, trigger',
        activeSessions: 'id, updatedAtMs'
      })
      .upgrade(async (tx) => {
        const table = tx.table('episodes');
        await table.toCollection().modify((row: Record<string, unknown>) => {
          const completedAt =
            (row.completedAt as string | undefined) ||
            (row.timestamp as string | undefined) ||
            new Date().toISOString();
          const durationSeconds = typeof row.durationSeconds === 'number' ? row.durationSeconds : 0;
          const startedAt =
            (row.startedAt as string | undefined) ||
            (row.timestamp as string | undefined) ||
            new Date(Date.parse(completedAt) - durationSeconds * 1000).toISOString();

          row.startedAt = startedAt;
          row.completedAt = completedAt;
          row.extendedTime = Boolean(row.extendedTime);
          row.protocolVersion = PROTOCOL_VERSION;
          if (!row.timestamp) row.timestamp = completedAt;
        });
      });
  }
}

export const db = new PauzaDB();

export type SaveEpisodeResult =
  | { saved: true; id: number }
  | { saved: false; reason: 'skipped' | 'storage_error'; message?: string };

export type ExportResult =
  | { ok: true; method: 'share' | 'download' }
  | { ok: false; reason: 'aborted' | 'storage_error' | 'unknown'; message?: string };

export type LoadEpisodesResult =
  | { ok: true; episodes: CravingEpisode[] }
  | { ok: false; message: string };

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

export async function saveEpisodeValidated(
  episode: Omit<CravingEpisode, 'id'>
): Promise<SaveEpisodeResult> {
  if (episode.durationSeconds < 5 && episode.trigger === undefined) {
    return { saved: false, reason: 'skipped' };
  }

  try {
    const hadEpisodes = (await db.episodes.count()) > 0;
    const payload = normalizeEpisode(episode);
    const id = await db.episodes.add(payload);

    if (!hadEpisodes) {
      await ensurePersistenceAfterEngagement();
    }

    return { saved: true, id };
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
    const rows = await db.episodes.orderBy('startedAt').reverse().toArray();
    // Fallback sort for legacy rows without startedAt index values
    const episodes = rows
      .map((row) => normalizeEpisode(row))
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
    return { ok: true, episodes };
  } catch (err) {
    console.error('Citirea jurnalului a eșuat:', err);
    try {
      const fallback = await db.episodes.toArray();
      const episodes = fallback
        .map((row) => normalizeEpisode(row))
        .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      return { ok: true, episodes };
    } catch (inner) {
      console.error('Fallback citire jurnal a eșuat:', inner);
      return {
        ok: false,
        message: 'Nu am putut încărca jurnalul. Verifică spațiul de stocare al browserului.'
      };
    }
  }
}

export function buildExportPayload(episodes: CravingEpisode[]): PauzaExportPayload {
  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    episodes
  };
}

export async function exportDataSafe(): Promise<ExportResult> {
  let episodes: CravingEpisode[];

  try {
    const loaded = await loadEpisodesSafe();
    if (!loaded.ok) {
      return { ok: false, reason: 'storage_error', message: loaded.message };
    }
    episodes = loaded.episodes;
  } catch (err) {
    console.error('Export: citirea datelor a eșuat:', err);
    return {
      ok: false,
      reason: 'storage_error',
      message: 'Nu am putut citi datele pentru export.'
    };
  }

  const jsonString = JSON.stringify(buildExportPayload(episodes), null, 2);
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

const SESSION_ID = 'current' as const;
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

export async function saveActiveSession(
  session: Omit<ActiveCrisisSession, 'id' | 'updatedAtMs'>
): Promise<void> {
  try {
    await db.activeSessions.put({
      ...session,
      id: SESSION_ID,
      updatedAtMs: Date.now()
    });
  } catch (err) {
    console.warn('Nu s-a putut salva sesiunea activă:', err);
  }
}

export async function loadActiveSession(): Promise<ActiveCrisisSession | null> {
  try {
    const session = await db.activeSessions.get(SESSION_ID);
    if (!session) return null;
    if (Date.now() - session.startedAtMs > MAX_SESSION_AGE_MS) {
      await clearActiveSession();
      return null;
    }
    return session;
  } catch (err) {
    console.warn('Nu s-a putut citi sesiunea activă:', err);
    return null;
  }
}

export async function clearActiveSession(): Promise<void> {
  try {
    await db.activeSessions.delete(SESSION_ID);
  } catch (err) {
    console.warn('Nu s-a putut șterge sesiunea activă:', err);
  }
}

export async function hasActiveSession(): Promise<boolean> {
  return (await loadActiveSession()) !== null;
}
