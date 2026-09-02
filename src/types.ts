export type TriggerType =
  | 'oboseala'
  | 'stres'
  | 'nervi'
  | 'plictiseala'
  | 'foame_reala'
  | 'alta';

export type OutcomeType =
  | 'a_trecut'
  | 'am_amanat'
  | 'am_mancat_totusi'
  | 'iesire_rapida';

export interface CravingEpisode {
  id?: number; // Auto-increment Dexie
  timestamp: string; // ISO string
  durationSeconds: number; // Cât timp a stat efectiv în protocol
  trigger?: TriggerType;
  actionTaken: boolean; // A bifat acțiunea fizică (apă rece pe față/mâini)?
  outcome: OutcomeType;
  note?: string;
}
