import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Crown, ShieldCheck, GraduationCap, Briefcase, Calendar, MapPin, Globe, BookOpen, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { formatDate, formatDateTime } from "@/lib/format-date";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch current admin
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) notFound();

  const { data: currentAdmin } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", authUser.id)
    .maybeSingle();

  // Fetch target user profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(`
      id, first_name, last_name, username, role, status, date_of_birth,
      nationality, country, class, filiere, promo_id, promo_start_date,
      avatar_url, bio, expected_end_date, enrollment_date,
      is_super_admin, must_change_password, is_profile_complete,
      registration_incomplete, last_seen_at, created_at, updated_at
    `)
    .eq("id", id)
    .single();

  if (profileErr || !profile) notFound();

  // Fetch related data in parallel
  const [
    { data: education },
    { data: professions },
    { data: activities },
    { data: desiredFields },
    { data: promotion },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from("user_education")
      .select("id, institution_type, institution_name, study_field, degree_level, start_year, end_year")
      .eq("profile_id", id)
      .order("start_year", { ascending: false }),
    supabase
      .from("user_professions")
      .select("id, title, company, is_current")
      .eq("profile_id", id)
      .order("is_current", { ascending: false }),
    supabase
      .from("profile_activities")
      .select("activity_id, activities(name)")
      .eq("profile_id", id),
    supabase
      .from("desired_study_fields")
      .select("id, field_name")
      .eq("profile_id", id),
    profile.promo_id
      ? supabase
          .from("promotions")
          .select("id, name, start_date, end_date, status")
          .eq("id", profile.promo_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("admin_audit_log")
      .select("id, admin_id, action, details, created_at")
      .eq("target_type", "profile")
      .eq("target_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const roleBadge = profile.is_super_admin
    ? { label: "Super-Admin", icon: Crown, bg: "bg-cma-or/15", text: "text-cma-or" }
    : profile.role === "admin"
      ? { label: "Admin", icon: ShieldCheck, bg: "bg-cma-vert/15", text: "text-cma-vert" }
      : null;

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-green-50", text: "text-green-600" },
    pending: { bg: "bg-amber-50", text: "text-amber-600" },
    suspended: { bg: "bg-red-50", text: "text-red-600" },
    deactivated: { bg: "bg-gray-100", text: "text-gray-500" },
  };
  const sc = statusColors[profile.status] ?? statusColors.pending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      {/* Incomplete registration warning */}
      {profile.registration_incomplete && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Inscription incomplète</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Certaines données secondaires (activités, parcours académique, métiers ou domaines d&apos;études) n&apos;ont pas pu être enregistrées lors de l&apos;inscription. Vérifiez et complétez manuellement.
            </p>
          </div>
        </div>
      )}

      {/* Profile header */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
              style={{ background: profile.role === "admin" ? "#800020" : "#006B3F" }}
            >
              {(profile.first_name || "?")[0]}{(profile.last_name || "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h1>
                {roleBadge && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                    <roleBadge.icon size={10} /> {roleBadge.label}
                  </span>
                )}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                  {profile.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
              {profile.bio && (
                <p className="text-sm text-gray-600 mt-2">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-400">
                <span className="capitalize">{profile.role}</span>
                {profile.country && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={10} /> {profile.country}
                  </span>
                )}
                {profile.nationality && profile.nationality.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Globe size={10} /> {profile.nationality.join(", ")}
                  </span>
                )}
                {profile.date_of_birth && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={10} /> {formatDate(profile.date_of_birth)}
                  </span>
                )}
                {profile.filiere && <span>Filière : {profile.filiere}</span>}
                {profile.class && <span>Classe : {profile.class}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Promotion */}
      {promotion && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Promotion</h3>
            <p className="text-sm text-gray-900">{promotion.name}</p>
            <p className="text-xs text-gray-400">
              {promotion.start_date} — {promotion.end_date} &middot; {promotion.status}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <GraduationCap size={14} /> Parcours académique
            </h3>
            <div className="space-y-3">
              {education.map((e) => (
                <div key={e.id} className="border-l-2 border-cma-or/30 pl-3">
                  <p className="text-sm font-medium text-gray-900">{e.study_field}</p>
                  <p className="text-xs text-gray-500">{e.institution_name}</p>
                  <p className="text-xs text-gray-400">
                    {e.degree_level && `${e.degree_level} · `}
                    {e.start_year}{e.end_year ? ` — ${e.end_year}` : " — en cours"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Professions */}
      {professions && professions.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <Briefcase size={14} /> Métiers
            </h3>
            <div className="space-y-2">
              {professions.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900">{p.title}</p>
                    {p.company && <p className="text-xs text-gray-400">{p.company}</p>}
                  </div>
                  {p.is_current && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                      Actuel
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities + desired fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activities && activities.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Activités</h3>
              <div className="flex flex-wrap gap-1.5">
                {activities.map((a) => {
                  const act = a.activities;
                  const name = act
                    ? Array.isArray(act)
                      ? (act[0] as { name: string } | undefined)?.name
                      : (act as { name: string }).name
                    : null;
                  if (!name) return null;
                  return (
                    <span
                      key={a.activity_id}
                      className="text-xs px-2.5 py-1 rounded-full bg-cma-bordeaux/10 text-cma-bordeaux"
                    >
                      {name}
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        {desiredFields && desiredFields.length > 0 && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <BookOpen size={14} /> Domaines désirés
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {desiredFields.map((d) => (
                  <span
                    key={d.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-cma-or/10 text-cma-or"
                  >
                    {d.field_name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Metadata */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Informations système</h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <div>
              <span className="text-gray-400">Inscrit le</span>
              <p className="text-gray-700">{formatDate(profile.created_at)}</p>
            </div>
            <div>
              <span className="text-gray-400">Dernière connexion</span>
              <p className="text-gray-700">
                {profile.last_seen_at
                  ? formatDateTime(profile.last_seen_at)
                  : "Jamais"}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Profil complet</span>
              <p className="text-gray-700">{profile.is_profile_complete ? "Oui" : "Non"}</p>
            </div>
            <div>
              <span className="text-gray-400">Changement mdp requis</span>
              <p className="text-gray-700">{profile.must_change_password ? "Oui" : "Non"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit log for this user */}
      {auditLogs && auditLogs.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Historique actions admin
            </h3>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {log.action}
                  </span>
                  <span className="text-gray-400">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <UserDetailActions
        userId={profile.id}
        status={profile.status}
        role={profile.role}
        isSuperAdmin={profile.is_super_admin}
        currentAdminIsSuperAdmin={currentAdmin?.is_super_admin ?? false}
      />
    </div>
  );
}
