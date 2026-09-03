import React, { useEffect, useState } from 'react';
import { exportDataSafe, loadEpisodesSafe } from '../db';
import {
  formatOutcomeBadge,
  formatTriggerLabel,
  isConsumed,
  isDeferred,
  isEarlyExit
} from '../constants';
import { CravingEpisode, getEpisodeStartedAt } from '../types';
import { JournalSkeleton } from './JournalSkeleton';

interface Props {
  onClose: () => void;
}

export const JournalView: React.FC<Props> = ({ onClose }) => {
  const [episodes, setEpisodes] = useState<CravingEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    async function loadData() {
      const result = await loadEpisodesSafe();
      if (result.ok) {
        setEpisodes(result.episodes);
        setLoadError(null);
      } else {
        setLoadError(result.message);
      }
      setLoading(false);
    }
    void loadData();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    setExportMessage(null);
    const result = await exportDataSafe();
    setExporting(false);

    if (result.ok) {
      setExportMessage(
        result.method === 'share'
          ? 'Export deschis în meniul de partajare.'
          : 'Fișierul JSON a fost descărcat.'
      );
      return;
    }

    if (result.reason === 'aborted') return;
    setExportMessage(result.message ?? 'Exportul a eșuat.');
  };

  const total = episodes.length;
  const deferred = episodes.filter((e) => isDeferred(e.outcome)).length;
  const consumed = episodes.filter((e) => isConsumed(e.outcome)).length;
  const earlyExit = episodes.filter((e) => isEarlyExit(e.outcome)).length;

  const hourCounts: { [hour: number]: number } = {};
  episodes.forEach((e) => {
    const start = getEpisodeStartedAt(e);
    if (!start) return;
    const hour = new Date(start).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Jurnal și tipare"
      tabIndex={-1}
      className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] overflow-y-auto animate-overlay-enter outline-none"
    >
      <div className="flex justify-between items-center pb-6 border-b border-slate-900">
        <div>
          <h2 className="text-lg font-medium text-slate-100">Jurnal & Conștientizare</h2>
          <p className="text-xs text-slate-400">Maparea tiparelor, fără judecată</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full active:bg-slate-800 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          Închide
        </button>
      </div>

      {loading ? (
        <JournalSkeleton />
      ) : loadError ? (
        <div className="my-auto text-center space-y-3 py-12 animate-step-enter max-w-sm mx-auto">
          <p className="text-sm text-amber-200" role="alert">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs text-slate-300 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Reîncearcă
          </button>
        </div>
      ) : total === 0 ? (
        <div className="my-auto text-center space-y-2 py-12 animate-step-enter">
          <p className="text-sm text-slate-300">Încă nu ai înregistrat niciun episod.</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            La următorul impuls, apasă butonul indigo de pe ecranul principal.
          </p>
        </div>
      ) : (
        <div className="space-y-6 pt-6 animate-step-enter">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-slate-100">{total}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Intervenții</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-indigo-300">{deferred}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Amânate</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-amber-400">{consumed}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Consumate</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-slate-400">{earlyExit}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Ieșiri rapide</div>
            </div>
          </div>

          {total >= 10 ? (
            sortedHours.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider">Intervale vulnerabile frecvente</h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {sortedHours.map((item) => (
                    <span key={item.hour} className="text-xs bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-indigo-300">
                      {item.hour}:00 - {item.hour + 1}:00 ({item.count} {item.count === 1 ? 'episod' : 'episoade'})
                    </span>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Continuă să înregistrezi — tiparele orare devin clare după cel puțin 10 episoade ({total}/10 până acum).
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider">Istoric Episoade</h3>
            <div className="space-y-2">
              {episodes.map((e) => {
                const start = getEpisodeStartedAt(e);
                const date = new Date(start);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                const badge = formatOutcomeBadge(e.outcome);
                return (
                  <div key={e.id} className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-200">{timeStr}</span>
                        <span className="text-[10px] text-slate-500">({dateStr})</span>
                        <span className="text-[11px] text-slate-400">· {formatTriggerLabel(e.trigger)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Timp în protocol: {Math.floor(e.durationSeconds / 60)}m {e.durationSeconds % 60}s
                        {e.extendedTime ? ' · +2m' : ''}
                      </div>
                    </div>
                    <div>
                      <span className={`${badge.className} px-2 py-0.5 rounded text-[11px]`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 pb-8">
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-xl active:bg-slate-800 flex items-center justify-center space-x-2 cursor-pointer transition-colors duration-150 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              <span>{exporting ? 'Se exportă...' : 'Exportă datele (JSON / Salvează în Fișiere)'}</span>
            </button>
            {exportMessage && (
              <p className="text-[10px] text-indigo-300 text-center mt-2" role="status">{exportMessage}</p>
            )}
            <p className="text-[10px] text-slate-500 text-center mt-2">
              Datele tale rămân 100% private pe acest dispozitiv.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
