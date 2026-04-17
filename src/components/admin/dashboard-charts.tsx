"use client";

import { useCallback } from "react";
import {
  Handshake, MessageSquare, Vote, Users, UserX,
  FileText, FileSpreadsheet, ShieldAlert, Timer, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/admin/charts/kpi-card";
import { LineChartCard } from "@/components/admin/charts/line-chart-card";
import { DonutChartCard } from "@/components/admin/charts/donut-chart-card";
import { BarChartCard } from "@/components/admin/charts/bar-chart-card";
import { CMA_LOGO_BASE64 } from "@/lib/logo-base64";
import { formatDate, formatTime } from "@/lib/format-date";

type MemberRow = {
  first_name: string; last_name: string; username: string; role: string;
  status: string; nationality: string[] | null; country: string | null;
  filiere: string | null; class: string | null; created_at: string; last_seen_at: string | null;
};

interface Props {
  kpis: { totalMembers: number; newThisWeek: number; pending: number; engagementRate: number; weekTrend: number };
  // Démographie
  inscriptionsData: { mois: string; inscriptions: number }[];
  rolesData: { name: string; value: number; color: string }[];
  promoDistribution: { promo: string; count: number }[];
  nationalitesData: { nat: string; count: number }[];
  paysData: { pays: string; count: number }[];
  diasporaData: { nat: string; count: number }[];
  filieresData: { name: string; value: number; color: string }[];
  // Parcours
  domainesData: { domaine: string; count: number }[];
  parcoursData: { name: string; value: number; color: string }[];
  universData: { univ: string; count: number }[];
  niveauxData: { niveau: string; count: number }[];
  desiredData: { domaine: string; count: number }[];
  professionsData: { metier: string; count: number }[];
  // Activité
  forumData: { sem: string; posts: number; comments: number }[];
  tagsData: { tag: string; count: number }[];
  dmData: { sem: string; messages: number }[];
  promoEngagementData: { promo: string; count: number }[];
  reportsData: { mois: string; reports: number }[];
  // Mentorat
  mentoratDomainesData: { domaine: string; demandes: number }[];
  mentoratAcceptData: { name: string; value: number; color: string }[];
  topMentorsData: { mentor: string; sessions: number }[];
  mentoratEvoData: { mois: string; demandes: number; sessions: number }[];
  // Engagement
  dauData: { jour: string; actives: number }[];
  pushData: { name: string; value: number; color: string }[];
  activitiesPopData: { activity: string; count: number }[];
  reactionsData: { name: string; value: number; color: string }[];
  invData: { mois: string; generes: number; utilises: number; revoques: number }[];
  // KPIs scalaires
  activeMentorships: number; pendingMentorRequests: number;
  completedElections: number; promosWithoutLeader: number;
  inactiveCount: number; modRate: number; activeConvos: number; avgDelay: number;
  // Élections
  partData: { promo: string; taux: number }[];
  candData: { election: string; candidates: number }[];
  membersForExport: MemberRow[];
}

// ─── CSV ───
function downloadCSV(members: MemberRow[]) {
  const h = ["Prénoms","Nom","Username","Rôle","Statut","Nationalité","Pays","Filière","Classe","Inscription","Dernière connexion"];
  const rows = members.map((m) => [m.first_name, m.last_name, m.username, m.role, m.status, (m.nationality ?? []).join(" / "), m.country ?? "", m.filiere ?? "", m.class ?? "", formatDate(m.created_at), m.last_seen_at ? formatDate(m.last_seen_at) : "Jamais"]);
  const bom = "\uFEFF";
  const csv = bom + [h, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `cma-connect-membres-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

// ─── PDF ───
async function downloadPDF(p: Props) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;
  const logoW = 35, logoH = (279/512)*logoW;
  doc.addImage(CMA_LOGO_BASE64, "JPEG", (pw-logoW)/2, y, logoW, logoH); y += logoH + 6;
  const title = (t: string) => { doc.setFontSize(14); doc.setTextColor(128,0,32); doc.text(t, 14, y); y += 7; };
  const sub = (t: string) => { doc.setFontSize(11); doc.setTextColor(80,80,80); doc.text(t, 14, y); y += 5; };
  const kv = (k: string, v: string | number) => { doc.setFontSize(9); doc.setTextColor(100,100,100); doc.text(`${k}:`, 14, y); doc.setTextColor(26,26,26); doc.setFont("helvetica","bold"); doc.text(String(v), 70, y); doc.setFont("helvetica","normal"); y += 4.5; };
  const sep = () => { doc.setDrawColor(212,160,23); doc.setLineWidth(0.3); doc.line(14, y, pw-14, y); y += 5; };
  const chk = () => { if (y > 270) { doc.addPage(); y = 15; } };

  title("CMA Connect - Rapport Dashboard");
  doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text(`Généré le ${formatDate(new Date())} à ${formatTime(new Date())}`, 14, y); y += 8;

  sub("Indicateurs clés"); kv("Total membres", p.kpis.totalMembers); kv("Nouvelles inscriptions", p.kpis.newThisWeek); kv("En attente", p.kpis.pending); kv("Engagement", `${p.kpis.engagementRate}%`); kv("Mentorats actifs", p.activeMentorships); kv("Demandes mentorat", p.pendingMentorRequests); kv("Élections tenues", p.completedElections); kv("Promos sans chef", p.promosWithoutLeader); kv("Inactives >30j", p.inactiveCount); kv("Taux modération", `${p.modRate}%`); kv("Conversations actives", p.activeConvos); kv("Délai mentorat", `${p.avgDelay}h`); sep();

  chk(); sub("Répartition par rôle"); p.rolesData.forEach((r) => kv(r.name, r.value)); sep();
  chk(); sub("Inscriptions par mois"); p.inscriptionsData.forEach((r) => kv(r.mois, r.inscriptions)); sep();
  chk(); sub("Membres par promotion"); p.promoDistribution.forEach((r) => kv(r.promo, r.count)); sep();
  chk(); sub("Top nationalités"); p.nationalitesData.forEach((r) => kv(r.nat, r.count)); sep();
  chk(); sub("Pays de résidence"); p.paysData.forEach((r) => kv(r.pays, r.count)); sep();
  chk(); sub("Top domaines d'études"); p.domainesData.forEach((r) => kv(r.domaine, r.count)); sep();
  chk(); sub("Top universités"); p.universData.forEach((r) => kv(r.univ, r.count)); sep();
  chk(); sub("Niveaux d'études"); p.niveauxData.forEach((r) => kv(r.niveau, r.count)); sep();
  chk(); sub("Professions (alumni)"); p.professionsData.forEach((r) => kv(r.metier, r.count)); sep();
  chk(); sub("Forum activité"); p.forumData.forEach((r) => kv(`${r.sem}`, `${r.posts} posts / ${r.comments} com.`)); sep();
  chk(); sub("Top mentors"); p.topMentorsData.forEach((r) => kv(r.mentor, `${r.sessions} sessions`)); sep();

  const pc = doc.getNumberOfPages();
  const fLogoW = 8, fLogoH = (279/512)*fLogoW;
  for (let i = 1; i <= pc; i++) { doc.setPage(i); doc.addImage(CMA_LOGO_BASE64, "JPEG", 14, 286-fLogoH/2, fLogoW, fLogoH); doc.setFontSize(8); doc.setTextColor(180,180,180); doc.text(`CMA Connect — Page ${i}/${pc}`, pw/2, 290, { align: "center" }); }
  doc.save(`cma-connect-rapport-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Empty chart placeholder ───
function Empty({ title }: { title: string }) {
  return <div className="rounded-2xl bg-white shadow-sm p-8 text-center"><p className="text-sm font-medium text-gray-700 mb-2">{title}</p><p className="text-xs text-gray-400">Aucune donnée</p></div>;
}

// ─── Section header ───
function SH({ children }: { children: string }) {
  return <h2 className="text-lg font-semibold text-gray-800 mb-4">{children}</h2>;
}

// ─── Conditional chart render ───
function Chart({ title, data, xKey, bars, lines, type }: { title: string; data: Record<string, string | number>[]; xKey: string; bars?: { dataKey: string; color: string; name: string }[]; lines?: { dataKey: string; color: string; name: string }[]; type: "bar" | "line" }) {
  if (data.length === 0) return <Empty title={title} />;
  if (type === "bar") return <BarChartCard title={title} data={data} xDataKey={xKey} bars={bars!} />;
  return <LineChartCard title={title} data={data} xDataKey={xKey} lines={lines!} />;
}

// ─── Component ───
export function DashboardCharts(p: Props) {
  const handlePDF = useCallback(() => downloadPDF(p), [p]);
  const handleCSV = useCallback(() => downloadCSV(p.membersForExport), [p.membersForExport]);

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handlePDF} className="gap-1.5 rounded-xl text-xs"><FileText size={14} />PDF</Button>
        <Button variant="outline" size="sm" onClick={handleCSV} className="gap-1.5 rounded-xl text-xs"><FileSpreadsheet size={14} />CSV</Button>
      </div>

      {/* ═══ DEMOGRAPHIE ═══ */}
      <section><SH>Démographie</SH>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LineChartCard title="Évolution des inscriptions" data={p.inscriptionsData} xDataKey="mois" lines={[{ dataKey: "inscriptions", color: "#800020", name: "Inscriptions" }]} />
          <DonutChartCard title="Répartition par rôle" data={p.rolesData} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Membres par promotion" data={p.promoDistribution} xKey="promo" bars={[{ dataKey: "count", color: "#800020", name: "Membres" }]} type="bar" />
          <Chart title="Top nationalités" data={p.nationalitesData} xKey="nat" bars={[{ dataKey: "count", color: "#006B3F", name: "Membres" }]} type="bar" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Pays de résidence" data={p.paysData} xKey="pays" bars={[{ dataKey: "count", color: "#D4A017", name: "Membres" }]} type="bar" />
          <Chart title="Diaspora (nationalité hors pays)" data={p.diasporaData} xKey="nat" bars={[{ dataKey: "count", color: "#a3003a", name: "Expatriées" }]} type="bar" />
        </div>
      </section>

      {/* ═══ PARCOURS ═══ */}
      <section><SH>Parcours académique & professionnel</SH>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Chart title="Top domaines d'études" data={p.domainesData} xKey="domaine" bars={[{ dataKey: "count", color: "#006B3F", name: "Étudiantes" }]} type="bar" />
          <DonutChartCard title="Type de parcours" data={p.parcoursData} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Universités fréquentées" data={p.universData} xKey="univ" bars={[{ dataKey: "count", color: "#800020", name: "Membres" }]} type="bar" />
          <Chart title="Niveaux d'études" data={p.niveauxData} xKey="niveau" bars={[{ dataKey: "count", color: "#D4A017", name: "Membres" }]} type="bar" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Domaines d'études désirés (élèves)" data={p.desiredData} xKey="domaine" bars={[{ dataKey: "count", color: "#008f54", name: "Élèves" }]} type="bar" />
          <Chart title="Professions (alumni)" data={p.professionsData} xKey="metier" bars={[{ dataKey: "count", color: "#800020", name: "Alumni" }]} type="bar" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {p.filieresData.length > 0 ? <DonutChartCard title="Filières au CMA" data={p.filieresData} /> : <Empty title="Filières au CMA" />}
        </div>
      </section>

      {/* ═══ ACTIVITE ═══ */}
      <section><SH>Activité de la plateforme</SH>
        <LineChartCard title="Forum (posts + commentaires)" data={p.forumData} xDataKey="sem" lines={[{ dataKey: "posts", color: "#800020", name: "Posts" }, { dataKey: "comments", color: "#006B3F", name: "Commentaires" }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Tags les plus utilisés" data={p.tagsData} xKey="tag" bars={[{ dataKey: "count", color: "#8B5CF6", name: "Posts" }]} type="bar" />
          <LineChartCard title="Messagerie (DMs/semaine)" data={p.dmData} xDataKey="sem" lines={[{ dataKey: "messages", color: "#06B6D4", name: "Messages" }]} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Engagement par promo (Coin Promo)" data={p.promoEngagementData} xKey="promo" bars={[{ dataKey: "count", color: "#006B3F", name: "Posts" }]} type="bar" />
          <LineChartCard title="Signalements par mois" data={p.reportsData} xDataKey="mois" lines={[{ dataKey: "reports", color: "#dc2626", name: "Signalements" }]} />
        </div>
      </section>

      {/* ═══ MENTORAT ═══ */}
      <section><SH>Mentorat</SH>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard title="Mentorats actifs" value={p.activeMentorships} icon={Handshake} color="#006B3F" />
          <KpiCard title="Demandes en attente" value={p.pendingMentorRequests} icon={MessageSquare} color="#D4A017" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {p.mentoratAcceptData.some((d) => d.value > 0) ? <DonutChartCard title="Taux d'acceptation mentorat" data={p.mentoratAcceptData} /> : <Empty title="Taux d'acceptation" />}
          <Chart title="Domaines les plus demandés" data={p.mentoratDomainesData} xKey="domaine" bars={[{ dataKey: "demandes", color: "#D4A017", name: "Demandes" }]} type="bar" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Chart title="Top mentors" data={p.topMentorsData} xKey="mentor" bars={[{ dataKey: "sessions", color: "#006B3F", name: "Sessions" }]} type="bar" />
          <LineChartCard title="Évolution mentorat" data={p.mentoratEvoData} xDataKey="mois" lines={[{ dataKey: "demandes", color: "#D4A017", name: "Demandes" }, { dataKey: "sessions", color: "#006B3F", name: "Sessions" }]} />
        </div>
      </section>

      {/* ═══ ENGAGEMENT ═══ */}
      <section><SH>Engagement & Rétention</SH>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard title="Inactives (>30j)" value={p.inactiveCount} icon={UserX} color="#dc2626" />
          <KpiCard title="Taux modération" value={`${p.modRate}%`} icon={ShieldAlert} color="#F59E0B" />
          <KpiCard title="Conversations actives" value={p.activeConvos} icon={MessagesSquare} color="#06B6D4" />
          <KpiCard title="Délai réponse mentorat" value={`${p.avgDelay}h`} icon={Timer} color="#8B5CF6" />
        </div>
        <LineChartCard title="Utilisatrices actives par jour (DAU)" data={p.dauData} xDataKey="jour" lines={[{ dataKey: "actives", color: "#800020", name: "Actives" }]} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {p.pushData.some((d) => d.value > 0) ? <DonutChartCard title="Adoption notifications push" data={p.pushData} /> : <Empty title="Adoption push" />}
          <Chart title="Activités parascolaires populaires" data={p.activitiesPopData} xKey="activity" bars={[{ dataKey: "count", color: "#006B3F", name: "Membres" }]} type="bar" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {p.reactionsData.some((d) => d.value > 0) ? <DonutChartCard title="Réactions par type" data={p.reactionsData} /> : <Empty title="Réactions par type" />}
          <LineChartCard title="Invitations (évolution)" data={p.invData} xDataKey="mois" lines={[{ dataKey: "generes", color: "#800020", name: "Générés" }, { dataKey: "utilises", color: "#006B3F", name: "Utilisés" }, { dataKey: "revoques", color: "#dc2626", name: "Révoqués" }]} />
        </div>
      </section>

      {/* ═══ ELECTIONS ═══ */}
      <section><SH>Élections de promo</SH>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard title="Élections tenues" value={p.completedElections} icon={Vote} color="#006B3F" />
          <KpiCard title="Promos sans chef" value={p.promosWithoutLeader} icon={Users} color="#D4A017" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Chart title="Taux de participation" data={p.partData} xKey="promo" bars={[{ dataKey: "taux", color: "#006B3F", name: "%" }]} type="bar" />
          <Chart title="Candidates par élection" data={p.candData} xKey="election" bars={[{ dataKey: "candidates", color: "#D4A017", name: "Candidates" }]} type="bar" />
        </div>
      </section>
    </div>
  );
}
