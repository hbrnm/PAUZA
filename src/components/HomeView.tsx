import React from 'react';
import { hapticTap } from '../hooks/useHaptic';

interface Props {
  onTriggerSOS: () => void;
  onOpenJournal: () => void;
}

export const HomeView: React.FC<Props> = ({ onTriggerSOS, onOpenJournal }) => {
  const handleTriggerSOS = () => {
    hapticTap('medium');
    onTriggerSOS();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] select-none overflow-y-auto">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">PAUZĂ V1</span>
        <button
          onClick={onOpenJournal}
          className="text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full active:bg-slate-800 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Jurnal & Tipare
        </button>
      </div>

      <div className="flex flex-col items-center justify-center my-auto py-8 space-y-8 text-center">
        <div className="relative w-[17rem] h-[17rem] flex items-center justify-center">
          <span
            className="absolute inset-0 m-auto w-[16.5rem] h-[16.5rem] rounded-full border-2 border-indigo-400/50 pauza-pulse-ring-outer pointer-events-none"
            aria-hidden="true"
          />
          <span
            className="absolute inset-0 m-auto w-[15rem] h-[15rem] rounded-full bg-indigo-500/40 blur-sm pauza-pulse-ring pointer-events-none"
            aria-hidden="true"
          />
          <button
            onClick={handleTriggerSOS}
            aria-label="Am poftă acum — pornește pauza de 3 minute"
            className="relative z-10 w-64 h-64 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-500 pauza-pulse-btn flex flex-col items-center justify-center transition-transform duration-150 ease-out active:scale-95 p-4 touch-manipulation cursor-pointer border-4 border-indigo-400/50 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-300"
          >
            <span className="text-2xl font-black tracking-tight text-white uppercase">AM POFTĂ ACUM</span>
            <span className="text-xs text-indigo-200 mt-2 font-medium">3 minute pauză</span>
          </button>
        </div>

        <p className="text-sm text-slate-200 leading-relaxed max-w-xs">
          Nu trebuie să iei nicio decizie acum. Punem doar o pauză între impuls și acțiune. Lasă secundele să lucreze pentru tine.
        </p>
      </div>

      <div className="text-center text-[11px] text-slate-500 leading-relaxed pt-4 max-w-sm mx-auto">
        Ancoră utilă: Pune un post-it cu textul «3 MINUTE» pe frigider sau dulap.
      </div>
    </div>
  );
};
