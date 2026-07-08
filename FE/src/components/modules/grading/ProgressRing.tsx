interface ProgressRingProps {
  score: number;
  maxScore: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({ score, maxScore, size = 160, strokeWidth = 8 }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const offset = circumference - (percent / 100) * circumference;

  let color = 'text-red-500';
  if (percent >= 85) color = 'text-emerald-500';
  else if (percent >= 70) color = 'text-blue-500';
  else if (percent >= 50) color = 'text-amber-500';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="transform -rotate-90 drop-shadow-sm" width={size} height={size}>
        <circle
          className="text-slate-100 dark:text-slate-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${color} transition-all duration-1000 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`font-bold text-slate-800 dark:text-slate-100 tracking-tight ${size < 120 ? 'text-3xl' : 'text-4xl'}`}>{score}</span>
        <span className={`text-slate-500 dark:text-slate-400 font-medium ${size < 120 ? 'text-xs' : 'text-sm'}`}>/ {maxScore}</span>
      </div>
    </div>
  );
}
