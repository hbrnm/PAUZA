import { OutcomeType, TriggerType } from '../types';

export type CrisisStep =
  | 'RUNNING_3_MIN'
  | 'EARLY_EXIT_TRIGGER'
  | 'DECOMPRESSION'
  | 'AFTERCARE';

export interface CrisisSession {
  version: 1;
  step: CrisisStep;
  startedAt: number;
  endsAt: number;
  extendedOnce: boolean;
  elapsedSeconds: number;
  selectedTrigger?: TriggerType;
  finalOutcome?: OutcomeType;
}

const STORAGE_KEY = 'pauza.crisis.session.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function canUseSessionStorage(): boolean {
  try {
    const key = '__pauza_test__';
    sessionStorage.setItem(key, '1');
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function loadCrisisSession(): CrisisSession | null {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CrisisSession;
    if (parsed.version !== 1 || typeof parsed.startedAt !== 'number') {
      clearCrisisSession();
      return null;
    }

    if (Date.now() - parsed.startedAt > MAX_AGE_MS) {
      clearCrisisSession();
      return null;
    }

    return parsed;
  } catch {
    clearCrisisSession();
    return null;
  }
}

export function saveCrisisSession(session: CrisisSession): void {
  if (!canUseSessionStorage()) return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Nu s-a putut salva sesiunea protocolului:', err);
  }
}

export function clearCrisisSession(): void {
  if (!canUseSessionStorage()) return;

  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasCrisisSession(): boolean {
  return loadCrisisSession() !== null;
}
