import React from 'react';

interface Props {
  onTriggerSOS: () => void;
  onOpenJournal: () => void;
}

export const HomeView: React.FC<Props> = ({ onTriggerSOS, onOpenJournal }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] select-none overflow-y-auto">
      {/* Top Bar */}
      <div className="flex justify-end items-center">
        <button
          onClick={onOpenJournal}
          className="text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full active:bg-slate-800 transition-colors"
        >
          Jurnal & Tipare
        </button>
      </div>

      {/* Buton Central SOS */}
      <div className="flex flex-col items-center justify-center my-auto py-8 space-y-8 text-center">
        <button
          onClick={onTriggerSOS}
          className="w-64 h-64 rounded-full bg-red-600 active:bg-red-700 shadow-[0_0_60px_rgba(220,38,38,0.35)] flex flex-col items-center justify-center transition-transform active:scale-95 p-4 touch-manipulation cursor-pointer border-4 border-red-500/20 shrink-0"
        >
          <span className="text-2xl font-black tracking-tight text-white uppercase">AM POFTĂ ACUM</span>
          <span className="text-xs text-red-200 mt-2 font-medium">3 minute de pauză</span>
        </button>

        <div className="space-y-2 max-w-xs">
          <p className="text-sm font-medium text-slate-200">
            Nu trebuie să iei nicio decizie acum.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Punem doar o pauză între impuls și reacție. Lași secundele să lucreze pentru tine.
          </p>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[11px] text-slate-600 tracking-wide pt-4">
        Faza 1: Recâștigarea controlului
      </div>
    </div>
  );
};
