import { createClient } from "@/utils/supabase/server";
import {
  Users, UserPlus, Clock, TrendingUp,
} from "lucide-react";
import { KpiCard } from "@/components/admin/charts/kpi-card";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { DashboardFilters } from "@/components/admin/dashboard-filters";

function periodToDays(period: string): number | null {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return null;
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const ML = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const DL = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

type RoleFilter = "all" | "alumni" | "s4" | "student";
function rolesToArray(r: RoleFilter): string[] {
  return r === "all" ? ["alumni","s4","student"] : [r];
}

// Aggregate helper: count occurrences, return top N sorted desc
function topN(rows: { val: string | null }[], n: number) {
  const c: Record<string, number> = {};
  for (const r of rows) {
    if (!r.val) continue;
    const k = r.val.length > 20 ? r.val.slice(0, 20) + "…" : r.val;
    c[k] = (c[k] ?? 0) + 1;
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n);
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; role?: string; promo?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period ?? "30d";
  const roleFilter = (["all","alumni","s4","student"].includes(sp.role ?? "") ? sp.role : "all") as RoleFilter;
  const promoFilter = sp.promo ?? "all";
  const days = periodToDays(period);
  const periodStart = days ? daysAgo(days) : null;
  const roles = rolesToArray(roleFilter);
  const supabase = await createClient();

  try {
    return await render(supabase, period, roleFilter, promoFilter, roles, days, periodStart);
  } catch (err) {
    console.error("[dashboard]", err);
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <DashboardFilters promos={[]} />
        </div>
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">Erreur de chargement</p>
          <p className="text-xs text-red-500">Impossible de charger les données. Rechargez la page.</p>
        </div>
      </div>
    );
  }
}

