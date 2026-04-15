"use client";

import Image from "next/image";
import { GraduationCap, Users, Trophy } from "lucide-react";
import type { PromotionData } from "@/lib/types/promo";

interface PromoProfileHeaderProps {
  promo: PromotionData;
  memberCount: number;
}

export function PromoProfileHeader({ promo, memberCount }: PromoProfileHeaderProps) {
  const yearsStr = promo.graduation_year 
    ? `${promo.entry_year} - ${promo.graduation_year}` 
    : `Promotion ${promo.entry_year}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      {/* Decorative top bar */}
      <div className="h-2 bg-cma-bordeaux" />
      
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cma-bordeaux/5 flex items-center justify-center text-cma-bordeaux shrink-0">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{yearsStr}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-gray-400" />
                  {memberCount} membre{memberCount > 1 ? "s" : ""}
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-cma-bordeaux font-medium italic">Coin Promo</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cma-or/5 border border-cma-or/10 min-w-[240px]">
            <div className="w-10 h-10 rounded-full bg-cma-or/10 flex items-center justify-center text-cma-or shrink-0">
              <Trophy size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-cma-or uppercase tracking-wider">Chef de Promo</p>
              {promo.leader ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 relative shrink-0">
                    {promo.leader.avatar_url ? (
                      <Image src={promo.leader.avatar_url} alt="" fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">
                        {promo.leader.first_name[0]}{promo.leader.last_name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {promo.leader.first_name} {promo.leader.last_name}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-400 mt-0.5 italic">Aucune élue</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
