export const APP_VERSION = '1.0.1';
export const PROTOCOL_VERSION = 1 as const;
export const INITIAL_DURATION_SECONDS = 180;
export const EXTENSION_SECONDS = 120;
export const MAX_DURATION_SECONDS = INITIAL_DURATION_SECONDS + EXTENSION_SECONDS;
export const ACCIDENTAL_EXIT_THRESHOLD_SECONDS = 5;

export type TriggerType =
  | 'oboseala'
  | 'stres'
  | 'plictiseala'
  | 'obicei'
  | 'foame_reala'
  | 'doar_pofta';

/** @deprecated Valori vechi păstrate pentru compatibilitate la citire din IndexedDB */
export type LegacyTriggerType = 'nervi' | 'alta';

export type OutcomeType =
  | 'depasit'
  | 'amanat'
  | 'mancat_totusi'
  | 'iesire_rapida';

/** @deprecated Valori vechi păstrate pentru compatibilitate la citire din IndexedDB */
export type LegacyOutcomeType = 'a_trecut' | 'am_amanat' | 'am_mancat_totusi';

export type StoredOutcomeType = OutcomeType | LegacyOutcomeType;
export type StoredTriggerType = TriggerType | LegacyTriggerType;

export interface CravingEpisode {
  id?: number;
  /** ISO — început protocol (sursă pentru tipare orare) */
  startedAt: string;
  /** ISO — momentul salvării / închiderii */
  completedAt: string;
  durationSeconds: number;
  extendedTime: boolean;
  trigger?: StoredTriggerType;
  outcome: StoredOutcomeType;
  protocolVersion: typeof PROTOCOL_VERSION;
  /** @deprecated Legacy — folosit doar la citire date vechi */
  timestamp?: string;
  /** @deprecated Legacy */
  actionTaken?: boolean;
  note?: string;
}

export type CrisisStep =
  | 'RUNNING_3_MIN'
  | 'EARLY_EXIT_TRIGGER'
  | 'DECOMPRESSION'
  | 'AFTERCARE';

export interface ActiveCrisisSession {
  id: 'current';
  step: CrisisStep;
  startedAtMs: number;
  endsAtMs: number;
  extendedOnce: boolean;
  elapsedSeconds: number;
  selectedTrigger?: TriggerType;
  finalOutcome?: OutcomeType;
  updatedAtMs: number;
}

export interface PauzaExportPayload {
  exportVersion: 1;
  exportedAt: string;
  appVersion: string;
  episodes: CravingEpisode[];
}

/** Momentul de start al episodului — preferă startedAt, fallback legacy timestamp. */
export function getEpisodeStartedAt(episode: CravingEpisode): string {
  return episode.startedAt || episode.timestamp || episode.completedAt || '';
}

export function normalizeEpisode(raw: Partial<CravingEpisode> & { outcome: StoredOutcomeType }): CravingEpisode {
  const completedAt = raw.completedAt || raw.timestamp || new Date().toISOString();
  const startedAt =
    raw.startedAt ||
    raw.timestamp ||
    (typeof raw.durationSeconds === 'number'
      ? new Date(Date.parse(completedAt) - raw.durationSeconds * 1000).toISOString()
      : completedAt);

  return {
    id: raw.id,
    startedAt,
    completedAt,
    durationSeconds: raw.durationSeconds ?? 0,
    extendedTime: raw.extendedTime ?? false,
    trigger: raw.trigger,
    outcome: raw.outcome,
    protocolVersion: raw.protocolVersion === 1 ? 1 : PROTOCOL_VERSION,
    timestamp: raw.timestamp,
    actionTaken: raw.actionTaken,
    note: raw.note
  };
}
