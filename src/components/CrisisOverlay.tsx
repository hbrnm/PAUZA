import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import { usePreventSwipeBack } from '../hooks/usePreventSwipeBack';
import { useWallClockTimer } from '../hooks/useWallClockTimer';
import { hapticTap } from '../hooks/useHaptic';
import { saveEpisodeValidated } from '../db';
import {
  DECOMPRESSION_OUTCOMES,
  TRIGGER_LABELS,
  TRIGGERS
} from '../constants';
import { CravingEpisode, OutcomeType, TriggerType } from '../types';
import {
  clearCrisisSession,
  CrisisSession,
  CrisisStep,
  loadCrisisSession,
  saveCrisisSession
} from '../session/crisisSession';
import { TimerDisplay } from './TimerDisplay';
import { StepTransition } from './StepTransition';

interface Props {
  onClose: () => void;
}

const INITIAL_DURATION = 180;
const EXTENSION_SECONDS = 120;

function buildInitialState(session: CrisisSession | null) {
  return {
    step: (session?.step ?? 'RUNNING_3_MIN') as CrisisStep,
    extendedOnce: session?.extendedOnce ?? false,
    selectedTrigger: session?.selectedTrigger,
    finalOutcome: (session?.finalOutcome ?? 'iesire_rapida') as OutcomeType,
    persistedElapsed: session?.elapsedSeconds ?? 0,
    restore:
      session?.step === 'RUNNING_3_MIN' && session.startedAt > 0 && session.endsAt > session.startedAt
        ? { startedAt: session.startedAt, endsAt: session.endsAt }
        : null
  };
}

