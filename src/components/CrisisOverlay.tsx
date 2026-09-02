import React, { useState, useEffect } from 'react';
import { useWakeLock } from '../hooks/useWakeLock';
import { db, ensurePersistenceAfterEngagement } from '../db';
import { CravingEpisode, TriggerType, OutcomeType } from '../types';

interface Props {
  onClose: () => void;
}

type Step = 'RUNNING' | 'EARLY_EXIT_TRIGGER' | 'DECOMPRESSION' | 'AFTERCARE';

export const CrisisOverlay: React.FC<Props> = ({ onClose }) => {
  const [step, setStep] = useState<Step>('RUNNING');
  const [secondsLeft, setSecondsLeft] = useState(180); // 3 minute start
  const [totalSpent, setTotalSpent] = useState(0);
  const [extendedOnce, setExtendedOnce] = useState(false);
  const [actionDone, setActionDone] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType | undefined>();
  const [finalOutcome, setFinalOutcome] = useState<OutcomeType>('iesire_rapida');

  useWakeLock(step === 'RUNNING');

  useEffect(() => {
    if (step !== 'RUNNING') return;
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
    setFinalOutcome('iesire_rapida');
    setStep('EARLY_EXIT_TRIGGER');
  };

  const saveEpisode = async (outcome: OutcomeType, trigger?: TriggerType) => {
    const episode: CravingEpisode = {
      timestamp: new Date().toISOString(),
      durationSeconds: totalSpent,
      trigger: trigger || 'alta',
      actionTaken: actionDone,
      outcome
    };
    await db.episodes.add(episode);
    await ensurePersistenceAfterEngagement();
  };

  const finalizeDecompression = async (outcome: OutcomeType) => {
    setFinalOutcome(outcome);
    await saveEpisode(outcome, selectedTrigger || 'alta');
    setStep('AFTERCARE');
  };

  const finalizeEarlyExit = async (trigger?: TriggerType) => {
    await saveEpisode('iesire_rapida', trigger || 'alta');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 select-none overflow-y-auto">
      {/* 1. RUNNING */}
      {step === 'RUNNING' && (
        <div className="flex flex-col justify-between h-full touch-none">
          <div className="flex justify-between items-center pt-2">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Protocol Activ</span>
            <button
              onClick={handleEarlyExit}
              className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full active:bg-slate-800"
            >
              Ies acum
            </button>
          </div>

          <div className="flex flex-col items-center justify-center my-auto text-center space-y-6">
            <div className="text-6xl font-light tracking-tighter tabular-nums text-indigo-200">
              {formatTime(secondsLeft)}
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl max-w-sm">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                Mergi la baie și dă-ți cu <strong>apă foarte rece</strong> pe față și pe ceafă.
              </p>
            </div>

            <div className="flex flex-col items-center space-y-3">
              <label className="flex items-center space-x-3 bg-slate-900/60 border border-slate-800 px-4 py-3 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={actionDone}
                  onChange={(e) => setActionDone(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-700 text-indigo-600 focus:ring-0 bg-slate-950"
                />
                <span className="text-xs text-slate-300">Am făcut acțiunea cu apă rece</span>
              </label>

              {!extendedOnce ? (
                <button
                  onClick={handleAddTwoMinutes}
                  className="text-xs text-slate-400 border border-slate-800 bg-slate-900/40 px-3 py-1.5 rounded-lg active:bg-slate-800"
                >
                  +2 minute (mai stau puțin)
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

      {/* 2. EARLY_EXIT_TRIGGER */}
      {step === 'EARLY_EXIT_TRIGGER' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto w-full text-center py-4">
          <h2 className="text-lg font-medium text-slate-200">Ce a declanșat renunțarea?</h2>
          <p className="text-xs text-slate-400">Selectează un motiv sau sari direct:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['oboseala', 'stres', 'nervi', 'foame_reala', 'plictiseala', 'alta'] as TriggerType[]).map((t) => (
              <button
                key={t}
                onClick={() => finalizeEarlyExit(t)}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl active:bg-slate-800 capitalize"
              >
                {t === 'alta' ? 'Alt motiv' : t.replace('_', ' ')}
              </button>
            ))}
          </div>
          <button
            onClick={() => finalizeEarlyExit('alta')}
            className="w-full py-3 text-xs text-slate-400 underline"
          >
            Sari peste și închide
          </button>
        </div>
      )}

      {/* 3. DECOMPRESSION */}
      {step === 'DECOMPRESSION' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto w-full py-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-medium text-slate-100">Valul s-a oprit</h2>
            <p className="text-xs text-slate-400">Ce simțeai că a împins impulsul?</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {(['oboseala', 'stres', 'nervi', 'foame_reala', 'plictiseala', 'alta'] as TriggerType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTrigger(t)}
                className={`p-3 rounded-xl border text-left capitalize transition-colors ${
                  selectedTrigger === t
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {t === 'alta' ? 'Doar poftă / Altul' : t.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-xs text-center text-slate-400 mb-2">Care este decizia ta acum?</p>
            <button
              onClick={() => finalizeDecompression('a_trecut')}
              className="w-full py-3.5 bg-emerald-600 font-medium rounded-xl text-sm active:bg-emerald-500"
            >
              A trecut pofta
            </button>
            <button
              onClick={() => finalizeDecompression('am_amanat')}
              className="w-full py-3.5 bg-slate-800 font-medium rounded-xl text-sm active:bg-slate-700"
            >
              Mai amân decizia
            </button>
            <button
              onClick={() => finalizeDecompression('am_mancat_totusi')}
              className="w-full py-3.5 bg-slate-900 border border-slate-800 font-medium text-slate-400 rounded-xl text-sm active:bg-slate-800"
            >
              Am mâncat totuși
            </button>
          </div>
        </div>
      )}

      {/* 4. AFTERCARE */}
      {step === 'AFTERCARE' && (
        <div className="my-auto space-y-6 max-w-sm mx-auto text-center py-4">
          {finalOutcome === 'am_mancat_totusi' ? (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl">
                🛡️
              </div>
              <h3 className="text-lg font-medium text-slate-100">Oprirea la jumătate este o victorie</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Faptul că ai mâncat ceva dulce nu anulează nimic. Nu încerca să compensezi. Lasă restul deoparte, bea un pahar cu apă și schimbă camera.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl">
                ✓
              </div>
              <h3 className="text-lg font-medium text-slate-100">Ai rupt pilotul automat</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fiecare amânare resetează circuitele de dopamină. Ai creat spațiu între impuls și acțiune.
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
