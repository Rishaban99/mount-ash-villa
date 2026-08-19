'use client';

import { DotPattern } from '@/components/ui/dot-pattern';
import { LightRays } from '@/components/ui/light-rays';
import { cn } from '@/lib/utils';
import { getThemeConfig, NaturalThemeId } from '@/lib/themes';

/** Dynamic atmospheric natural ambient light rays + dot constellation for guest QR experience. */
export function GuestAmbientBackground({
  themeId = 'highlands',
  className,
}: {
  themeId?: NaturalThemeId | string;
  className?: string;
}) {
  const theme = getThemeConfig(themeId);

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <DotPattern
        width={24}
        height={24}
        cr={0.95}
        className="[mask-image:radial-gradient(ellipse_at_50%_30%,white,transparent_80%)]"
        style={{ color: theme.dotPatternColor }}
      />
      <LightRays
        count={7}
        color={theme.lightRayColor}
        blur={46}
        speed={14}
        length="95vh"
      />
    </div>
  );
}