export const CrisisOverlay: React.FC<Props> = ({ onClose }) => {
  const initial = useMemo(() => buildInitialState(loadCrisisSession()), []);
  const [step, setStep] = useState<CrisisStep>(initial.step);
  const [extendedOnce, setExtendedOnce] = useState(initial.extendedOnce);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | undefined>(
    initial.selectedTrigger
  );
  const [finalOutcome, setFinalOutcome] = useState<OutcomeType>(initial.finalOutcome);
  const [persistedElapsed, setPersistedElapsed] = useState(initial.persistedElapsed);
  const [saveError, setSaveError] = useState<string | null>(null);
  const restoreRef = useRef(initial.restore);

  const isRunning3Min = step === 'RUNNING_3_MIN';

  const handleTimerComplete = useCallback(() => {
    hapticTap('light');
    setStep('DECOMPRESSION');
  }, []);

  const handleSnapshot = useCallback(
    (snapshot: {
      startedAt: number;
      endsAt: number;
      elapsedSeconds: number;
      secondsLeft: number;
      totalDuration: number;
    }) => {
      setPersistedElapsed(snapshot.elapsedSeconds);
      saveCrisisSession({
        version: 1,
        step: 'RUNNING_3_MIN',
        startedAt: snapshot.startedAt,
        endsAt: snapshot.endsAt,
        extendedOnce,
        elapsedSeconds: snapshot.elapsedSeconds,
        selectedTrigger,
        finalOutcome
      });
    },
    [extendedOnce, selectedTrigger, finalOutcome]
  );

  const { secondsLeft, totalDuration, elapsedSeconds, extend } = useWallClockTimer({
    isActive: isRunning3Min,
    initialDurationSeconds: INITIAL_DURATION,
    onComplete: handleTimerComplete,
    restore: restoreRef.current,
    onSnapshot: handleSnapshot
  });

  const durationForSave = isRunning3Min ? elapsedSeconds : persistedElapsed;

  useWakeLock(isRunning3Min);
  usePreventSwipeBack(isRunning3Min);

  useEffect(() => {
    if (step === 'RUNNING_3_MIN') return;

    const existing = loadCrisisSession();
    saveCrisisSession({
      version: 1,
      step,
      startedAt: existing?.startedAt ?? Date.now() - durationForSave * 1000,
      endsAt: existing?.endsAt ?? Date.now(),
      extendedOnce,
      elapsedSeconds: durationForSave,
      selectedTrigger,
      finalOutcome
    });
  }, [step, extendedOnce, selectedTrigger, finalOutcome, durationForSave]);

  const closeAndClear = useCallback(() => {
    clearCrisisSession();
    onClose();
  }, [onClose]);

  const handleAddTwoMinutes = () => {
    if (!extendedOnce) {
      hapticTap('light');
      extend(EXTENSION_SECONDS);
      setExtendedOnce(true);
    }
  };

  const handleEarlyExit = () => {
    const spent = isRunning3Min ? elapsedSeconds : persistedElapsed;
    if (spent < 5) {
      closeAndClear();
      return;
    }
    setPersistedElapsed(spent);
    hapticTap('light');
    setFinalOutcome('iesire_rapida');
    setStep('EARLY_EXIT_TRIGGER');
  };

  const saveEpisode = async (outcome: OutcomeType, trigger?: TriggerType) => {
    setSaveError(null);
    const episode: CravingEpisode = {
      timestamp: new Date().toISOString(),
      durationSeconds: durationForSave,
      trigger,
      outcome
    };
    const result = await saveEpisodeValidated(episode);
    if (!result.saved && result.reason === 'storage_error') {
      setSaveError(result.message ?? 'Salvarea a eșuat.');
      return false;
    }
    return result.saved || result.reason === 'skipped';
  };

  const finalizeDecompression = async (outcome: OutcomeType) => {
    hapticTap('medium');
    setFinalOutcome(outcome);
    const ok = await saveEpisode(outcome, selectedTrigger ?? 'doar_pofta');
    if (!ok) return;
    setStep('AFTERCARE');
  };

  const finalizeEarlyExit = async (trigger?: TriggerType) => {
    hapticTap('light');
    const ok = await saveEpisode('iesire_rapida', trigger);
    if (!ok) return;
    closeAndClear();
  };

  const handleSelectTrigger = (trigger: TriggerType) => {
    hapticTap('light');
    setSelectedTrigger(trigger);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] select-none overflow-y-auto animate-overlay-enter">
      {saveError && (
        <div className="absolute left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-xs text-amber-100">
          {saveError}
          <button
            type="button"
            onClick={() => setSaveError(null)}
            className="ml-3 underline text-amber-200"
          >
            Închide
          </button>
        </div>
      )}

      {step === 'RUNNING_3_MIN' && (
        <StepTransition key="running" className="flex flex-col justify-between min-h-full overscroll-x-none touch-pan-y">
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Protocol Activ</span>
            <button
              onClick={handleEarlyExit}
              className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full active:bg-slate-800 transition-colors duration-150"
            >
              Ies acum
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto text-center space-y-6 py-4">
            <TimerDisplay secondsLeft={secondsLeft} totalDuration={totalDuration} />

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                Pune telefonul jos. Bea un pahar cu apă rece sau spală-te pe față și ieși din bucătărie.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              {!extendedOnce ? (
                <button
                  onClick={handleAddTwoMinutes}
                  className="text-xs text-slate-400 border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-lg active:bg-slate-800 transition-colors duration-150"
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
                onClick={() => finalizeEarlyExit(trigger)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl active:bg-slate-800 transition-colors duration-150"
              >
                {TRIGGER_LABELS[trigger]}
              </button>
            ))}
          </div>
          <button
            onClick={() => finalizeEarlyExit()}
            className="w-full py-3 text-xs text-slate-400 underline"
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
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                  selectedTrigger === trigger
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 scale-[1.02]'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
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
                onClick={() => finalizeDecompression(value)}
                className={`${className} transition-all duration-150`}
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
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto text-xl">
                ○
              </div>
              <h3 className="text-lg font-medium text-slate-100">Ai mâncat. Este în regulă.</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Un episod izolat nu anulează nimic. Nu încerca să compensezi. Lasă restul deoparte, bea un pahar cu apă și schimbă camera.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h3 className="text-lg font-medium text-slate-100">Ai creat spațiu</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fiecare pauză contează. Ai lăsat timpul să lucreze între impuls și reacție — asta este victoria de azi.
              </p>
            </div>
          )}

          <button
            onClick={closeAndClear}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors duration-150"
          >
            Înapoi la ecranul principal
          </button>
        </StepTransition>
      )}
    </div>
  );
};
