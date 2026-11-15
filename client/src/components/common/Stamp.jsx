import React from 'react';

/**
 * Reusable Vector Stamp Component (<Stamp />)
 * Strictly Black & White (#000 stroke) with optional ink turbulence texture.
 * Prints razor-sharp at 300+ DPI.
 */
export const Stamp = ({
  type = 'ACTIVE',
  date = '',
  variant = 'rectangular', // 'rectangular' | 'round'
  safePrint = false,
  className = '',
  rotation = null,
}) => {
  const normType = String(type || 'ACTIVE').toUpperCase();
  const displayDate = date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ---------------------------------------------------------------------------
  // 1. ROUND COMPANY SEAL (bottom-right near officer signature)
  // ---------------------------------------------------------------------------
  if (variant === 'round') {
    const rot = rotation !== null ? rotation : -4;
    return (
      <div
        className={`inline-block select-none pointer-events-none ${className}`}
        style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
      >
        <svg
          width="130"
          height="130"
          viewBox="0 0 130 130"
          className="text-black"
          style={{ opacity: 0.88 }}
        >
          <defs>
            {!safePrint && (
              <filter id="roundStampFilter" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" />
              </filter>
            )}
            {/* Curved text paths */}
            <path
              id="sealTopPath"
              d="M 18,65 A 47,47 0 0,1 112,65"
              fill="none"
            />
            <path
              id="sealBottomPath"
              d="M 112,65 A 47,47 0 0,1 18,65"
              fill="none"
            />
          </defs>

          <g filter={!safePrint ? 'url(#roundStampFilter)' : undefined}>
            {/* Outer circles */}
            <circle cx="65" cy="65" r="58" fill="none" stroke="#000" strokeWidth="2.5" />
            <circle cx="65" cy="65" r="53.5" fill="none" stroke="#000" strokeWidth="0.8" />

            {/* Inner circle */}
            <circle cx="65" cy="65" r="33" fill="none" stroke="#000" strokeWidth="1.2" strokeDasharray="3 2" />

            {/* Curved Text Top: VK BANKER'S & FINANCE */}
            <text fill="#000" fontSize="9" fontWeight="900" letterSpacing="2.2">
              <textPath href="#sealTopPath" startOffset="50%" textAnchor="middle">
                VK BANKER'S &amp; FINANCE
              </textPath>
            </text>

            {/* Curved Text Bottom: REG: TN-VKB-2024 */}
            <text fill="#000" fontSize="8" fontWeight="800" letterSpacing="1.8">
              <textPath href="#sealBottomPath" startOffset="50%" textAnchor="middle">
                REG: TN-VKB-2024
              </textPath>
            </text>

            {/* Star & Center Content */}
            <text x="65" y="56" fill="#000" fontSize="13" textAnchor="middle">
              &#9733;
            </text>
            <text
              x="65"
              y="70"
              fill="#000"
              fontSize="8.5"
              fontWeight="900"
              letterSpacing="2"
              textAnchor="middle"
            >
              OFFICIAL
            </text>
            <text
              x="65"
              y="80"
              fill="#000"
              fontSize="6.5"
              fontWeight="700"
              textAnchor="middle"
            >
              SEAL
            </text>
          </g>
        </svg>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. STATUS STAMP (rectangular, rotated -12deg)
  // ---------------------------------------------------------------------------
  const rot = rotation !== null ? rotation : -12;
  const isOverdue = normType === 'OVERDUE';
  const isCompleted = normType === 'COMPLETED' || normType === 'PAID';

  return (
    <div
      className={`inline-block select-none pointer-events-none ${className}`}
      style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}
    >
      <svg
        width="165"
        height="64"
        viewBox="0 0 165 64"
        className="text-black"
        style={{ opacity: 0.92 }}
      >
        <defs>
          {!safePrint && (
            <filter id="rectStampFilter" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
            </filter>
          )}

          {/* Diagonal hatch pattern for OVERDUE */}
          {isOverdue && (
            <pattern id="overdueHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#000" strokeWidth="0.8" opacity="0.3" />
            </pattern>
          )}
        </defs>

        <g filter={!safePrint ? 'url(#rectStampFilter)' : undefined}>
          {/* Background fill if hatched */}
          {isOverdue && (
            <rect x="3" y="3" width="159" height="58" rx="4" fill="url(#overdueHatch)" />
          )}

          {/* Outer Border */}
          <rect
            x="3"
            y="3"
            width="159"
            height="58"
            rx="5"
            fill="none"
            stroke="#000"
            strokeWidth={isOverdue ? "2.5" : "3"}
          />

          {/* Inner hairline border for OVERDUE or COMPLETED */}
          {(isOverdue || isCompleted) && (
            <rect
              x="6"
              y="6"
              width="153"
              height="52"
              rx="3"
              fill="none"
              stroke="#000"
              strokeWidth="0.8"
            />
          )}

          {/* Stamp Title */}
          <text
            x="82"
            y="34"
            fill="#000"
            fontSize="18"
            fontWeight="900"
            letterSpacing="3"
            textAnchor="middle"
            fontFamily="'Inter', 'Arial Black', sans-serif"
          >
            {normType}
          </text>

          {/* Verification / Date Rule */}
          <line x1="20" y1="41" x2="145" y2="41" stroke="#000" strokeWidth="0.8" />

          {/* Stamp Sub-label / Date */}
          <text
            x="82"
            y="52"
            fill="#000"
            fontSize="7"
            fontWeight="700"
            letterSpacing="1.2"
            textAnchor="middle"
            fontFamily="'JetBrains Mono', monospace"
          >
            {normType === 'COMPLETED' ? `CLOSED ON ${displayDate}` : `VERIFIED: ${displayDate}`}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default Stamp;

