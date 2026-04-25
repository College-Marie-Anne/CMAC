import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { BioEditor } from "@/components/profile/bio-editor";
import { IdentityEditor } from "@/components/profile/identity-editor";
import { EducationSection } from "@/components/profile/education-section";
import { ProfessionsSection } from "@/components/profile/professions-section";
import { ActivitiesSection } from "@/components/profile/activities-section";
import { DesiredFieldsSection } from "@/components/profile/desired-fields-section";
import {
  InvitationGenerator,
  type InvitationLinkItem,
} from "@/components/profile/invitation-generator";
import { ProfileBadges } from "@/components/profile/profile-badges";

export default async function ProfileEditPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(`
      id, username, first_name, last_name, avatar_url, bio, role, status,
      class, filiere, promo_id, promo_start_date, enrollment_date,
      nationality, country, is_super_admin
    `)
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const isStudent = profile.role === "student" || profile.role === "s4";

  const isAlumni = profile.role === "alumni";

  const [
    { data: education },
    { data: professions },
    { data: promo },
    { data: allActivities },
    { data: profileActivities },
    { data: desiredFields },
    { data: rawInvitations },
  ] = await Promise.all([
    supabase.from("user_education").select("id, institution_type, institution_name, study_field, degree_level, start_year, end_year").eq("profile_id", user.id).order("start_year", { ascending: false }),
    supabase.from("user_professions").select("id, title, company, is_current").eq("profile_id", user.id).order("is_current", { ascending: false }),
    profile.promo_id ? supabase.from("promotions").select("name").eq("id", profile.promo_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("activities").select("id, name").order("name"),
    supabase.from("profile_activities").select("activity_id").eq("profile_id", user.id),
    isStudent
      ? supabase.from("desired_study_fields").select("field_name").eq("profile_id", user.id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { field_name: string }[] }),
    // Invitations : seulement pour alumni (RLS bloque les autres rôles à la
    // création, donc inutile de fetch). On fetch les 30 plus récentes.
    isAlumni
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

  const selectedActivityIds = (profileActivities ?? []).map((r) => r.activity_id);
  const desiredFieldNames = (desiredFields ?? []).map((r) => r.field_name);

  // Résolution des invitées via la table de jonction invitation_link_uses
  // (une ligne par inscrite : jusqu'à max_uses entrées par lien).
  let invitations: InvitationLinkItem[] = [];
  if (isAlumni && rawInvitations && rawInvitations.length > 0) {
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
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft size={16} /> Retour
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <Settings size={14} /> Paramètres
          </Link>
          <Link href={`/profile/${profile.username}`} className="text-sm text-cma-bordeaux font-medium">
            Voir mon profil
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Modifier mon profil</h1>

        {/* Avatar + name + badges */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <AvatarUpload
            firstName={profile.first_name}
            lastName={profile.last_name}
            currentUrl={profile.avatar_url}
          />
          <div className="text-center mt-3">
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {profile.first_name} {profile.last_name}
            </p>
            <p className="text-xs text-gray-400">@{profile.username}</p>
            <div className="mt-2 flex justify-center">
              <ProfileBadges
                role={profile.role}
                isSuperAdmin={profile.is_super_admin}
                enrollmentDate={profile.enrollment_date}
                promoName={promo?.name}
              />
            </div>
          </div>
        </div>

        {/* Identité (username, prénom, nom) — l'utilisatrice peut modifier
            elle-même ces champs depuis ce commit. Rate-limité 3/jour. */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <IdentityEditor
            initial={{
              username: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
            }}
          />
        </div>

        {/* Bio */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <BioEditor initialBio={profile.bio} />
        </div>

        {/* Education */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <EducationSection education={education ?? []} />
        </div>

        {/* Professions (alumni & S4 only — S1-S3 n'ont pas encore de métier) */}
        {(profile.role === "alumni" || profile.role === "s4") && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <ProfessionsSection professions={professions ?? []} />
          </div>
        )}

        {/* Domaines d'études désirés (students S1-S4) */}
        {isStudent && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <DesiredFieldsSection initialFields={desiredFieldNames} />
          </div>
        )}

        {/* Activités parascolaires */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <ActivitiesSection
            allActivities={allActivities ?? []}
            selectedIds={selectedActivityIds}
          />
        </div>

        {/* Invitation links (alumni only) */}
        {isAlumni && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <InvitationGenerator invitations={invitations} />
          </div>
        )}

        {/* Info: admin-only fields */}
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-4 text-xs text-gray-500 dark:text-gray-400">
          <p className="font-medium text-gray-600 dark:text-gray-300 mb-1">Informations non modifiables</p>
          <p>
            Pour modifier votre nom, promotion, filière ou nationalité, contactez une administratrice
            ou soumettez un ticket de support.
          </p>
        </div>

        {/* Lien vers les paramètres (apparence, mot de passe, notifications, désactivation) */}
        <Link
          href="/settings"
          className="block rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:border-cma-bordeaux/30 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Settings size={16} /> Paramètres du compte
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Apparence, mot de passe, notifications, désactivation
              </p>
            </div>
            <span className="text-cma-bordeaux text-sm group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </div>
        </Link>
      </main>
    </div>
  );
}