async function render(
  supabase: Awaited<ReturnType<typeof createClient>>,
  period: string,
  roleFilter: RoleFilter,
  promoFilter: string,
  roles: string[],
  days: number | null,
  periodStart: string | null,
) {
  const now = new Date();
  const { data: activePromos } = await supabase.from("promotions").select("id, name").eq("status", "active").order("name");
  const validPromoId = promoFilter !== "all" && (activePromos ?? []).some((p) => p.id === promoFilter) ? promoFilter : null;
  const promoMap = Object.fromEntries((activePromos ?? []).map((p) => [p.id, p.name]));

  // Type helper
  const _bq = supabase.from("profiles").select("id", { count: "exact", head: true });
  type PQ = typeof _bq;
  void _bq;
  const pc = (extra?: (q: PQ) => PQ) => {
    let q: PQ = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles);
    if (validPromoId) q = q.eq("promo_id", validPromoId);
    if (extra) q = extra(q);
    return q;
  };

  // Time range helpers
  const mCount = days === null ? 12 : days <= 30 ? 4 : days <= 90 ? 6 : 12;
  const wCount = days === null ? 12 : days <= 7 ? 1 : days <= 30 ? 4 : days <= 90 ? 6 : 12;
  const dauDays = days === null ? 14 : Math.min(days, 14);
  const engW = Math.min(days ?? 30, 30);
  const monthRanges = Array.from({ length: mCount }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (mCount - 1 - i), 1);
    return { label: ML[d.getMonth()], start: d.toISOString(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString() };
  });
  const weekRanges = Array.from({ length: wCount }, (_, i) => ({
    label: `S${i + 1}`, start: daysAgo((wCount - 1 - i) * 7 + 7), end: daysAgo((wCount - 1 - i) * 7),
  }));
  const dayRanges = Array.from({ length: dauDays }, (_, i) => {
    const ds = new Date(); ds.setDate(ds.getDate() - (dauDays - 1 - i)); ds.setHours(0, 0, 0, 0);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    return { label: dauDays <= 7 ? DL[ds.getDay()] : `${ds.getDate()}/${ds.getMonth() + 1}`, start: ds.toISOString(), end: de.toISOString() };
  });

  // Engagement query (needs to be built before the batch)
  let engQ = supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").in("role", roles).gte("last_seen_at", daysAgo(engW));
  if (validPromoId) engQ = engQ.eq("promo_id", validPromoId);

  // CSV export query (needs to be built before the batch)
  let csvQ = supabase.from("profiles").select("first_name, last_name, username, role, status, nationality, country, filiere, class, created_at, last_seen_at").in("role", roles).order("created_at", { ascending: false }).limit(500);
  if (periodStart) csvQ = csvQ.gte("created_at", periodStart);
  if (validPromoId) csvQ = csvQ.eq("promo_id", validPromoId);

  // ═══════════════════════════════════════════════════════════════
  // BATCH 1: All KPIs + role counts + engagement + push + moderation
  //          + activeConvos + ALL bulk data fetches + CSV export
  //          (~31 queries in parallel)
  // ═══════════════════════════════════════════════════════════════
  const [
    // KPIs (9)
    { count: totalMembers },
    { count: pendingCount },
    { count: newThisPeriod },
    { count: newPrevPeriod },
    { count: activeMentorships },
    { count: pendingMentorRequests },
    { count: completedElections },
    { count: promosWithoutLeader },
    { count: inactiveCount },
    // Role counts (3)
    { count: nAlumni },
    { count: nS4 },
    { count: nStudent },
    // Engagement count (1)
    { count: activeInW },
    // Push count (1)
    { count: pushCount },
    // Moderation counts (2)
    { count: totalPosts },
    { count: deletedPosts },
    // Active conversations (1)
    { count: activeConvos },
    // Bulk data fetches (15)
    { data: allProfiles },
    { data: eduRows },
    { data: desiredRows },
    { data: profRows },
    { data: allMentorReqs },
    { data: mentorSessions },
    { data: tagPosts },
    { data: allTags },
    { data: promoPosts },
    { data: actRows },
    { data: actNames },
    { data: rxRows },
    { data: answeredReqs },
    { data: elections },
    // CSV export (1)
    { data: membersForExport },
  ] = await Promise.all([
    // KPIs (9)
    pc((q) => q.in("status", ["active","pending"]) as PQ),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    pc((q) => { if (periodStart) return q.gte("created_at", periodStart) as PQ; return q; }),
    pc((q) => {
      if (days) return q.gte("created_at", daysAgo(days * 2)).lt("created_at", daysAgo(days)) as PQ;
      return q.gte("created_at", daysAgo(14)).lt("created_at", daysAgo(7)) as PQ;
    }),
    supabase.from("mentorship_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("promo_elections").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("promotions").select("id", { count: "exact", head: true }).eq("status", "active").is("leader_id", null),
    pc((q) => q.eq("status", "active").lt("last_seen_at", daysAgo(30)) as PQ),
    // Role counts (3)
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "alumni").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "s4").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
    // Engagement count (1)
    engQ,
    // Push count (1)
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    // Moderation counts (2)
    supabase.from("forum_posts").select("id", { count: "exact", head: true }),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_deleted", true),
    // Active conversations (1)
    supabase.from("conversations").select("id", { count: "exact", head: true }).gte("last_message_at", daysAgo(7)),
    // Bulk data fetches (15)
    supabase.from("profiles").select("promo_id, nationality, country, filiere, role").in("role", roles).eq("status", "active"),
    supabase.from("user_education").select("study_field, institution_type, institution_name, degree_level, profile_id"),
    supabase.from("desired_study_fields").select("field_name, profile_id"),
    supabase.from("user_professions").select("title, profile_id").eq("is_current", true),
    supabase.from("mentorship_requests").select("status, study_field, mentor_id, created_at"),
    supabase.from("mentorship_sessions").select("mentor_id"),
    supabase.from("forum_posts").select("tag_id"),
    supabase.from("forum_tags").select("id, name"),
    supabase.from("forum_posts").select("promo_id").not("promo_id", "is", null),
    supabase.from("profile_activities").select("activity_id"),
    supabase.from("activities").select("id, name"),
    supabase.from("forum_reactions").select("emoji"),
    supabase.from("mentorship_requests").select("created_at, updated_at").neq("status", "pending"),
    supabase.from("promo_elections").select("id, promo_id, status"),
    // CSV export (1)
    csvQ,
  ]);

  // ═══════════════════════════════════════
  // Derived scalar values from BATCH 1
  // ═══════════════════════════════════════
  const trend = (newPrevPeriod ?? 0) > 0 ? Math.round(((newThisPeriod ?? 0) - (newPrevPeriod ?? 0)) / (newPrevPeriod ?? 1) * 100) : 0;
  const totalActive = (nAlumni ?? 0) + (nS4 ?? 0) + (nStudent ?? 0);
  const engRate = totalActive > 0 ? Math.round(((activeInW ?? 0) / totalActive) * 100) : 0;
  const modRate = (totalPosts ?? 0) > 0 ? Math.round(((deletedPosts ?? 0) / (totalPosts ?? 1)) * 100) : 0;

  const rolesData = [
    { name: "Alumni", value: nAlumni ?? 0, color: "#800020" },
    { name: "S4", value: nS4 ?? 0, color: "#006B3F" },
    { name: "S1-S3", value: nStudent ?? 0, color: "#D4A017" },
  ];

  const pushData = [
    { name: "Push activé", value: pushCount ?? 0, color: "#006B3F" },
    { name: "Sans push", value: Math.max(totalActive - (pushCount ?? 0), 0), color: "#E5E7EB" },
  ];

  // Mentorship response delay (avg hours)
  let avgDelay = 0;
  if (answeredReqs && answeredReqs.length > 0) {
    const total = answeredReqs.reduce((sum, r) => sum + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()), 0);
    avgDelay = Math.round(total / answeredReqs.length / 3600000);
  }

  // ═══════════════════════════════════════
  // DEMOGRAPHIE: promotions, nationalités, pays, diaspora, filières
  // (pure in-memory aggregation from allProfiles already fetched)
  // ═══════════════════════════════════════
  const filtered = validPromoId ? (allProfiles ?? []).filter((p) => p.promo_id === validPromoId) : (allProfiles ?? []);

  const promoCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.promo_id) promoCounts[p.promo_id] = (promoCounts[p.promo_id] ?? 0) + 1; }
  const promoDistribution = Object.entries(promoCounts)
    .map(([id, count]) => ({ promo: promoMap[id] ?? id.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  const natCounts: Record<string, number> = {};
  for (const p of filtered) { for (const n of p.nationality ?? []) { natCounts[n] = (natCounts[n] ?? 0) + 1; } }
  const nationalitesData = Object.entries(natCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nat, count]) => ({ nat, count }));

  const countryCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.country) countryCounts[p.country] = (countryCounts[p.country] ?? 0) + 1; }
  const paysData = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([pays, count]) => ({ pays, count }));

  const diaspCounts: Record<string, number> = {};
  for (const p of filtered) {
    for (const n of p.nationality ?? []) {
      if (p.country && p.country !== n) diaspCounts[n] = (diaspCounts[n] ?? 0) + 1;
    }
  }
  const diasporaData = Object.entries(diaspCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nat, count]) => ({ nat, count }));

  const filCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.filiere) filCounts[p.filiere] = (filCounts[p.filiere] ?? 0) + 1; }
  const filieresData = Object.entries(filCounts).map(([name, value]) => ({ name, value, color: ["#800020","#006B3F","#D4A017","#a3003a","#008f54","#b8860b","#6B21A8"][Object.keys(filCounts).indexOf(name) % 7] }));

  // ═══════════════════════════════════════
  // PARCOURS: education data (filter by role/promo if needed)
  // ═══════════════════════════════════════
  let allowedIds: Set<string> | null = null;
  if ((roleFilter !== "all" || validPromoId) && eduRows?.length) {
    const ids = [...new Set(eduRows.map((r) => r.profile_id))];
    let pq = supabase.from("profiles").select("id").in("id", ids).in("role", roles);
    if (validPromoId) pq = pq.eq("promo_id", validPromoId);
    const { data: fp } = await pq;
    allowedIds = new Set((fp ?? []).map((p) => p.id));
  }
  const eduFiltered = (eduRows ?? []).filter((r) => !allowedIds || allowedIds.has(r.profile_id));

  const domainesData = topN(eduFiltered.map((r) => ({ val: r.study_field })), 6).map(([domaine, count]) => ({ domaine, count }));
  const parcoursData = [
    { name: "Université", value: eduFiltered.filter((r) => r.institution_type === "university").length, color: "#800020" },
    { name: "École pro.", value: eduFiltered.filter((r) => r.institution_type === "professional_school").length, color: "#006B3F" },
    { name: "Autre", value: eduFiltered.filter((r) => r.institution_type === "other").length, color: "#D4A017" },
  ];
  const universData = topN(eduFiltered.map((r) => ({ val: r.institution_name })), 8).map(([univ, count]) => ({ univ, count }));
  const niveauxData = topN(eduFiltered.map((r) => ({ val: r.degree_level })), 6).map(([niveau, count]) => ({ niveau, count }));

  const desiredFiltered = allowedIds ? (desiredRows ?? []).filter((r) => allowedIds!.has(r.profile_id)) : (desiredRows ?? []);
  const desiredData = topN(desiredFiltered.map((r) => ({ val: r.field_name })), 6).map(([domaine, count]) => ({ domaine, count }));

  const profFiltered = allowedIds ? (profRows ?? []).filter((r) => allowedIds!.has(r.profile_id)) : (profRows ?? []);
  const professionsData = topN(profFiltered.map((r) => ({ val: r.title })), 8).map(([metier, count]) => ({ metier, count }));

  // ═══════════════════════════════════════
  // ACTIVITE: tags, promos, reactions, activities (in-memory from BATCH 1)
  // ═══════════════════════════════════════
  const tagMap = Object.fromEntries((allTags ?? []).map((t) => [t.id, t.name]));
  const tagCounts: Record<string, number> = {};
  for (const p of tagPosts ?? []) { const n = tagMap[p.tag_id]; if (n) tagCounts[n] = (tagCounts[n] ?? 0) + 1; }
  const tagsData = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));

  const promoPostCounts: Record<string, number> = {};
  for (const p of promoPosts ?? []) { if (p.promo_id) promoPostCounts[p.promo_id] = (promoPostCounts[p.promo_id] ?? 0) + 1; }
  const promoEngagementData = Object.entries(promoPostCounts)
    .map(([id, count]) => ({ promo: promoMap[id] ?? id.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  const actMap = Object.fromEntries((actNames ?? []).map((a) => [a.id, a.name]));
  const actCounts: Record<string, number> = {};
  for (const r of actRows ?? []) { const n = actMap[r.activity_id]; if (n) actCounts[n] = (actCounts[n] ?? 0) + 1; }
  const activitiesPopData = Object.entries(actCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([activity, count]) => ({ activity, count }));

  const rxCounts: Record<string, number> = { like: 0, heart: 0, clap: 0 };
  for (const r of rxRows ?? []) { if (r.emoji in rxCounts) rxCounts[r.emoji]++; }
  const reactionsData = [
    { name: "Like", value: rxCounts.like, color: "#3B82F6" },
    { name: "Heart", value: rxCounts.heart, color: "#EF4444" },
    { name: "Clap", value: rxCounts.clap, color: "#F59E0B" },
  ];

  // MENTORAT: acceptance rate, domains (in-memory from allMentorReqs)
  const mReqs = periodStart ? (allMentorReqs ?? []).filter((r) => r.created_at >= periodStart) : (allMentorReqs ?? []);
  const accepted = mReqs.filter((r) => r.status === "accepted").length;
  const declined = mReqs.filter((r) => r.status === "declined").length;
  const mentoratAcceptData = [
    { name: "Acceptées", value: accepted, color: "#006B3F" },
    { name: "Déclinées", value: declined, color: "#dc2626" },
    { name: "En attente", value: mReqs.filter((r) => r.status === "pending").length, color: "#D4A017" },
  ];
  const mentoratDomainesData = topN(mReqs.map((r) => ({ val: r.study_field })), 5).map(([domaine, demandes]) => ({ domaine, demandes }));

  // Top mentors (name resolution)
  const mentorCounts: Record<string, number> = {};
  for (const s of mentorSessions ?? []) { if (s.mentor_id) mentorCounts[s.mentor_id] = (mentorCounts[s.mentor_id] ?? 0) + 1; }
  const topMentorIds = Object.entries(mentorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ═══════════════════════════════════════════════════════════════
  // BATCH 2: All time-series in parallel
  //   - Inscriptions per month (mCount queries)
  //   - Forum activity per week (wCount * 2 queries via inner Promise.all)
  //   - DMs per week (wCount queries)
  //   - DAU per day (dauDays queries)
  //   - Reports per month (mCount queries)
  //   - Mentorship evolution per month (mCount * 2 queries via inner Promise.all)
  //   - Invitations per month (mCount queries)
  //   + Top mentor name resolution (up to 5 queries)
  // ═══════════════════════════════════════════════════════════════
  const [
    inscriptionsCounts,
    forumCounts,
    dmCounts,
    dauCounts,
    reportsCounts,
    mentoratEvoCounts,
    invCounts,
    mentorNames,
  ] = await Promise.all([
    // Inscriptions per month
    Promise.all(monthRanges.map((r) => {
      let q = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles).gte("created_at", r.start).lt("created_at", r.end);
      if (validPromoId) q = q.eq("promo_id", validPromoId);
      return q;
    })),
    // Forum activity per week (posts + comments)
    Promise.all(weekRanges.map((r) =>
      Promise.all([
        supabase.from("forum_posts").select("id", { count: "exact", head: true }).gte("created_at", r.start).lt("created_at", r.end),
        supabase.from("forum_comments").select("id", { count: "exact", head: true }).gte("created_at", r.start).lt("created_at", r.end),
      ])
    )),
    // DMs per week
    Promise.all(weekRanges.map((r) =>
      supabase.from("direct_messages").select("id", { count: "exact", head: true }).gte("created_at", r.start).lt("created_at", r.end)
    )),
    // DAU per day
    Promise.all(dayRanges.map((r) => {
      let dq = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles).gte("last_seen_at", r.start).lt("last_seen_at", r.end);
      if (validPromoId) dq = dq.eq("promo_id", validPromoId);
      return dq;
    })),
    // Reports per month
    Promise.all(monthRanges.map((r) =>
      supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", r.start).lt("created_at", r.end)
    )),
    // Mentorship evolution per month (requests + sessions)
    Promise.all(monthRanges.map((r) =>
      Promise.all([
        supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).gte("created_at", r.start).lt("created_at", r.end),
        supabase.from("mentorship_sessions").select("id", { count: "exact", head: true }).gte("started_at", r.start).lt("started_at", r.end),
      ])
    )),
    // Invitations per month
    Promise.all(monthRanges.map((r) =>
      supabase.from("invitation_links").select("is_used, is_revoked").gte("created_at", r.start).lt("created_at", r.end)
    )),
    // Top mentor name resolution
    Promise.all(topMentorIds.map(([id]) =>
      supabase.from("profiles").select("first_name, last_name").eq("id", id).maybeSingle()
    )),
  ]);

  // ═══════════════════════════════════════
  // Map BATCH 2 results to data arrays
  // ═══════════════════════════════════════
  const inscriptionsData = monthRanges.map((r, i) => ({
    mois: r.label,
    inscriptions: inscriptionsCounts[i].count ?? 0,
  }));

  const forumData = weekRanges.map((r, i) => ({
    sem: r.label,
    posts: forumCounts[i][0].count ?? 0,
    comments: forumCounts[i][1].count ?? 0,
  }));

  const dmData = weekRanges.map((r, i) => ({
    sem: r.label,
    messages: dmCounts[i].count ?? 0,
  }));

  const dauData = dayRanges.map((r, i) => ({
    jour: r.label,
    actives: dauCounts[i].count ?? 0,
  }));

  const reportsData = monthRanges.map((r, i) => ({
    mois: r.label,
    reports: reportsCounts[i].count ?? 0,
  }));

  const mentoratEvoData = monthRanges.map((r, i) => ({
    mois: r.label,
    demandes: mentoratEvoCounts[i][0].count ?? 0,
    sessions: mentoratEvoCounts[i][1].count ?? 0,
  }));

  const invData = monthRanges.map((r, i) => {
    const arr = invCounts[i].data ?? [];
    return {
      mois: r.label,
      generes: arr.length,
      utilises: arr.filter((l) => l.is_used).length,
      revoques: arr.filter((l) => l.is_revoked).length,
    };
  });

  const topMentorsData = topMentorIds.map(([, count], i) => {
    const p = mentorNames[i].data;
    return { mentor: p ? `${(p.first_name || "?")[0]}. ${p.last_name}` : "?", sessions: count };
  });

  // ═══════════════════════════════════════════════════════════════
  // BATCH 3: Election details (depends on elections data from BATCH 1)
  // ═══════════════════════════════════════════════════════════════
  const completedEls = (elections ?? []).filter((e) => e.status === "completed");
  const elSlice = completedEls.slice(0, 8);

  const [partResults, candResults] = await Promise.all([
    // Participation per promo (votes + members for each election)
    Promise.all(elSlice.map((el) =>
      Promise.all([
        supabase.from("promo_votes").select("id", { count: "exact", head: true }).eq("election_id", el.id),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("promo_id", el.promo_id).eq("status", "active"),
      ])
    )),
    // Candidates per election
    Promise.all(elSlice.map((el) =>
      supabase.from("promo_candidates").select("id", { count: "exact", head: true }).eq("election_id", el.id)
    )),
  ]);

  const partData = elSlice.map((el, i) => {
    const votes = partResults[i][0].count ?? 0;
    const members = partResults[i][1].count ?? 0;
    return {
      promo: promoMap[el.promo_id] ?? el.promo_id.slice(0, 8),
      taux: members > 0 ? Math.round((votes / (members || 1)) * 100) : 0,
    };
  });

  const candData = elSlice.map((el, i) => ({
    election: promoMap[el.promo_id] ?? el.promo_id.slice(0, 8),
    candidates: candResults[i].count ?? 0,
  }));

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════
  const trendLabel = period === "7d" ? "vs 7j préc." : period === "90d" ? "vs 90j préc." : period === "1y" ? "vs année préc." : period === "all" ? "" : "vs période préc.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DashboardFilters promos={activePromos ?? []} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total membres" value={totalMembers ?? 0} icon={Users} color="#800020" />
        <KpiCard title="Nouvelles inscriptions" value={newThisPeriod ?? 0} icon={UserPlus} trend={trend !== 0 && trendLabel ? { value: trend, label: trendLabel } : undefined} color="#006B3F" />
        <KpiCard title="En attente" value={pendingCount ?? 0} icon={Clock} color="#D4A017" href="/admin/approvals" />
        <KpiCard title="Taux d'engagement" value={`${engRate}%`} icon={TrendingUp} color="#006B3F" />
      </div>

      <DashboardCharts
        kpis={{ totalMembers: totalMembers ?? 0, newThisWeek: newThisPeriod ?? 0, pending: pendingCount ?? 0, engagementRate: engRate, weekTrend: trend }}
        inscriptionsData={inscriptionsData} rolesData={rolesData}
        promoDistribution={promoDistribution} nationalitesData={nationalitesData} paysData={paysData} diasporaData={diasporaData} filieresData={filieresData}
        domainesData={domainesData} parcoursData={parcoursData} universData={universData} niveauxData={niveauxData} desiredData={desiredData} professionsData={professionsData}
        forumData={forumData} tagsData={tagsData} dmData={dmData} promoEngagementData={promoEngagementData} reportsData={reportsData}
        mentoratDomainesData={mentoratDomainesData} mentoratAcceptData={mentoratAcceptData} topMentorsData={topMentorsData} mentoratEvoData={mentoratEvoData}
        dauData={dauData} pushData={pushData} activitiesPopData={activitiesPopData} reactionsData={reactionsData} invData={invData}
        activeMentorships={activeMentorships ?? 0} pendingMentorRequests={pendingMentorRequests ?? 0}
        completedElections={completedElections ?? 0} promosWithoutLeader={promosWithoutLeader ?? 0}
        inactiveCount={inactiveCount ?? 0} modRate={modRate} activeConvos={activeConvos ?? 0} avgDelay={avgDelay}
        partData={partData} candData={candData}
        membersForExport={membersForExport ?? []}
      />
    </div>
  );
}
