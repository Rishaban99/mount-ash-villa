'use client';

import React from 'react';
import { DotPattern } from '@/components/ui/dot-pattern';
import { LightRays } from '@/components/ui/light-rays';
import { getThemeConfig } from '@/lib/theme-config';
import { ThemeMode } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NatureAmbientBackgroundProps {
  theme?: ThemeMode | string | null;
  className?: string;
}

export function NatureAmbientBackground({ theme, className }: NatureAmbientBackgroundProps) {
  const current = getThemeConfig(theme);

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 overflow-hidden z-0 select-none transition-colors duration-700', className)}
      aria-hidden="true"
    >
      {/* Dynamic Nature Radial Glow Atmosphere */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out opacity-75"
        style={{
          background: current.ambient.mistEffect,
        }}
      />

      {/* Nature Dot / Stardust Grid Pattern */}
      <DotPattern
        width={28}
        height={28}
        cr={1.1}
        style={{ color: current.ambient.dotColor }}
        className="opacity-40 [mask-image:radial-gradient(ellipse_at_50%_35%,white,transparent_80%)] transition-all duration-700"
      />

      {/* GPU Accelerated Ambient Light Rays */}
      <LightRays
        count={current.ambient.rayCount}
        color={current.ambient.rayColor}
        blur={current.ambient.rayBlur}
        speed={current.ambient.raySpeed}
        length="100vh"
      />

      {/* Subtle organic vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
