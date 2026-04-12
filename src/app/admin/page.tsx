import { createClient } from "@/utils/supabase/server";
import {
  Users, UserPlus, Clock, TrendingUp, Handshake, MessageSquare,
  Vote, UserX, Bell, ShieldAlert, Timer,
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

  // Type helper
  const _bq = supabase.from("profiles").select("id", { count: "exact", head: true });
  type PQ = typeof _bq;
  const pc = (extra?: (q: PQ) => PQ) => {
    let q: PQ = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles);
    if (validPromoId) q = q.eq("promo_id", validPromoId);
    if (extra) q = extra(q);
    return q;
  };

  // ═══════════════════════════════════════
  // KPIs (9 parallel)
  // ═══════════════════════════════════════
  const [
    { count: totalMembers }, { count: pendingCount },
    { count: newThisPeriod }, { count: newPrevPeriod },
    { count: activeMentorships }, { count: pendingMentorRequests },
    { count: completedElections }, { count: promosWithoutLeader },
    { count: inactiveCount },
  ] = await Promise.all([
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
  ]);
  const trend = (newPrevPeriod ?? 0) > 0 ? Math.round(((newThisPeriod ?? 0) - (newPrevPeriod ?? 0)) / (newPrevPeriod ?? 1) * 100) : 0;

  // ═══════════════════════════════════════
  // Roles donut (always all 3)
  // ═══════════════════════════════════════
  const [{ count: nAlumni }, { count: nS4 }, { count: nStudent }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "alumni").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "s4").eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("status", "active"),
  ]);
  const rolesData = [
    { name: "Alumni", value: nAlumni ?? 0, color: "#800020" },
    { name: "S4", value: nS4 ?? 0, color: "#006B3F" },
    { name: "S1-S3", value: nStudent ?? 0, color: "#D4A017" },
  ];

  // ═══════════════════════════════════════
  // Inscriptions per month
  // ═══════════════════════════════════════
  const mCount = days === null ? 12 : days <= 30 ? 4 : days <= 90 ? 6 : 12;
  const inscriptionsData: { mois: string; inscriptions: number }[] = [];
  for (let i = mCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = d.toISOString(), e = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    let q = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles).gte("created_at", s).lt("created_at", e);
    if (validPromoId) q = q.eq("promo_id", validPromoId);
    const { count: c } = await q;
    inscriptionsData.push({ mois: ML[d.getMonth()], inscriptions: c ?? 0 });
  }

  // ═══════════════════════════════════════
  // DEMOGRAPHIE: promotions, nationalités, pays, diaspora
  // ═══════════════════════════════════════
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("promo_id, nationality, country, filiere, role")
    .in("role", roles)
    .eq("status", "active");

  const filtered = validPromoId ? (allProfiles ?? []).filter((p) => p.promo_id === validPromoId) : (allProfiles ?? []);

  // Members per promo
  const promoCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.promo_id) promoCounts[p.promo_id] = (promoCounts[p.promo_id] ?? 0) + 1; }
  const promoMap = Object.fromEntries((activePromos ?? []).map((p) => [p.id, p.name]));
  const promoDistribution = Object.entries(promoCounts)
    .map(([id, count]) => ({ promo: promoMap[id] ?? id.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count).slice(0, 10);

  // Nationalities
  const natCounts: Record<string, number> = {};
  for (const p of filtered) { for (const n of p.nationality ?? []) { natCounts[n] = (natCounts[n] ?? 0) + 1; } }
  const nationalitesData = Object.entries(natCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nat, count]) => ({ nat, count }));

  // Countries
  const countryCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.country) countryCounts[p.country] = (countryCounts[p.country] ?? 0) + 1; }
  const paysData = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([pays, count]) => ({ pays, count }));

  // Diaspora (nationality != country)
  const diaspCounts: Record<string, number> = {};
  for (const p of filtered) {
    for (const n of p.nationality ?? []) {
      if (p.country && p.country !== n) diaspCounts[n] = (diaspCounts[n] ?? 0) + 1;
    }
  }
  const diasporaData = Object.entries(diaspCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nat, count]) => ({ nat, count }));

  // Filieres
  const filCounts: Record<string, number> = {};
  for (const p of filtered) { if (p.filiere) filCounts[p.filiere] = (filCounts[p.filiere] ?? 0) + 1; }
  const filieresData = Object.entries(filCounts).map(([name, value]) => ({ name, value, color: ["#800020","#006B3F","#D4A017","#a3003a","#008f54","#b8860b","#6B21A8"][Object.keys(filCounts).indexOf(name) % 7] }));

  // ═══════════════════════════════════════
  // PARCOURS: education data (single fetch, multiple aggregations)
  // ═══════════════════════════════════════
  const { data: eduRows } = await supabase.from("user_education").select("study_field, institution_type, institution_name, degree_level, profile_id");

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

  // Desired study fields (students)
  const { data: desiredRows } = await supabase.from("desired_study_fields").select("field_name, profile_id");
  const desiredFiltered = allowedIds ? (desiredRows ?? []).filter((r) => allowedIds!.has(r.profile_id)) : (desiredRows ?? []);
  const desiredData = topN(desiredFiltered.map((r) => ({ val: r.field_name })), 6).map(([domaine, count]) => ({ domaine, count }));

  // Professions (alumni)
  const { data: profRows } = await supabase.from("user_professions").select("title, profile_id").eq("is_current", true);
  const profFiltered = allowedIds ? (profRows ?? []).filter((r) => allowedIds!.has(r.profile_id)) : (profRows ?? []);
  const professionsData = topN(profFiltered.map((r) => ({ val: r.title })), 8).map(([metier, count]) => ({ metier, count }));

  // ═══════════════════════════════════════
  // ACTIVITE: forum, tags, DMs, promos, signalements
  // ═══════════════════════════════════════
  const wCount = days === null ? 12 : days <= 7 ? 1 : days <= 30 ? 4 : days <= 90 ? 6 : 12;
  const forumData: { sem: string; posts: number; comments: number }[] = [];
  for (let i = wCount - 1; i >= 0; i--) {
    const ws = daysAgo(i * 7 + 7), we = daysAgo(i * 7);
    const [{ count: p }, { count: co }] = await Promise.all([
      supabase.from("forum_posts").select("id", { count: "exact", head: true }).gte("created_at", ws).lt("created_at", we),
      supabase.from("forum_comments").select("id", { count: "exact", head: true }).gte("created_at", ws).lt("created_at", we),
    ]);
    forumData.push({ sem: `S${wCount - i}`, posts: p ?? 0, comments: co ?? 0 });
  }

  // Tags usage
  const { data: tagPosts } = await supabase.from("forum_posts").select("tag_id");
  const { data: allTags } = await supabase.from("forum_tags").select("id, name");
  const tagMap = Object.fromEntries((allTags ?? []).map((t) => [t.id, t.name]));
  const tagCounts: Record<string, number> = {};
  for (const p of tagPosts ?? []) { const n = tagMap[p.tag_id]; if (n) tagCounts[n] = (tagCounts[n] ?? 0) + 1; }
  const tagsData = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => ({ tag, count }));

  // DMs per week
  const dmData: { sem: string; messages: number }[] = [];
  for (let i = wCount - 1; i >= 0; i--) {
    const ws = daysAgo(i * 7 + 7), we = daysAgo(i * 7);
    const { count: c } = await supabase.from("direct_messages").select("id", { count: "exact", head: true }).gte("created_at", ws).lt("created_at", we);
    dmData.push({ sem: `S${wCount - i}`, messages: c ?? 0 });
  }

  // Engagement per promo (posts in coin promo)
  const { data: promoPosts } = await supabase.from("forum_posts").select("promo_id").not("promo_id", "is", null);
  const promoPostCounts: Record<string, number> = {};
  for (const p of promoPosts ?? []) { if (p.promo_id) promoPostCounts[p.promo_id] = (promoPostCounts[p.promo_id] ?? 0) + 1; }
  const promoEngagementData = Object.entries(promoPostCounts)
    .map(([id, count]) => ({ promo: promoMap[id] ?? id.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  // Reports per month
  const reportsData: { mois: string; reports: number }[] = [];
  for (let i = mCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = d.toISOString(), e = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const { count: c } = await supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", s).lt("created_at", e);
    reportsData.push({ mois: ML[d.getMonth()], reports: c ?? 0 });
  }

  // ═══════════════════════════════════════
  // MENTORAT: acceptance rate, top mentors, evolution
  // ═══════════════════════════════════════
  const { data: allMentorReqs } = await supabase.from("mentorship_requests").select("status, study_field, mentor_id, created_at");
  const mReqs = periodStart ? (allMentorReqs ?? []).filter((r) => r.created_at >= periodStart) : (allMentorReqs ?? []);
  const accepted = mReqs.filter((r) => r.status === "accepted").length;
  const declined = mReqs.filter((r) => r.status === "declined").length;
  const mentoratAcceptData = [
    { name: "Acceptées", value: accepted, color: "#006B3F" },
    { name: "Déclinées", value: declined, color: "#dc2626" },
    { name: "En attente", value: mReqs.filter((r) => r.status === "pending").length, color: "#D4A017" },
  ];
  const mentoratDomainesData = topN(mReqs.map((r) => ({ val: r.study_field })), 5).map(([domaine, demandes]) => ({ domaine, demandes }));

  // Top mentors
  const { data: mentorSessions } = await supabase.from("mentorship_sessions").select("mentor_id");
  const mentorCounts: Record<string, number> = {};
  for (const s of mentorSessions ?? []) { if (s.mentor_id) mentorCounts[s.mentor_id] = (mentorCounts[s.mentor_id] ?? 0) + 1; }
  const topMentorIds = Object.entries(mentorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMentorsData: { mentor: string; sessions: number }[] = [];
  for (const [id, count] of topMentorIds) {
    const { data: p } = await supabase.from("profiles").select("first_name, last_name").eq("id", id).maybeSingle();
    topMentorsData.push({ mentor: p ? `${(p.first_name || "?")[0]}. ${p.last_name}` : "?", sessions: count });
  }

  // Mentorship evolution per month
  const mentoratEvoData: { mois: string; demandes: number; sessions: number }[] = [];
  for (let i = mCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = d.toISOString(), e = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const [{ count: req }, { count: sess }] = await Promise.all([
      supabase.from("mentorship_requests").select("id", { count: "exact", head: true }).gte("created_at", s).lt("created_at", e),
      supabase.from("mentorship_sessions").select("id", { count: "exact", head: true }).gte("started_at", s).lt("started_at", e),
    ]);
    mentoratEvoData.push({ mois: ML[d.getMonth()], demandes: req ?? 0, sessions: sess ?? 0 });
  }

  // ═══════════════════════════════════════
  // ENGAGEMENT: push adoption, activities, reactions, invitations, moderation, conversations, mentorship delay
  // ═══════════════════════════════════════
  const dauDays = days === null ? 14 : Math.min(days, 14);
  const dauData: { jour: string; actives: number }[] = [];
  for (let i = dauDays - 1; i >= 0; i--) {
    const ds = new Date(); ds.setDate(ds.getDate() - i); ds.setHours(0,0,0,0);
    const de = new Date(ds); de.setDate(de.getDate() + 1);
    let dq = supabase.from("profiles").select("id", { count: "exact", head: true }).in("role", roles).gte("last_seen_at", ds.toISOString()).lt("last_seen_at", de.toISOString());
    if (validPromoId) dq = dq.eq("promo_id", validPromoId);
    const { count: c } = await dq;
    dauData.push({ jour: dauDays <= 7 ? DL[ds.getDay()] : `${ds.getDate()}/${ds.getMonth() + 1}`, actives: c ?? 0 });
  }

  const engW = Math.min(days ?? 30, 30);
  let engQ = supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active").in("role", roles).gte("last_seen_at", daysAgo(engW));
  if (validPromoId) engQ = engQ.eq("promo_id", validPromoId);
  const { count: activeInW } = await engQ;
  const totalActive = (nAlumni ?? 0) + (nS4 ?? 0) + (nStudent ?? 0);
  const engRate = totalActive > 0 ? Math.round(((activeInW ?? 0) / totalActive) * 100) : 0;

  // Push adoption
  const { count: pushCount } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true });
  const pushData = [
    { name: "Push activé", value: pushCount ?? 0, color: "#006B3F" },
    { name: "Sans push", value: Math.max(totalActive - (pushCount ?? 0), 0), color: "#E5E7EB" },
  ];

  // Popular activities
  const { data: actRows } = await supabase.from("profile_activities").select("activity_id");
  const { data: actNames } = await supabase.from("activities").select("id, name");
  const actMap = Object.fromEntries((actNames ?? []).map((a) => [a.id, a.name]));
  const actCounts: Record<string, number> = {};
  for (const r of actRows ?? []) { const n = actMap[r.activity_id]; if (n) actCounts[n] = (actCounts[n] ?? 0) + 1; }
  const activitiesPopData = Object.entries(actCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([activity, count]) => ({ activity, count }));

  // Reactions by type
  const { data: rxRows } = await supabase.from("forum_reactions").select("emoji");
  const rxCounts: Record<string, number> = { like: 0, heart: 0, clap: 0 };
  for (const r of rxRows ?? []) { if (r.emoji in rxCounts) rxCounts[r.emoji]++; }
  const reactionsData = [
    { name: "Like", value: rxCounts.like, color: "#3B82F6" },
    { name: "Heart", value: rxCounts.heart, color: "#EF4444" },
    { name: "Clap", value: rxCounts.clap, color: "#F59E0B" },
  ];

  // Invitations evolution per month
  const invData: { mois: string; generes: number; utilises: number; revoques: number }[] = [];
  for (let i = mCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const s = d.toISOString(), e = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const { data: inv } = await supabase.from("invitation_links").select("is_used, is_revoked").gte("created_at", s).lt("created_at", e);
    const arr = inv ?? [];
    invData.push({ mois: ML[d.getMonth()], generes: arr.length, utilises: arr.filter((l) => l.is_used).length, revoques: arr.filter((l) => l.is_revoked).length });
  }

  // Moderation rate
  const [{ count: totalPosts }, { count: deletedPosts }] = await Promise.all([
    supabase.from("forum_posts").select("id", { count: "exact", head: true }),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("is_deleted", true),
  ]);
  const modRate = (totalPosts ?? 0) > 0 ? Math.round(((deletedPosts ?? 0) / (totalPosts ?? 1)) * 100) : 0;

  // Active conversations (last 7 days)
  const { count: activeConvos } = await supabase.from("conversations").select("id", { count: "exact", head: true }).gte("last_message_at", daysAgo(7));

  // Mentorship response delay (avg hours)
  const { data: answeredReqs } = await supabase.from("mentorship_requests").select("created_at, updated_at").neq("status", "pending");
  let avgDelay = 0;
  if (answeredReqs && answeredReqs.length > 0) {
    const total = answeredReqs.reduce((sum, r) => sum + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()), 0);
    avgDelay = Math.round(total / answeredReqs.length / 3600000); // hours
  }

  // ═══════════════════════════════════════
  // ELECTIONS: participation rate, candidates per election
  // ═══════════════════════════════════════
  const { data: elections } = await supabase.from("promo_elections").select("id, promo_id, status");
  const completedEls = (elections ?? []).filter((e) => e.status === "completed");

  // Participation per promo
  const partData: { promo: string; taux: number }[] = [];
  for (const el of completedEls.slice(0, 8)) {
    const [{ count: votes }, { count: members }] = await Promise.all([
      supabase.from("promo_votes").select("id", { count: "exact", head: true }).eq("election_id", el.id),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("promo_id", el.promo_id).eq("status", "active"),
    ]);
    const pName = promoMap[el.promo_id] ?? el.promo_id.slice(0, 8);
    partData.push({ promo: pName, taux: (members ?? 0) > 0 ? Math.round(((votes ?? 0) / (members ?? 1)) * 100) : 0 });
  }

  // Candidates per election
  const candData: { election: string; candidates: number }[] = [];
  for (const el of completedEls.slice(0, 8)) {
    const { count: cands } = await supabase.from("promo_candidates").select("id", { count: "exact", head: true }).eq("election_id", el.id);
    candData.push({ election: promoMap[el.promo_id] ?? el.promo_id.slice(0, 8), candidates: cands ?? 0 });
  }

  // ═══════════════════════════════════════
  // CSV export
  // ═══════════════════════════════════════
  let csvQ = supabase.from("profiles").select("first_name, last_name, username, role, status, nationality, country, filiere, class, created_at, last_seen_at").in("role", roles).order("created_at", { ascending: false }).limit(500);
  if (periodStart) csvQ = csvQ.gte("created_at", periodStart);
  if (validPromoId) csvQ = csvQ.eq("promo_id", validPromoId);
  const { data: membersForExport } = await csvQ;

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
