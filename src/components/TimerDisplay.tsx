interface Props {
  secondsLeft: number;
  totalDuration: number;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function TimerDisplay({ secondsLeft, totalDuration }: Props) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const progress = totalDuration > 0 ? (totalDuration - secondsLeft) / totalDuration : 0;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="relative w-52 h-52 flex items-center justify-center">
      <svg
        className="absolute inset-0 -rotate-90"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgb(30 41 59)"
          strokeWidth="4"
        />
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="rgb(129 140 248)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <div
        key={secondsLeft}
        className="timer-tick text-6xl font-light tracking-tighter tabular-nums text-indigo-200"
      >
        {formatTime(secondsLeft)}
      </div>
    </div>
  );
}
