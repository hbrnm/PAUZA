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
  timestamp: string;
  durationSeconds: number;
  trigger?: StoredTriggerType;
  actionTaken?: boolean;
  outcome: StoredOutcomeType;
  note?: string;
}
