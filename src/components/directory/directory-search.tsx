"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal, Loader2, RotateCcw } from "lucide-react";
import { MemberCard } from "./member-card";
import type { DirectoryMember, DirectoryFilters } from "@/lib/types/directory";
import { createClient } from "@/utils/supabase/client";

interface DirectorySearchProps {
  initialMembers: DirectoryMember[];
  initialTotal: number;
  initialHasMore: boolean;
  filters: DirectoryFilters;
  filterOptions: {
    filieres: string[];
    countries: string[];
    promos: string[];
  };
}

const ROLES = [
  { value: "all", label: "Toutes" },
  { value: "alumni", label: "Alumni" },
  { value: "s4", label: "S4" },
  { value: "student", label: "Élèves" },
];

export function DirectorySearch({
  initialMembers,
  initialTotal,
  initialHasMore,
  filters,
  filterOptions,
}: DirectorySearchProps) {
  const [members, setMembers] = useState(initialMembers);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);
  const [isLoadingMore, startLoadMore] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync state when server data changes (URL-driven)
  useEffect(() => {
    setMembers(initialMembers);
    setTotal(initialTotal);
    setHasMore(initialHasMore);
  }, [initialMembers, initialTotal, initialHasMore]);

  // Debounced search — push URL params
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== filters.q) {
        updateFilter("q", searchInput);
      }
    }, 400);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset to page 1 on filter change
      params.delete("page");
      router.push(`/directory?${params.toString()}`);
    },
    [searchParams, router]
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    router.push("/directory");
  }, [router]);

  const hasActiveFilters =
    filters.q !== "" ||
    filters.role !== "all" ||
    filters.filiere !== "all" ||
    filters.country !== "all" ||
    filters.promo !== "all";

  // Load more via client-side fetch
  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;

    startLoadMore(async () => {
      const supabase = createClient();
      const offset = members.length;

      let query = supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url, role, filiere, country, promo_id, promo_start_date, class, last_seen_at")
        .eq("status", "active")
        .neq("role", "admin")
        .order("first_name", { ascending: true })
        .range(offset, offset + 19);

      if (filters.q) {
        query = query.textSearch("search_vector", filters.q, { type: "websearch" });
      }
      if (filters.role !== "all") {
        query = query.eq("role", filters.role);
      }
      if (filters.filiere !== "all") {
        query = query.eq("filiere", filters.filiere);
      }
      if (filters.country !== "all") {
        query = query.eq("country", filters.country);
      }

      const { data: profiles } = await query;

      if (!profiles || profiles.length === 0) {
        setHasMore(false);
        return;
      }

      // Fetch current professions for new batch
      const profileIds = profiles.map((p) => p.id);
      const { data: professions } = await supabase
        .from("user_professions")
        .select("profile_id, title, company")
        .in("profile_id", profileIds)
        .eq("is_current", true);

      const profMap = new Map(
        professions?.map((p) => [p.profile_id, { title: p.title, company: p.company }]) ?? []
      );

      // Fetch promo names if needed
      const promoIds = profiles.map((p) => p.promo_id).filter(Boolean) as string[];
      let promoMap = new Map<string, string>();
      if (promoIds.length > 0) {
        const { data: promos } = await supabase
          .from("promotions")
          .select("id, name")
          .in("id", promoIds);
        promoMap = new Map(promos?.map((p) => [p.id, p.name]) ?? []);
      }

      const newMembers: DirectoryMember[] = profiles.map((p) => ({
        id: p.id,
        username: p.username,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        role: p.role,
        filiere: p.filiere,
        country: p.country,
        promo_name: p.promo_id ? promoMap.get(p.promo_id) ?? null : null,
        promo_start_date: p.promo_start_date,
        class: p.class,
        last_seen_at: p.last_seen_at,
        current_profession: profMap.get(p.id)?.title ?? null,
        current_company: profMap.get(p.id)?.company ?? null,
      }));

      setMembers((prev) => [...prev, ...newMembers]);
      setHasMore(profiles.length === 20);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher par nom, username, filière, pays…"
          className="w-full pl-10 pr-20 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20 focus:border-cma-bordeaux/30 shadow-sm"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              aria-label="Effacer"
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-cma-bordeaux/10 text-cma-bordeaux"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Filtres"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Role */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Statut</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => updateFilter("role", r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filters.role === r.value
                      ? "bg-cma-bordeaux text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filiere */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Filière</label>
            <select
              value={filters.filiere}
              onChange={(e) => updateFilter("filiere", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">Toutes les filières</option>
              {filterOptions.filieres.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Pays</label>
            <select
              value={filters.country}
              onChange={(e) => updateFilter("country", e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
            >
              <option value="all">Tous les pays</option>
              {filterOptions.countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Promo */}
          {filterOptions.promos.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Promotion</label>
              <select
                value={filters.promo}
                onChange={(e) => updateFilter("promo", e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="all">Toutes les promos</option>
                {filterOptions.promos.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          {/* Reset */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-cma-bordeaux font-medium hover:underline"
            >
              <RotateCcw size={12} />
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {total} membre{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""}
        </p>
        {hasActiveFilters && !showFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-cma-bordeaux font-medium hover:underline flex items-center gap-1"
          >
            <RotateCcw size={10} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Results grid */}
      {members.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Aucune membre ne correspond à votre recherche
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-sm text-cma-bordeaux font-medium hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-50"
              >
                {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                Charger plus de membres
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
