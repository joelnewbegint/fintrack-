import React, { useState, useEffect } from 'react';
import { Briefcase, BarChart3, ArrowLeftRight } from 'lucide-react';

/**
 * Option 2 – Single Swap Chip Toggle
 *
 * Compact, modern Single Swap Chip pill toggle for switching between Loans and EMI.
 * - Circular icon circle on the left (26px): Briefcase (#BFE3F7) for Loans / BarChart3 (#BDEBDD) for EMI
 * - Text: Loans / EMI (#0C3B5C)
 * - Swap exchange arrows on the right (#7A93A3)
 * - Smooth rotation and color transition (300-400ms)
 * - Height: 40px, padding: 14px, rounded-full pill
 */
export const SingleSwapChip = ({
  activeMode = 'loans',
  onToggle,
  className = '',
}) => {
  const [currentMode, setCurrentMode] = useState(activeMode);

  useEffect(() => {
    setCurrentMode(activeMode);
  }, [activeMode]);

  const isEmi = currentMode === 'emi';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nextMode = isEmi ? 'loans' : 'emi';
    setCurrentMode(nextMode);

    if (onToggle) {
      // Allow the 100ms micro-spring physics to kick in before routing/state transition
      setTimeout(() => {
        onToggle();
      }, 100);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isEmi ? 'Switch to Loans' : 'Switch to EMI'}
      title={isEmi ? 'Switch to Loans / கடன்' : 'Switch to EMI / மாத தவணை'}
      className={`group inline-flex items-center gap-2 rounded-full cursor-pointer select-none transition-all duration-300 shadow-xs hover:shadow-sm active:scale-95 ${className}`}
      style={{
        backgroundColor: '#FBF6EC',
        border: '1px solid #D9E8F2',
        color: '#0C3B5C',
        height: '40px',
        paddingLeft: '14px',
        paddingRight: '14px',
      }}
    >
      {/* Left Circular Icon Container (26px) */}
      <span
        className="flex items-center justify-center shrink-0"
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: isEmi ? '#BDEBDD' : '#BFE3F7',
          transform: `rotate(${isEmi ? 360 : 0}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.4, 0.64, 1), background-color 0.35s ease',
        }}
      >
        {isEmi ? (
          <BarChart3 className="w-[14px] h-[14px] text-[#0C3B5C] transition-opacity duration-300" strokeWidth={2.2} />
        ) : (
          <Briefcase className="w-[14px] h-[14px] text-[#0C3B5C] transition-opacity duration-300" strokeWidth={2.2} />
        )}
      </span>

      {/* Active Text Label */}
      <span
        className="font-medium text-[14px] tracking-tight whitespace-nowrap"
        style={{ color: '#0C3B5C' }}
      >
        {isEmi ? 'EMI' : 'Loans'}
      </span>

      {/* Right Swap / Exchange Arrows Icon */}
      <ArrowLeftRight
        className="w-[15px] h-[15px] shrink-0 transition-transform duration-300 group-hover:rotate-180"
        style={{ color: '#7A93A3' }}
        strokeWidth={2}
      />
    </button>
  );
};

export default SingleSwapChip;

