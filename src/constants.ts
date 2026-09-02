import { OutcomeType, StoredOutcomeType, StoredTriggerType, TriggerType } from './types';

export const TRIGGERS: TriggerType[] = [
  'oboseala',
  'stres',
  'plictiseala',
  'obicei',
  'foame_reala',
  'doar_pofta'
];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  oboseala: 'Oboseală',
  stres: 'Stres',
  plictiseala: 'Plictiseală',
  obicei: 'Obicei',
  foame_reala: 'Foame reală',
  doar_pofta: 'Doar poftă'
};

const LEGACY_TRIGGER_LABELS: Record<string, string> = {
  nervi: 'Nervi',
  alta: 'Alt motiv'
};

export function formatTriggerLabel(trigger?: StoredTriggerType): string {
  if (!trigger) return '—';
  if (trigger in TRIGGER_LABELS) {
    return TRIGGER_LABELS[trigger as TriggerType];
  }
  return LEGACY_TRIGGER_LABELS[trigger] ?? trigger.replace('_', ' ');
}

export function isSuccessfulPause(outcome: StoredOutcomeType): boolean {
  return outcome === 'depasit' || outcome === 'amanat' || outcome === 'a_trecut' || outcome === 'am_amanat';
}

export function isConsumed(outcome: StoredOutcomeType): boolean {
  return outcome === 'mancat_totusi' || outcome === 'am_mancat_totusi';
}

export function isEarlyExit(outcome: StoredOutcomeType): boolean {
  return outcome === 'iesire_rapida';
}

export function formatOutcomeBadge(outcome: StoredOutcomeType) {
  switch (outcome) {
    case 'depasit':
    case 'a_trecut':
      return { label: 'Depășit', className: 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/60' };
    case 'amanat':
    case 'am_amanat':
      return { label: 'Amânat', className: 'text-indigo-400 bg-indigo-950/60 border border-indigo-800/60' };
    case 'mancat_totusi':
    case 'am_mancat_totusi':
      return { label: 'Consumat', className: 'text-amber-400 bg-amber-950/60 border border-amber-800/60' };
    case 'iesire_rapida':
      return { label: 'Ieșire rapidă', className: 'text-slate-400 bg-slate-900 border border-slate-800' };
  }
}

export const DECOMPRESSION_OUTCOMES: { value: OutcomeType; label: string; className: string }[] = [
  {
    value: 'depasit',
    label: 'Am depășit pofta',
    className: 'w-full py-3.5 bg-indigo-600 font-medium rounded-xl text-sm active:bg-indigo-500'
  },
  {
    value: 'amanat',
    label: 'Mai amân decizia',
    className: 'w-full py-3.5 bg-slate-800 font-medium rounded-xl text-sm active:bg-slate-700'
  },
  {
    value: 'mancat_totusi',
    label: 'Am mâncat totuși',
    className: 'w-full py-3.5 bg-slate-900 border border-slate-800 font-medium text-slate-400 rounded-xl text-sm active:bg-slate-800'
  }
];
