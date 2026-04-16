import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DirectorySearch } from "@/components/directory/directory-search";
import type { DirectoryMember, DirectoryFilters } from "@/lib/types/directory";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Annuaire — CMA Connect",
  description: "Retrouvez les membres de la communauté CMA Connect",
};

const PAGE_SIZE = 20;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    filiere?: string;
    country?: string;
    promo?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parse filters from URL
  const filters: DirectoryFilters = {
    q: sp.q?.trim() ?? "",
    role: sp.role ?? "all",
    filiere: sp.filiere ?? "all",
    country: sp.country ?? "all",
    promo: sp.promo ?? "all",
  };

  // Build query — only active, non-admin profiles
  let query = supabase
    .from("profiles")
    .select(
      "id, username, first_name, last_name, avatar_url, role, filiere, country, promo_id, promo_start_date, class, last_seen_at",
      { count: "exact" }
    )
    .eq("status", "active")
    .neq("role", "admin")
    .order("first_name", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  // Apply search
  if (filters.q) {
    query = query.textSearch("search_vector", filters.q, { type: "websearch" });
  }

  // Apply filters
  if (filters.role !== "all") {
    query = query.eq("role", filters.role);
  }
  if (filters.filiere !== "all") {
    query = query.eq("filiere", filters.filiere);
  }
  if (filters.country !== "all") {
    query = query.eq("country", filters.country);
  }

  const { data: profiles, count } = await query;
  const totalCount = count ?? 0;

  // Filter by promo name (requires join resolution)
  let promoFilteredIds: Set<string> | null = null;
  if (filters.promo !== "all") {
    const { data: promoRows } = await supabase
      .from("promotions")
      .select("id")
      .eq("name", filters.promo)
      .single();

    if (promoRows) {
      promoFilteredIds = new Set([promoRows.id]);
    }
  }

  // Resolve promo names for all profiles
  const promoIds = (profiles ?? [])
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

  // Fetch current professions for result set
  const profileIds = (profiles ?? []).map((p) => p.id);
  let profMap = new Map<string, { title: string; company: string | null }>();
  if (profileIds.length > 0) {
    const { data: professions } = await supabase
      .from("user_professions")
      .select("profile_id, title, company")
      .in("profile_id", profileIds)
      .eq("is_current", true);

    profMap = new Map(
      professions?.map((p) => [p.profile_id, { title: p.title, company: p.company }]) ?? []
    );
  }

  // Build member list
  let members: DirectoryMember[] = (profiles ?? []).map((p) => ({
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

  // Apply promo filter client-side (since promo_name requires resolution)
  let filteredTotal = totalCount;
  if (promoFilteredIds) {
    members = members.filter((m) => m.promo_name === filters.promo);
    filteredTotal = members.length;
  }

  // Fetch filter options for the dropdowns
  const [
    { data: filiereRows },
    { data: countryRows },
    { data: promoRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("filiere")
      .eq("status", "active")
      .neq("role", "admin")
      .not("filiere", "is", null),
    supabase
      .from("profiles")
      .select("country")
      .eq("status", "active")
      .neq("role", "admin")
      .not("country", "is", null),
    supabase
      .from("promotions")
      .select("name")
      .eq("status", "active")
      .order("name", { ascending: true }),
  ]);

  const filieres = [...new Set((filiereRows ?? []).map((r) => r.filiere).filter(Boolean))] as string[];
  const countries = [...new Set((countryRows ?? []).map((r) => r.country).filter(Boolean))] as string[];
  const promos = (promoRows ?? []).map((r) => r.name);

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Retour</span>
        </Link>
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Annuaire
        </h1>
        <span className="text-xs text-gray-400 ml-1">
          {totalCount} membre{totalCount !== 1 ? "s" : ""}
        </span>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <Suspense fallback={<DirectoryLoading />}>
          <DirectorySearch
            initialMembers={members}
            initialTotal={promoFilteredIds ? filteredTotal : totalCount}
            initialHasMore={members.length === PAGE_SIZE}
            filters={filters}
            filterOptions={{ filieres, countries, promos }}
          />
        </Suspense>
      </main>
    </div>
  );
}

function DirectoryLoading() {
  return (
    <div className="space-y-4">
      <div className="h-12 rounded-xl bg-gray-200/60 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white border border-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
