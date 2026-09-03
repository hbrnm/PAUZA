import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import { useWallClockTimer } from '../hooks/useWallClockTimer';
import { hapticTap } from '../hooks/useHaptic';
import {
  clearActiveSession,
  saveActiveSession,
  saveEpisodeValidated
} from '../db';
import {
  DECOMPRESSION_OUTCOMES,
  TRIGGER_LABELS,
  TRIGGERS
} from '../constants';
import {
  ACCIDENTAL_EXIT_THRESHOLD_SECONDS,
  ActiveCrisisSession,
  CrisisStep,
  CravingEpisode,
  EXTENSION_SECONDS,
  INITIAL_DURATION_SECONDS,
  OutcomeType,
  PROTOCOL_VERSION,
  TriggerType
} from '../types';
import { TimerDisplay } from './TimerDisplay';
import { StepTransition } from './StepTransition';

interface Props {
  onClose: () => void;
  initialSession?: ActiveCrisisSession | null;
}

const OUTCOME_CONFIRM_MS = 720;
const EXTEND_FLASH_MS = 1200;

const OUTCOME_CONFIRM_COPY: Record<OutcomeType, { mark: string; label: string }> = {
  depasit: { mark: '✓', label: 'Notat' },
  amanat: { mark: '✓', label: 'Notat' },
  mancat_totusi: { mark: '○', label: 'Notat' },
  iesire_rapida: { mark: '✓', label: 'Notat' }
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildInitial(session: ActiveCrisisSession | null | undefined) {
  return {
    step: (session?.step ?? 'RUNNING_3_MIN') as CrisisStep,
    extendedOnce: session?.extendedOnce ?? false,
    selectedTrigger: session?.selectedTrigger,
    finalOutcome: (session?.finalOutcome ?? 'iesire_rapida') as OutcomeType,
    persistedElapsed: session?.elapsedSeconds ?? 0,
    restore:
      session?.step === 'RUNNING_3_MIN' &&
      session.startedAtMs > 0 &&
      session.endsAtMs > session.startedAtMs
        ? { startedAtMs: session.startedAtMs, endsAtMs: session.endsAtMs }
        : null,
    protocolStartedAtMs: session?.startedAtMs ?? Date.now()
  };
}

export const CrisisOverlay: React.FC<Props> = ({ onClose, initialSession = null }) => {
  const initial = useMemo(() => buildInitial(initialSession), [initialSession]);
  const [step, setStep] = useState<CrisisStep>(initial.step);
  const [extendedOnce, setExtendedOnce] = useState(initial.extendedOnce);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | undefined>(
    initial.selectedTrigger
  );
  const [finalOutcome, setFinalOutcome] = useState<OutcomeType>(initial.finalOutcome);
  const [persistedElapsed, setPersistedElapsed] = useState(initial.persistedElapsed);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingRetry, setPendingRetry] = useState<null | (() => Promise<void>)>(null);
  const [extendFlash, setExtendFlash] = useState(false);
  const [confirmingOutcome, setConfirmingOutcome] = useState<OutcomeType | null>(null);
  const restoreRef = useRef(initial.restore);
  const protocolStartedAtMsRef = useRef(initial.protocolStartedAtMs);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const extendFlashTimerRef = useRef<number | null>(null);

  const isRunning3Min = step === 'RUNNING_3_MIN';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (extendFlashTimerRef.current != null) {
        window.clearTimeout(extendFlashTimerRef.current);
      }
    };
  }, []);

  const handleTimerComplete = useCallback(() => {
    hapticTap('light');
    setStep('DECOMPRESSION');
  }, []);

  const persistSession = useCallback(
    async (partial: {
      step: CrisisStep;
      startedAtMs: number;
      endsAtMs: number;
      extendedOnce: boolean;
      elapsedSeconds: number;
      selectedTrigger?: TriggerType;
      finalOutcome?: OutcomeType;
    }) => {
      await saveActiveSession({
        step: partial.step,
        startedAtMs: partial.startedAtMs,
        endsAtMs: partial.endsAtMs,
        extendedOnce: partial.extendedOnce,
        elapsedSeconds: partial.elapsedSeconds,
        selectedTrigger: partial.selectedTrigger,
        finalOutcome: partial.finalOutcome
      });
    },
    []
  );

  const handleSnapshot = useCallback(
    (snapshot: {
      startedAtMs: number;
      endsAtMs: number;
      elapsedSeconds: number;
    }) => {
      protocolStartedAtMsRef.current = snapshot.startedAtMs;
      setPersistedElapsed(snapshot.elapsedSeconds);
      void persistSession({
        step: 'RUNNING_3_MIN',
        startedAtMs: snapshot.startedAtMs,
        endsAtMs: snapshot.endsAtMs,
        extendedOnce,
        elapsedSeconds: snapshot.elapsedSeconds,
        selectedTrigger,
        finalOutcome
      });
    },
    [extendedOnce, selectedTrigger, finalOutcome, persistSession]
  );

  const { secondsLeft, totalDuration, elapsedSeconds, extend } = useWallClockTimer({
    isActive: isRunning3Min,
    initialDurationSeconds: INITIAL_DURATION_SECONDS,
    onComplete: handleTimerComplete,
    restore: restoreRef.current,
    onSnapshot: handleSnapshot
  });

  const durationForSave = isRunning3Min ? elapsedSeconds : persistedElapsed;

  useWakeLock(isRunning3Min);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  useEffect(() => {
    if (step === 'RUNNING_3_MIN') return;
    const existing = initialSession;
    void persistSession({
      step,
      startedAtMs: protocolStartedAtMsRef.current || existing?.startedAtMs || Date.now(),
      endsAtMs: existing?.endsAtMs ?? Date.now(),
      extendedOnce,
      elapsedSeconds: durationForSave,
      selectedTrigger,
      finalOutcome
    });
  }, [step, extendedOnce, selectedTrigger, finalOutcome, durationForSave, persistSession, initialSession]);

  const closeAndClear = useCallback(async () => {
    await clearActiveSession();
    onClose();
  }, [onClose]);

  const handleAddTwoMinutes = () => {
    if (extendedOnce) return;
    hapticTap('light');
    extend(EXTENSION_SECONDS);
    setExtendedOnce(true);
    setExtendFlash(true);
    if (extendFlashTimerRef.current != null) {
      window.clearTimeout(extendFlashTimerRef.current);
    }
    extendFlashTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setExtendFlash(false);
      extendFlashTimerRef.current = null;
    }, EXTEND_FLASH_MS);
  };

  const handleEarlyExit = () => {
    const spent = isRunning3Min ? elapsedSeconds : persistedElapsed;
    if (spent < ACCIDENTAL_EXIT_THRESHOLD_SECONDS) {
      void closeAndClear();
      return;
    }
    setPersistedElapsed(spent);
    hapticTap('light');
    setFinalOutcome('iesire_rapida');
    setStep('EARLY_EXIT_TRIGGER');
  };

  const saveEpisode = async (outcome: OutcomeType, trigger?: TriggerType) => {
    setSaveError(null);
    const completedAt = new Date().toISOString();
    const startedAt = new Date(protocolStartedAtMsRef.current).toISOString();
    const episode: Omit<CravingEpisode, 'id'> = {
      startedAt,
      completedAt,
      durationSeconds: durationForSave,
      extendedTime: extendedOnce,
      trigger,
      outcome,
      protocolVersion: PROTOCOL_VERSION,
      timestamp: completedAt
    };
    const result = await saveEpisodeValidated(episode);
    if (!result.saved && result.reason === 'storage_error') {
      setSaveError(result.message ?? 'Salvarea a eșuat.');
      return false;
    }
    return true;
  };

  const finalizeDecompression = async (outcome: OutcomeType) => {
    if (confirmingOutcome) return;
    hapticTap('medium');
    setFinalOutcome(outcome);
    setConfirmingOutcome(outcome);
    await wait(OUTCOME_CONFIRM_MS);
    if (!mountedRef.current) return;

    const ok = await saveEpisode(outcome, selectedTrigger ?? 'doar_pofta');
    if (!mountedRef.current) return;

    if (!ok) {
      setConfirmingOutcome(null);
      setPendingRetry(() => async () => {
        const retried = await saveEpisode(outcome, selectedTrigger ?? 'doar_pofta');
        if (retried) {
          setSaveError(null);
          setPendingRetry(null);
          setConfirmingOutcome(null);
          setStep('AFTERCARE');
        }
      });
      return;
    }
    setConfirmingOutcome(null);
    setStep('AFTERCARE');
  };

  const finalizeEarlyExit = async (trigger?: TriggerType) => {
    hapticTap('light');
    const ok = await saveEpisode('iesire_rapida', trigger);
    if (!ok) {
      setPendingRetry(() => async () => {
        const retried = await saveEpisode('iesire_rapida', trigger);
        if (retried) {
          setSaveError(null);
          setPendingRetry(null);
          await closeAndClear();
        }
      });
      return;
    }
    await closeAndClear();
  };

  const handleSelectTrigger = (trigger: TriggerType) => {
    hapticTap('light');
    setSelectedTrigger(trigger);
  };

  const confirmCopy = confirmingOutcome ? OUTCOME_CONFIRM_COPY[confirmingOutcome] : null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Protocol PAUZĂ"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] select-none overflow-y-auto animate-overlay-enter outline-none"
    >
      {saveError && (
        <div
          role="alert"
          className="absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-xs text-amber-100"
        >
          <p>{saveError}</p>
          <p className="mt-1 text-amber-200/80">Sesiunea rămâne activă — poți reîncerca.</p>
          <div className="mt-2 flex gap-3">
            {pendingRetry && (
              <button
                type="button"
                onClick={() => void pendingRetry()}
                className="underline text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                Reîncearcă salvarea
              </button>
            )}
            <button
              type="button"
              onClick={() => setSaveError(null)}
              className="underline text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              Închide
            </button>
          </div>
        </div>
      )}

      {confirmCopy && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/88 pauza-outcome-confirm pointer-events-none"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="w-14 h-14 rounded-full border border-indigo-400/40 bg-indigo-500/10 text-indigo-200 flex items-center justify-center text-2xl pauza-outcome-check"
            aria-hidden="true"
          >
            {confirmCopy.mark}
          </div>
          <p className="mt-4 text-sm font-medium text-slate-200 tracking-wide">{confirmCopy.label}</p>
        </div>
      )}

      {step === 'RUNNING_3_MIN' && (
        <StepTransition key="running" className="flex flex-col justify-between min-h-full overscroll-x-none touch-pan-y">
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Protocol Activ</span>
            <button
              onClick={handleEarlyExit}
              className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full active:bg-slate-800 active:scale-[0.98] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Ies acum
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto text-center space-y-6 py-4">
            <TimerDisplay
              secondsLeft={secondsLeft}
              totalDuration={totalDuration}
              extendFlash={extendFlash}
            />

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                Pune telefonul jos. Bea un pahar cu apă rece sau spală-te pe față și ieși din bucătărie.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              {!extendedOnce ? (
                <button
                  onClick={handleAddTwoMinutes}
                  className="text-xs text-slate-400 border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-lg active:bg-slate-800 active:scale-[0.98] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                  +2 minute (mai aștept puțin)
                </button>
              ) : (
                <span className="text-[11px] text-slate-600">Timp extins cu succes (+2m)</span>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 pb-4">
            Nu iei nicio decizie acum. Doar lași secundele să curgă.
          </div>
        </StepTransition>
      )}

      {step === 'EARLY_EXIT_TRIGGER' && (
        <StepTransition key="early-exit" className="my-auto space-y-6 max-w-sm mx-auto w-full text-center py-4">
          <h2 className="text-lg font-medium text-slate-200">Ce te-a făcut să renunți?</h2>
          <p className="text-xs text-slate-400">Opțional — alege un motiv cu o singură atingere:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                onClick={() => void finalizeEarlyExit(trigger)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl active:bg-slate-800 active:scale-[0.98] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              >
                {TRIGGER_LABELS[trigger]}
              </button>
            ))}
          </div>
          <button
            onClick={() => void finalizeEarlyExit()}
            className="w-full py-3 text-xs text-slate-400 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Sari peste și închide
          </button>
        </StepTransition>
      )}

      {step === 'DECOMPRESSION' && (
        <StepTransition key="decompression" className="my-auto space-y-6 max-w-sm mx-auto w-full py-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-medium text-slate-100">Valul s-a oprit</h2>
            <p className="text-xs text-slate-400">Ce simțeai că a împins impulsul?</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                onClick={() => handleSelectTrigger(trigger)}
                disabled={Boolean(confirmingOutcome)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-60 ${
                  selectedTrigger === trigger
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 scale-[1.02]'
                    : 'bg-slate-900 border-slate-800 text-slate-300 active:scale-[0.98]'
                }`}
              >
                {TRIGGER_LABELS[trigger]}
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs text-center text-slate-400 mb-2">Care este decizia ta acum?</p>
            {DECOMPRESSION_OUTCOMES.map(({ value, label, className }) => (
              <button
                key={value}
                onClick={() => void finalizeDecompression(value)}
                disabled={Boolean(confirmingOutcome)}
                className={`${className} transition-all duration-150 active:scale-[0.98] disabled:opacity-60`}
              >
                {label}
              </button>
            ))}
          </div>
        </StepTransition>
      )}

      {step === 'AFTERCARE' && (
        <StepTransition key="aftercare" className="my-auto space-y-6 max-w-sm mx-auto text-center py-4">
          {finalOutcome === 'mancat_totusi' ? (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto text-xl" aria-hidden="true">
                ○
              </div>
              <h3 className="text-lg font-medium text-slate-100">Ai mâncat. Este în regulă.</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Un episod izolat nu anulează nimic. Nu încerca să compensezi. Lasă restul deoparte, bea un pahar cu apă și schimbă camera.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto text-xl" aria-hidden="true">
                ✓
              </div>
              <h3 className="text-lg font-medium text-slate-100">Ai creat spațiu</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fiecare pauză contează. Ai lăsat timpul să lucreze între impuls și reacție — asta este victoria de azi.
              </p>
            </div>
          )}

          <button
            onClick={() => void closeAndClear()}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Înapoi la ecranul principal
          </button>
        </StepTransition>
      )}
    </div>
  );
};
