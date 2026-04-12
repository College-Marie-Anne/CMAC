"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const PERIODS = [
  { value: "7d", label: "7j" },
  { value: "30d", label: "30j" },
  { value: "90d", label: "90j" },
  { value: "1y", label: "1 an" },
  { value: "all", label: "Tout" },
] as const;

const ROLES = [
  { value: "all", label: "Toutes" },
  { value: "alumni", label: "Alumni" },
  { value: "s4", label: "S4" },
  { value: "student", label: "S1-S3" },
] as const;

type Promo = { id: string; name: string };

export function DashboardFilters({ promos }: { promos: Promo[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPeriod = searchParams.get("period") ?? "30d";
  const currentRole = searchParams.get("role") ?? "all";
  const currentPromo = searchParams.get("promo") ?? "all";

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      // Remove default values from URL for cleanliness
      const defaults: Record<string, string> = {
        period: "30d",
        role: "all",
        promo: "all",
      };
      if (value === defaults[key]) params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      router.push(qs ? `/admin?${qs}` : "/admin");
    },
    [router, searchParams]
  );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Period */}
      <div
        className="flex rounded-xl overflow-hidden border border-gray-200"
        role="group"
        aria-label="Filtrer par période"
      >
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setFilter("period", p.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              currentPeriod === p.value
                ? "bg-cma-bordeaux text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Role */}
      <div
        className="flex rounded-xl overflow-hidden border border-gray-200"
        role="group"
        aria-label="Filtrer par rôle"
      >
        {ROLES.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilter("role", r.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              currentRole === r.value
                ? "bg-cma-vert text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Promotion dropdown */}
      {promos.length > 0 && (
        <select
          value={currentPromo}
          onChange={(e) => setFilter("promo", e.target.value)}
          aria-label="Filtrer par promotion"
          className={`h-8 px-3 rounded-xl border text-xs font-medium transition-colors focus:outline-none ${
            currentPromo !== "all"
              ? "bg-cma-or/10 border-cma-or/30 text-cma-or"
              : "bg-white border-gray-200 text-gray-500"
          }`}
        >
          <option value="all">Toutes les promos</option>
          {promos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
