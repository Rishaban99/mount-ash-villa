'use client';

import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 120, showText = true, style }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={style}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-slate-900 select-none"
      >
        {/* Outer Circular Boundaries */}
        <circle cx="100" cy="100" r="94" stroke="currentColor" fill="none" strokeWidth="4" />
        <circle cx="100" cy="100" r="88" stroke="currentColor" fill="none" strokeWidth="1.5" />

        {/* Mountain Ridge Drawing */}
        <path
          d="M 14 102 L 55 102 C 68 100 76 92 86 82 L 102 52 L 118 103 L 123 93 L 128 101 L 133 93 L 137 100 L 140 92 L 144 100 L 148 95 L 152 102 L 186 102"
          fill="none"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Elegant Mountain Peak Accent Path */}
        <path
          d="M 98 56 L 102 52 L 105 60"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {showText && (
          <>
            {/* "Mount" styled text */}
            <text
              x="92"
              y="126"
              textAnchor="middle"
              fill="currentColor"
              className="font-sans"
              style={{
                fontFamily: '"Impact", "Arial Black", "Inter", sans-serif',
                fontWeight: 900,
                fontSize: '25px',
                letterSpacing: '-0.5px',
              }}
            >
              Mount
            </text>

            {/* Ash Branch/Stars emblem element next to "Mount" text */}
            <g transform="translate(136, 114) scale(0.95)" fill="currentColor">
              {/* Branch Arc lines */}
              <path d="M 0 10 A 10 10 0 0 1 12 -2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 0 10 A 12 12 0 0 1 12 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 0 10 A 14 14 0 0 1 10 10" stroke="currentColor" strokeWidth="1.5" fill="none" />
              
              {/* Stars decorating the branch leaves */}
              <polygon points="12,-5 14,-1 18,-1 15,1 16,5 12,3 8,5 9,1 6,-1 10,-1" />
              <polygon points="14,2 15,5 18,5 16,7 17,10 14,8 11,10 12,7 10,5 13,5" transform="scale(0.85) translate(2, 2)" />
              <polygon points="12,8 13,11 16,11 14,13 15,16 12,14 9,16 10,13 8,11 11,11" transform="scale(0.7) translate(4, 5)" />
            </g>

            {/* "Ash Villa" styled text */}
            <text
              x="100"
              y="157"
              textAnchor="middle"
              fill="currentColor"
              className="font-sans"
              style={{
                fontFamily: '"Impact", "Arial Black", "Inter", sans-serif',
                fontWeight: 900,
                fontSize: '25px',
                letterSpacing: '-0.5px',
              }}
            >
              Ash Villa
            </text>
          </>
        )}
      </svg>
    </div>
  );
};
