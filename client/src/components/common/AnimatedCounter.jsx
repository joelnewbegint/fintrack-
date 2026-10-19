import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../utils/currency';
import { useComfort } from '../../context/ComfortContext';

export const AnimatedCounter = ({
  value = 0,
  duration = 1000,
  isCurrency = true,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const { reducedMotion } = useComfort();
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    let start = displayValue;
    const end = Number(value) || 0;
    if (start === end) return;

    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (end - start) * easeProgress);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(end);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration, reducedMotion]);

  const formatted = isCurrency
    ? formatCurrency(displayValue)
    : `${prefix}${displayValue.toLocaleString('en-IN')}${suffix}`;

  return (
    <span className={`tabular-nums font-bold tracking-tight ${className}`}>
      {formatted}
    </span>
  );
};

export default AnimatedCounter;
