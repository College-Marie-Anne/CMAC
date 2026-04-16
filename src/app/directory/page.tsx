import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Globe, GraduationCap } from "lucide-react";
import { DirectorySearch } from "@/components/directory/directory-search";
import type { DirectoryMember, DirectoryFilters } from "@/lib/types/directory";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Annuaire — CMA Connect",
  description: "Retrouvez les membres de la communauté CMA Connect",
};

const PAGE_SIZE = 20;

type SortKey = "name_asc" | "name_desc" | "recent" | "activity";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    filiere?: string;
    country?: string;
    promo?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const filters: DirectoryFilters = {
    q: sp.q?.trim() ?? "",
    role: sp.role ?? "all",
    filiere: sp.filiere ?? "all",
    country: sp.country ?? "all",
    promo: sp.promo ?? "all",
  };

  const sort: SortKey = (["name_asc", "name_desc", "recent", "activity"].includes(
    sp.sort ?? ""
  )
    ? sp.sort
    : "name_asc") as SortKey;

  // Résolution promo_id AVANT le select principal (fix : totalCount correct)
  let promoIdFilter: string | null = null;
  if (filters.promo !== "all") {
    const { data: p } = await supabase
      .from("promotions")
      .select("id")
      .eq("name", filters.promo)
      .maybeSingle();
    if (p) promoIdFilter = p.id;
  }

  // Build query principale
  let query = supabase
    .from("profiles")
    .select(
      "id, username, first_name, last_name, avatar_url, role, filiere, country, promo_id, promo_start_date, class, last_seen_at",
      { count: "exact" }
    )
    .eq("status", "active")
    .neq("role", "admin")
    .range(0, PAGE_SIZE - 1);

  // Tri
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
    query = query.textSearch("search_vector", filters.q, { type: "websearch" });
  }
  if (filters.role !== "all") query = query.eq("role", filters.role);
  if (filters.filiere !== "all") query = query.eq("filiere", filters.filiere);
  if (filters.country !== "all") query = query.eq("country", filters.country);
  if (promoIdFilter) query = query.eq("promo_id", promoIdFilter);

  const { data: profiles, count } = await query;
  const totalCount = count ?? 0;

  // KPIs communautaires — parallélisés
  const [
    { count: totalActive },
    { data: countryRowsAll },
    { count: totalPromos },
    filtersData,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("role", "admin"),
    supabase
      .from("profiles")
      .select("country")
      .eq("status", "active")
      .neq("role", "admin")
      .not("country", "is", null),
    supabase
      .from("promotions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    Promise.all([
      supabase
        .from("profiles")
        .select("filiere")
        .eq("status", "active")
        .neq("role", "admin")
        .not("filiere", "is", null),
      supabase
        .from("promotions")
        .select("name")
        .eq("status", "active")
        .order("name", { ascending: true }),
    ]),
  ]);

  const [filiereRows, promoRows] = filtersData;
  const uniqueCountries = new Set(
    (countryRowsAll ?? []).map((r) => r.country).filter(Boolean) as string[]
  );
  const filieres = [
    ...new Set(
      (filiereRows.data ?? []).map((r) => r.filiere).filter(Boolean) as string[]
    ),
  ];
  const countries = [...uniqueCountries];
  const promos = (promoRows.data ?? []).map((r) => r.name);

  // Résoudre les promo_name pour les cards
  const promoIds = (profiles ?? [])
    .map((p) => p.promo_id)
    .filter(Boolean) as string[];

  let promoMap = new Map<string, string>();
  if (promoIds.length > 0) {
    const { data: resolvedPromos } = await supabase
      .from("promotions")
      .select("id, name")
      .in("id", promoIds);
    promoMap = new Map(
      resolvedPromos?.map((p) => [p.id, p.name]) ?? []
    );
  }

  // Résoudre les professions
  const profileIds = (profiles ?? []).map((p) => p.id);
  let profMap = new Map<string, { title: string; company: string | null }>();
  if (profileIds.length > 0) {
    const { data: professions } = await supabase
      .from("user_professions")
      .select("profile_id, title, company")
      .in("profile_id", profileIds)
      .eq("is_current", true);

    profMap = new Map(
      professions?.map((p) => [
        p.profile_id,
        { title: p.title, company: p.company },
      ]) ?? []
    );
  }

  const members: DirectoryMember[] = (profiles ?? []).map((p) => ({
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

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Retour</span>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Annuaire
        </h1>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <KPI
            icon={Users}
            label="Membres"
            value={totalActive ?? 0}
            color="bordeaux"
          />
          <KPI
            icon={Globe}
            label="Pays"
            value={uniqueCountries.size}
            color="vert"
          />
          <KPI
            icon={GraduationCap}
            label="Promos"
            value={totalPromos ?? 0}
            color="or"
          />
        </div>

        <Suspense fallback={<DirectoryLoading />}>
          <DirectorySearch
            initialMembers={members}
            initialTotal={totalCount}
            initialHasMore={members.length === PAGE_SIZE}
            filters={filters}
            sort={sort}
            filterOptions={{ filieres, countries, promos }}
          />
        </Suspense>
      </main>
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color: "bordeaux" | "vert" | "or";
}) {
  const colorClasses = {
    bordeaux: "bg-cma-bordeaux/10 text-cma-bordeaux",
    vert: "bg-cma-vert/10 text-cma-vert",
    or: "bg-cma-or/10 text-cma-or",
  }[color];

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorClasses}`}
      >
        <Icon size={16} />
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">
        {value}
      </p>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}

function DirectoryLoading() {
  return (
    <div className="space-y-4">
      <div className="h-12 rounded-xl bg-gray-200/60 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-52 rounded-2xl bg-white border border-gray-100 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
