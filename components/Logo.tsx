'use client';

import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  useBrandColors?: boolean;
  animated3D?: boolean;
  style?: React.CSSProperties;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 120,
  showText = true,
  useBrandColors = true,
  animated3D = false,
  style,
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!animated3D) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -(y / rect.height) * 20,
      y: (x / rect.width) * 20,
    });
  };

  const handleMouseLeave = () => {
    if (!animated3D) return;
    setTilt({ x: 0, y: 0 });
  };

  const mountainColor = useBrandColors ? '#0E8345' : 'currentColor';
  const mountTextColor = useBrandColors ? '#0E8345' : 'currentColor';
  const ashVillaColor = useBrandColors ? '#C8102E' : 'currentColor';
  const fanBgColor = useBrandColors ? '#1E2460' : 'currentColor';

  const svgContent = (
    <svg
      width={size}
      height={showText ? Math.round(size * 0.85) : size}
      viewBox={showText ? '0 0 280 200' : '0 0 200 140'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="select-none transition-transform duration-300 ease-out"
    >
      {/* ── Mountain Peak Contour ── */}
      <path
        d="M 10 95 L 60 92 C 78 88 95 80 110 65 L 138 22 L 158 85 L 168 68 L 175 80 L 184 68 L 192 78 L 198 70 L 206 80 L 214 74 L 222 84 L 270 88"
        fill="none"
        stroke={mountainColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Mountain Peak Accent Detail */}
      <path
        d="M 132 28 L 138 22 L 143 32"
        fill="none"
        stroke={mountainColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {showText && (
        <>
          {/* ── "Mount" text ── */}
          <text
            x="20"
            y="135"
            fill={mountTextColor}
            style={{
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              fontWeight: 900,
              fontSize: '46px',
              letterSpacing: '-1.5px',
            }}
          >
            Mount
          </text>

          {/* ── "Ash Villa" text ── */}
          <text
            x="14"
            y="185"
            fill={ashVillaColor}
            style={{
              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              fontWeight: 900,
              fontSize: '48px',
              letterSpacing: '-1px',
            }}
          >
            Ash Villa
          </text>
        </>
      )}
    </svg>
  );

  if (animated3D) {
    return (
      <div
        className={`logo-3d-wrapper ${className}`}
        style={{
          perspective: '800px',
          display: 'inline-block',
          ...style,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="logo-3d-card"
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: tilt.x === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out',
            transformStyle: 'preserve-3d',
      
            borderRadius: '50%',
            padding: '20px',
            boxShadow: '0 20px 40px -15px rgba(14, 131, 69, 0.25), 0 10px 20px -10px rgba(200, 16, 46, 0.2), inset 0 1px 1px rgba(255,255,255,0.8)',
            
            backdropFilter: 'blur(12px)',
            animation: 'logoFloat3D 4s ease-in-out infinite alternate',
          }}
        >
          <div style={{ transform: 'translateZ(30px)' }}>
            {svgContent}
          </div>
        </div>

        <style jsx global>{`
          @keyframes logoFloat3D {
            0% {
              transform: translateY(0px) rotateX(0deg) rotateY(0deg);
              box-shadow: 0 16px 32px -12px rgba(14, 131, 69, 0.25), 0 8px 16px -8px rgba(200, 16, 46, 0.2);
            }
            100% {
              transform: translateY(-8px) rotateX(4deg) rotateY(-3deg);
              box-shadow: 0 28px 48px -16px rgba(14, 131, 69, 0.35), 0 14px 24px -10px rgba(200, 16, 46, 0.3);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={style}>
      {svgContent}
    </div>
  );
};

