import React, { useState, useEffect } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import { usePreventSwipeBack } from '../hooks/usePreventSwipeBack';
import { saveEpisodeValidated } from '../db';
import {
  DECOMPRESSION_OUTCOMES,
  TRIGGER_LABELS,
  TRIGGERS
} from '../constants';
import { CravingEpisode, OutcomeType, TriggerType } from '../types';

interface Props {
  onClose: () => void;
}

type Step = 'RUNNING_3_MIN' | 'EARLY_EXIT_TRIGGER' | 'DECOMPRESSION' | 'AFTERCARE';

export const CrisisOverlay: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('RUNNING_3_MIN');
  const [secondsLeft, setSecondsLeft] = useState(180);
  const [totalSpent, setTotalSpent] = useState(0);
  const [extendedOnce, setExtendedOnce] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | undefined>();
  const [finalOutcome, setFinalOutcome] = useState<OutcomeType>('iesire_rapida');

  const isRunning3Min = step === 'RUNNING_3_MIN';
  useWakeLock(isRunning3Min);
  usePreventSwipeBack(isRunning3Min);

  useEffect(() => {
    if (step !== 'RUNNING_3_MIN') return;
    const interval = setInterval(() => {
      setTotalSpent((prev) => prev + 1);
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep('DECOMPRESSION');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handleAddTwoMinutes = () => {
    if (!extendedOnce) {
      setSecondsLeft((prev) => prev + 120);
      setExtendedOnce(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleEarlyExit = () => {
    if (totalSpent < 5) {
      onClose();
      return;
    }
    setFinalOutcome('iesire_rapida');
    setStep('EARLY_EXIT_TRIGGER');
  };

  const saveEpisode = async (outcome: OutcomeType, trigger?: TriggerType) => {
    const episode: CravingEpisode = {
      timestamp: new Date().toISOString(),
      durationSeconds: totalSpent,
      trigger,
      outcome
    };
    return saveEpisodeValidated(episode);
  };

  const finalizeDecompression = async (outcome: OutcomeType) => {
    setFinalOutcome(outcome);
    await saveEpisode(outcome, selectedTrigger ?? 'doar_pofta');
    setStep('AFTERCARE');
  };

  const finalizeEarlyExit = async (trigger?: TriggerType) => {
    await saveEpisode('iesire_rapida', trigger);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] select-none overflow-y-auto">
      {step === 'RUNNING_3_MIN' && (
        <div className="flex flex-col justify-between min-h-full overscroll-x-none touch-pan-y">
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Protocol Activ</span>
            <button
              onClick={handleEarlyExit}
              className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full active:bg-slate-800"
            >
              Ies acum
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto text-center space-y-6 py-4">
            <div className="text-6xl font-light tracking-tighter tabular-nums text-indigo-200">
              {formatTime(secondsLeft)}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                Pune telefonul jos. Bea un pahar cu apă rece sau spală-te pe față și ieși din bucătărie.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              {!extendedOnce ? (
                <button
                  onClick={handleAddTwoMinutes}
                  className="text-xs text-slate-400 border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-lg active:bg-slate-800"
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
        </div>
      )}

      {step === 'EARLY_EXIT_TRIGGER' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto w-full text-center py-4">
          <h2 className="text-lg font-medium text-slate-200">Ce te-a făcut să renunți?</h2>
          <p className="text-xs text-slate-400">Opțional — alege un motiv cu o singură atingere:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                onClick={() => finalizeEarlyExit(trigger)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl active:bg-slate-800"
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
        </div>
      )}

      {step === 'DECOMPRESSION' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto w-full py-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-medium text-slate-100">Valul s-a oprit</h2>
            <p className="text-xs text-slate-400">Ce simțeai că a împins impulsul?</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {TRIGGERS.map((trigger) => (
              <button
                key={trigger}
                onClick={() => setSelectedTrigger(trigger)}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  selectedTrigger === trigger
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
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
                className={className}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'AFTERCARE' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto text-center py-4">
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
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-medium"
          >
            Înapoi la ecranul principal
          </button>
        </div>
      )}
    </div>
  );
};
