import React from 'react';

/**
 * Circular Collection Progress Ring for Golden Cream Theme
 * - Accent-deep stroke (#C88A00)
 * - Pure white track (#FFFFFF) with subtle soft gold glow
 * - Center display with percentage and tabular figures
 */
export const ProgressRing = ({
  radius = 64,
  stroke = 10,
  progress = 0,
  collected = 0,
  target = 0,
  label = 'Collected',
}) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background Track (White) */}
        <circle
          stroke="#FFFFFF"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Active Progress Stroke (Accent-Deep: #C88A00) */}
        <circle
          stroke="#C88A00"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>

      {/* Center Percentage Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl sm:text-2xl font-black text-ink tabular-nums tracking-tight">
          {Math.round(clampedProgress)}%
        </span>
        {label && (
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProgressRing;

