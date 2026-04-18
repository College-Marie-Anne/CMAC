import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Globe, Calendar, MessageSquare, FileText } from "lucide-react";
import { formatDateMonthYear } from "@/lib/format-date";
import { UserAvatar } from "@/components/feed/user-avatar";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { ProfileModerationActions } from "@/components/moderation/profile-moderation-actions";
import {
  InvitationGenerator,
  type InvitationLinkItem,
} from "@/components/profile/invitation-generator";
import { timeAgo } from "@/lib/time-ago";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch profile by username
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(`
      id, username, first_name, last_name, avatar_url, bio, role, status,
      class, filiere, promo_id, promo_start_date, enrollment_date, expected_end_date,
      nationality, country, is_super_admin, theme_preference, created_at, last_seen_at
    `)
    .eq("username", username)
    .eq("status", "active")
    .single();

  if (profileErr || !profile) notFound();

  const isOwnProfile = profile.id === user.id;
  const isOwnAlumniProfile = isOwnProfile && profile.role === "alumni";

  // Fetch related data in parallel
  const [
    { data: education },
    { data: professions },
    { data: activities },
    { data: desiredFields },
    { data: promo },
    { count: postCount },
    { count: commentCount },
    { data: blockRow },
    { data: viewerProfile },
    { data: rawInvitations },
  ] = await Promise.all([
    supabase.from("user_education").select("id, institution_type, institution_name, study_field, degree_level, start_year, end_year").eq("profile_id", profile.id).order("start_year", { ascending: false }),
    supabase.from("user_professions").select("id, title, company, is_current").eq("profile_id", profile.id).order("is_current", { ascending: false }),
    supabase.from("profile_activities").select("activity_id, activities(name)").eq("profile_id", profile.id),
    supabase.from("desired_study_fields").select("id, field_name").eq("profile_id", profile.id),
    profile.promo_id ? supabase.from("promotions").select("name").eq("id", profile.promo_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("author_id", profile.id).eq("is_deleted", false),
    supabase.from("forum_comments").select("id", { count: "exact", head: true }).eq("author_id", profile.id).eq("is_deleted", false),
    isOwnProfile
      ? Promise.resolve({ data: null })
      : supabase
          .from("blocked_users")
          .select("blocker_id")
          .eq("blocker_id", user.id)
          .eq("blocked_id", profile.id)
          .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    // Invitations : seulement pour son propre profil alumni. La RLS
    // `invitation_links_select` filtrerait déjà, mais on skip la query
    // pour les autres cas pour économiser un round-trip.
    isOwnAlumniProfile
      ? supabase
          .from("invitation_links")
          .select(
            "id, token, expires_at, is_revoked, created_at, max_uses, used_count"
          )
          .eq("inviter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            token: string;
            expires_at: string;
            is_revoked: boolean;
            created_at: string;
            max_uses: number;
            used_count: number;
          }>,
        }),
  ]);

  const isAlreadyBlocked = !!blockRow;
  // Les admins ne peuvent pas bloquer/signaler depuis l'UI utilisatrice
  // (ils ont le dashboard /admin/moderation pour ça)
  const viewerIsAdmin = viewerProfile?.role === "admin";

  // Résolution des invitées via la table de jonction invitation_link_uses
  // (jusqu'à max_uses inscrites par lien — migration 032).
  let invitations: InvitationLinkItem[] = [];
  if (isOwnAlumniProfile && rawInvitations && rawInvitations.length > 0) {
    const linkIds = rawInvitations.map((l) => l.id);

    const { data: uses } = await supabase
      .from("invitation_link_uses")
      .select("invitation_link_id, user_id, used_at")
      .in("invitation_link_id", linkIds)
      .order("used_at", { ascending: true });

    const userIds = [...new Set((uses ?? []).map((u) => u.user_id))];
    const nameById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: invitedProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", userIds);
      for (const p of invitedProfiles ?? []) {
        nameById.set(p.id, `${p.first_name} ${p.last_name}`.trim());
      }
    }

    const usesByLink = new Map<string, { name: string; used_at: string }[]>();
    for (const u of uses ?? []) {
      const list = usesByLink.get(u.invitation_link_id) ?? [];
      list.push({
        name: nameById.get(u.user_id) ?? "Utilisatrice",
        used_at: u.used_at,
      });
      usesByLink.set(u.invitation_link_id, list);
    }

    invitations = rawInvitations.map((l) => ({
      id: l.id,
      token: l.token,
      expires_at: l.expires_at,
      is_revoked: l.is_revoked,
      created_at: l.created_at,
      max_uses: l.max_uses,
      used_count: l.used_count,
      uses: usesByLink.get(l.id) ?? [],
    }));
  }

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="ml-auto">
          {isOwnProfile ? (
            <Link href="/profile/edit" className="text-sm text-cma-bordeaux font-medium">
              Modifier
            </Link>
          ) : !viewerIsAdmin ? (
            <ProfileModerationActions
              targetUserId={profile.id}
              targetUsername={profile.username}
              targetFullName={`${profile.first_name} ${profile.last_name}`}
              isBlocked={isAlreadyBlocked}
            />
          ) : null}
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Profile header */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 text-center">
          <div className="flex justify-center mb-4">
            <UserAvatar firstName={profile.first_name} lastName={profile.last_name} avatarUrl={profile.avatar_url} size="xl" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {profile.first_name} {profile.last_name}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>

          <div className="mt-3 flex justify-center">
            <ProfileBadges
              role={profile.role}
              isSuperAdmin={profile.is_super_admin}
              enrollmentDate={profile.enrollment_date}
              promoName={promo?.name}
            />
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">{profile.bio}</p>
          )}

          {/* Meta info */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            {profile.country && (
              <span className="inline-flex items-center gap-1"><MapPin size={10} /> {profile.country}</span>
            )}
            {profile.nationality && profile.nationality.length > 0 && (
              <span className="inline-flex items-center gap-1"><Globe size={10} /> {profile.nationality.join(", ")}</span>
            )}
            <span className="inline-flex items-center gap-1"><Calendar size={10} /> Membre depuis {formatDateMonthYear(profile.created_at)}</span>
            {profile.last_seen_at && (
              <span>Active {timeAgo(profile.last_seen_at)}</span>
            )}
          </div>

          {/* Activity stats */}
          <div className="mt-4 flex justify-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{postCount ?? 0}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><FileText size={10} /> Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{commentCount ?? 0}</p>
              <p className="text-[10px] text-gray-400 flex items-center gap-1"><MessageSquare size={10} /> Commentaires</p>
            </div>
          </div>
        </div>

        {/* Education */}
        {education && education.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Parcours académique</h2>
            <div className="space-y-3">
              {education.map((e) => (
                <div key={e.id} className="border-l-2 border-cma-or/30 pl-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.study_field}</p>
                  <p className="text-xs text-gray-500">{e.institution_name}</p>
                  <p className="text-xs text-gray-400">
                    {e.degree_level && `${e.degree_level} · `}
                    {e.start_year}{e.end_year ? ` — ${e.end_year}` : e.start_year ? " — en cours" : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professions */}
        {professions && professions.length > 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Métiers</h2>
            <div className="space-y-2">
              {professions.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{p.title}</p>
                    {p.company && <p className="text-xs text-gray-400">{p.company}</p>}
                  </div>
                  {p.is_current && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">Actuel</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activities + desired fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activities && activities.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Activités</h2>
              <div className="flex flex-wrap gap-1.5">
                {activities.map((a) => {
                  const name = Array.isArray(a.activities) ? (a.activities[0] as { name: string })?.name : (a.activities as { name: string })?.name;
                  return name ? (
                    <span key={a.activity_id} className="text-xs px-2.5 py-1 rounded-full bg-cma-bordeaux/10 text-cma-bordeaux">{name}</span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {desiredFields && desiredFields.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Domaines désirés</h2>
              <div className="flex flex-wrap gap-1.5">
                {desiredFields.map((d) => (
                  <span key={d.id} className="text-xs px-2.5 py-1 rounded-full bg-cma-or/10 text-cma-bordeaux">{d.field_name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {profile.filiere && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Filière au CMA</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{profile.filiere}</p>
          </div>
        )}

        {/* Liens d'invitation — visible UNIQUEMENT sur son propre profil alumni.
            Les autres roles (s4, student, admin) ou les visiteuses d'un autre
            profil ne voient pas cette section. */}
        {isOwnAlumniProfile && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <InvitationGenerator invitations={invitations} />
          </div>
        )}
      </main>
    </div>
  );
}
