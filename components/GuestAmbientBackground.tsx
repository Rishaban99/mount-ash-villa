'use client';

import { DotPattern } from '@/components/ui/dot-pattern';
import { LightRays } from '@/components/ui/light-rays';
import { cn } from '@/lib/utils';

/** Champagne light rays + soft dot pattern for the guest QR experience. */
export function GuestAmbientBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <DotPattern
        width={24}
        height={24}
        cr={0.9}
        className="text-[rgba(196,163,90,0.22)] [mask-image:radial-gradient(ellipse_at_50%_30%,white,transparent_78%)]"
      />
      <LightRays
        count={6}
        color="rgba(196, 163, 90, 0.26)"
        blur={42}
        speed={16}
        length="90vh"
      />
    </div>
  );
}
