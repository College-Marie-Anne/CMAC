"use client";

import { Sprout } from "lucide-react";

interface SeedBadgeProps {
  enrollmentYear: number;
}

export function SeedBadge({ enrollmentYear }: SeedBadgeProps) {
  // We assume CMA S1-S3 cycle is roughly 3 years after enrollment
  const cycleStr = `${enrollmentYear}-${enrollmentYear + 3}`;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-cma-vert/20 shadow-sm text-center">
      <div className="w-20 h-20 rounded-full bg-cma-vert/10 flex items-center justify-center text-cma-vert mb-6 animate-pulse">
        <Sprout size={40} />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Graine de CMA {cycleStr}</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        Votre promotion n&apos;est pas encore formalisée. Continuez à grandir avec le CMA !
        Le Coin Promo et les Élections seront disponibles lors de votre passage en S4.
      </p>
      
      <div className="mt-8 flex gap-2">
        <span className="px-3 py-1 rounded-full bg-cma-vert/5 text-cma-vert text-[10px] font-bold uppercase tracking-widest border border-cma-vert/10">
          Avenir
        </span>
        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-widest border border-blue-100">
          S1-S3
        </span>
      </div>
    </div>
  );
}
