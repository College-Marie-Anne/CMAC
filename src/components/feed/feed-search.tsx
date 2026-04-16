"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

export function FeedSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(currentQuery);

  // Resync l'input si l'URL change (retour arrière, clear via autre tab, etc.)
  useEffect(() => {
    setValue(currentQuery);
  }, [currentQuery]);

  // Base path = pathname courant. Avant, on forçait `/feed` : depuis
  // `/opportunities` la barre redirigait vers /feed, cassant la navigation.
  // On garde la route courante et on ne pousse que les searchParams.
  const buildUrl = (nextQ: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextQ.trim()) params.set("q", nextQ.trim());
    else params.delete("q");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const handleSearch = () => {
    router.push(buildUrl(value));
  };

  const handleClear = () => {
    setValue("");
    router.push(buildUrl(""));
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Rechercher..."
        aria-label="Rechercher sur la plateforme"
        className="w-full h-9 pl-9 pr-8 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux focus:ring-1 focus:ring-cma-bordeaux/20"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Effacer la recherche"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
