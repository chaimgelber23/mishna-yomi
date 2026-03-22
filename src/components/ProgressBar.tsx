'use client';

interface ProgressBarProps {
  value: number;     // 0–100
  total?: number;
  completed?: number;
  showLabel?: boolean;
  height?: 'sm' | 'md' | 'lg';
  color?: 'gold' | 'green' | 'blue';
  animate?: boolean;
  className?: string;
}

const heightMap = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorMap = {
  gold:  'from-gold-700 to-gold-400',
  green: 'from-green-700 to-green-400',
  blue:  'from-blue-700 to-blue-400',
};

export default function ProgressBar({
  value,
  total,
  completed,
  showLabel = false,
  height = 'md',
  color = 'gold',
  animate = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full ${className}`}>
      {showLabel && total !== undefined && completed !== undefined && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-slate-500">
            {completed.toLocaleString()} / {total.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-gold-400">{pct.toFixed(1)}%</span>
        </div>
      )}
      <div className={`w-full bg-navy-700 rounded-full overflow-hidden ${heightMap[height]}`}>
        <div
          className={`${heightMap[height]} bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-700 ease-out ${animate ? 'animate-shimmer' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
