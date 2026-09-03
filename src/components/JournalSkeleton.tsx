export function JournalSkeleton() {
  return (
    <div className="space-y-6 pt-6 animate-pulse" aria-hidden="true">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 p-3 rounded-xl h-[4.5rem]" />
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl h-20" />

      <div className="space-y-3">
        <div className="h-3 w-32 bg-slate-800 rounded" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/70 border border-slate-800/80 p-3 rounded-xl h-14" />
          ))}
        </div>
      </div>
    </div>
  );
}
