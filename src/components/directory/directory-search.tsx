"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  X,
  SlidersHorizontal,
  Loader2,
  RotateCcw,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { MemberCard } from "./member-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DirectoryMember, DirectoryFilters } from "@/lib/types/directory";
import { createClient } from "@/utils/supabase/client";

type SortKey = "name_asc" | "name_desc" | "recent" | "activity";

interface DirectorySearchProps {
  initialMembers: DirectoryMember[];
  initialTotal: number;
  initialHasMore: boolean;
  filters: DirectoryFilters;
  sort: SortKey;
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
  sort,
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

  // Sync avec les données serveur quand l'URL change
  useEffect(() => {
    setMembers(initialMembers);
    setTotal(initialTotal);
    setHasMore(initialHasMore);
  }, [initialMembers, initialTotal, initialHasMore]);

  // Recherche debounced
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

  const hasAdvancedFilters =
    filters.filiere !== "all" ||
    filters.country !== "all" ||
    filters.promo !== "all";

  // Load more
  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;

    startLoadMore(async () => {
      const supabase = createClient();
      const offset = members.length;

      let query = supabase
        .from("profiles")
        .select(
          "id, username, first_name, last_name, avatar_url, role, filiere, country, promo_id, promo_start_date, class, last_seen_at"
        )
        .eq("status", "active")
        .neq("role", "admin")
        .range(offset, offset + 19);

      switch (sort) {
        case "name_desc":
          query = query.order("first_name", { ascending: false });
          break;
        case "recent":
          query = query.order("created_at", { ascending: false });
          break;
        case "activity":
          query = query.order("last_seen_at", {
            ascending: false,
            nullsFirst: false,
          });
          break;
        default:
          query = query.order("first_name", { ascending: true });
      }

      if (filters.q) {
        query = query.textSearch("search_vector", filters.q, {
          type: "websearch",
        });
      }
      if (filters.role !== "all") query = query.eq("role", filters.role);
      if (filters.filiere !== "all")
        query = query.eq("filiere", filters.filiere);
      if (filters.country !== "all")
        query = query.eq("country", filters.country);
      if (filters.promo !== "all") {
        const { data: p } = await supabase
          .from("promotions")
          .select("id")
          .eq("name", filters.promo)
          .maybeSingle();
        if (p) query = query.eq("promo_id", p.id);
      }

      const { data: profiles } = await query;

      if (!profiles || profiles.length === 0) {
        setHasMore(false);
        return;
      }

      const profileIds = profiles.map((p) => p.id);
      const { data: professions } = await supabase
        .from("user_professions")
        .select("profile_id, title, company")
        .in("profile_id", profileIds)
        .eq("is_current", true);

      const profMap = new Map(
        professions?.map((p) => [
          p.profile_id,
          { title: p.title, company: p.company },
        ]) ?? []
      );

      const promoIds = profiles
        .map((p) => p.promo_id)
        .filter(Boolean) as string[];
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
      {/* Search bar proéminente */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Rechercher une membre par nom, @username, filière, pays…"
          className="w-full h-12 pl-12 pr-12 rounded-2xl bg-white dark:bg-gray-900 border-gray-200 text-sm placeholder:text-gray-400 shadow-sm focus-visible:ring-2 focus-visible:ring-cma-bordeaux/20 focus-visible:border-cma-bordeaux/30"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Effacer la recherche"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Role chips toujours visibles + tri + filtres avancés */}
      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => updateFilter("role", r.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              filters.role === r.value
                ? "bg-cma-bordeaux text-white shadow-sm"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-cma-bordeaux/30"
            }`}
          >
            {r.label}
          </button>
        ))}

        <div className="flex-1" />

        <Select value={sort} onValueChange={(v) => updateFilter("sort", v)}>
          <SelectTrigger className="rounded-xl h-9 px-3 min-w-[160px] text-xs gap-2 border bg-white">
            <span className="flex items-center gap-1.5 text-gray-500">
              <ArrowUpDown size={13} />
              <SelectValue placeholder="Trier" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc">Nom (A → Z)</SelectItem>
            <SelectItem value="name_desc">Nom (Z → A)</SelectItem>
            <SelectItem value="activity">Récemment actif</SelectItem>
            <SelectItem value="recent">Nouveaux membres</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`rounded-xl h-9 px-3 gap-1.5 text-xs relative ${
            hasAdvancedFilters ? "border-cma-bordeaux/50 text-cma-bordeaux" : ""
          }`}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={13} />
          Filtres
          {hasAdvancedFilters && (
            <span
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cma-or border-2 border-white"
              aria-label="Filtres actifs"
            />
          )}
        </Button>
      </div>

      {/* Panel filtres avancés */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1.5 block uppercase tracking-wider">
                Filière
              </label>
              <select
                value={filters.filiere}
                onChange={(e) => updateFilter("filiere", e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20"
              >
                <option value="all">Toutes</option>
                {filterOptions.filieres.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-gray-500 mb-1.5 block uppercase tracking-wider">
                Pays
              </label>
              <select
                value={filters.country}
                onChange={(e) => updateFilter("country", e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20"
              >
                <option value="all">Tous</option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {filterOptions.promos.length > 0 && (
              <div>
                <label className="text-[11px] font-medium text-gray-500 mb-1.5 block uppercase tracking-wider">
                  Promotion
                </label>
                <select
                  value={filters.promo}
                  onChange={(e) => updateFilter("promo", e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20"
                >
                  <option value="all">Toutes</option>
                  {filterOptions.promos.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Résultats count + reset */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {total}
          </span>{" "}
          membre{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""}
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs text-cma-bordeaux font-medium hover:underline flex items-center gap-1"
          >
            <RotateCcw size={11} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Résultats */}
      {members.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cma-bordeaux/5 to-cma-or/5 flex items-center justify-center mx-auto mb-4">
            <Users size={32} className="text-cma-bordeaux/40" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Aucune membre ne correspond à votre recherche
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Essayez d&apos;élargir vos critères ou de réinitialiser les filtres.
          </p>
          {hasActiveFilters && (
            <Button
              type="button"
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl gap-1.5 text-xs"
            >
              <RotateCcw size={12} />
              Réinitialiser
            </Button>
          )}
        </div>
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: Math.min(i * 0.02, 0.3),
                  ease: "easeOut",
                }}
              >
                <MemberCard member={member} />
              </motion.div>
            ))}
          </motion.div>

          {hasMore && (
            <div className="text-center pt-6">
              <Button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                variant="outline"
                className="rounded-xl h-10 px-6 gap-2 text-sm border-cma-bordeaux/20 text-cma-bordeaux bg-cma-bordeaux/5 hover:bg-cma-bordeaux/10"
              >
                {isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                Charger plus de membres
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
