import React, { useEffect, useState } from 'react';
import { db, exportDataSafe } from '../db';
import { CravingEpisode } from '../types';

interface Props {
  onClose: () => void;
}

export const JournalView: React.FC<Props> = ({ onClose }) => {
  const [episodes, setEpisodes] = useState<CravingEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await db.episodes.orderBy('timestamp').reverse().toArray();
      setEpisodes(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const total = episodes.length;
  const managed = episodes.filter(e => e.outcome === 'a_trecut' || e.outcome === 'am_amanat').length;
  const ate = episodes.filter(e => e.outcome === 'am_mancat_totusi').length;
  const earlyExit = episodes.filter(e => e.outcome === 'iesire_rapida').length;

  const hourCounts: { [hour: number]: number } = {};
  episodes.forEach(e => {
    const hour = new Date(e.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const sortedHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const formatOutcomeBadge = (outcome: CravingEpisode['outcome']) => {
    switch (outcome) {
      case 'a_trecut':
        return <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px]">A trecut</span>;
      case 'am_amanat':
        return <span className="text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded text-[11px]">Amânat</span>;
      case 'am_mancat_totusi':
        return <span className="text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded text-[11px]">Consumat</span>;
      case 'iesire_rapida':
        return <span className="text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">Ieșire rapidă</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col p-6 pt-[env(safe-area-inset-top,1.5rem)] pb-[env(safe-area-inset-bottom,1.5rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-slate-900">
        <div>
          <h2 className="text-lg font-medium text-slate-100">Jurnal & Conștientizare</h2>
          <p className="text-xs text-slate-400">Maparea tiparelor, fără judecată</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full active:bg-slate-800"
        >
          Închide
        </button>
      </div>

      {loading ? (
        <div className="my-auto text-center text-xs text-slate-500">Se încarcă datele...</div>
      ) : total === 0 ? (
        <div className="my-auto text-center space-y-2 py-12">
          <p className="text-sm text-slate-300">Încă nu ai înregistrat niciun episod.</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            La următorul impuls de dulce, apasă butonul roșu de pe ecranul principal.
          </p>
        </div>
      ) : (
        <div className="space-y-6 pt-6">
          {/* Card Rezumat Comportament */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-emerald-400">{managed}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Gestionate</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-amber-400">{ate}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Consumate</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div className="text-xl font-semibold text-slate-400">{earlyExit}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Ieșiri rapide</div>
            </div>
          </div>

          {/* Ore critice cu gardă de prag total >= 10 */}
          {total >= 10 ? (
            sortedHours.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider">Intervale vulnerabile frecvente</h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {sortedHours.map(item => (
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
                Continuă să înregistrezi — tiparele orare devin clare după mai multe episoade ({total}/10 până acum).
              </p>
            </div>
          )}

          {/* Listă Istoric */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-slate-300 uppercase tracking-wider">Istoric Episoade</h3>
            <div className="space-y-2">
              {episodes.map(e => {
                const date = new Date(e.timestamp);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                return (
                  <div key={e.id} className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-slate-200">{timeStr}</span>
                        <span className="text-[10px] text-slate-500">({dateStr})</span>
                        <span className="text-[11px] text-slate-400 capitalize">· {e.trigger?.replace('_', ' ') || 'alta'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Timp în protocol: {Math.floor(e.durationSeconds / 60)}m {e.durationSeconds % 60}s
                        {e.actionTaken && ' · Apă rece bifată'}
                      </div>
                    </div>
                    <div>
                      {formatOutcomeBadge(e.outcome)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Export Securizat */}
          <div className="pt-4 pb-8">
            <button
              onClick={exportDataSafe}
              className="w-full py-3 bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium rounded-xl active:bg-slate-800 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Exportă datele (JSON / Salvează în Fișiere)</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2">
              Datele tale rămân 100% private pe acest dispozitiv.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
