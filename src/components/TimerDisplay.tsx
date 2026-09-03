interface Props {
  secondsLeft: number;
  totalDuration: number;
  /** Brief "+2 minute" flash after extend */
  extendFlash?: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function TimerDisplay({ secondsLeft, totalDuration, extendFlash = false }: Props) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const progress = totalDuration > 0 ? (totalDuration - secondsLeft) / totalDuration : 0;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  const label = formatTime(secondsLeft);

  return (
    <div className="relative w-56 h-56 flex items-center justify-center">
      <div className="absolute inset-0 pauza-timer-breathe" aria-hidden="true">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 200 200"
        >
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgb(51 65 85)"
            strokeWidth="6"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="rgb(99 102 241)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={extendFlash ? 'pauza-timer-ring-extend' : 'pauza-timer-ring'}
          />
        </svg>
      </div>

      {extendFlash && (
        <span
          className="absolute top-3 left-1/2 z-20 text-[11px] font-medium tracking-wide text-indigo-300 pauza-extend-flash pointer-events-none"
          aria-live="polite"
        >
          +2 minute
        </span>
      )}

      <div
        key={secondsLeft}
        role="timer"
        aria-label={`Timp rămas ${label}`}
        className="animate-timer-tick relative z-10 text-6xl font-light tracking-tighter tabular-nums text-indigo-200"
      >
        {label}
      </div>
    </div>
  );
}
