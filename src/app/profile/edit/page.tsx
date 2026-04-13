import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { BioEditor } from "@/components/profile/bio-editor";
import { EducationSection } from "@/components/profile/education-section";
import { ProfessionsSection } from "@/components/profile/professions-section";
import { InvitationGenerator } from "@/components/profile/invitation-generator";
import { DangerZone } from "@/components/profile/danger-zone";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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
      nationality, country, is_super_admin, theme_preference
    `)
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const [
    { data: education },
    { data: professions },
    { data: promo },
  ] = await Promise.all([
    supabase.from("user_education").select("id, institution_type, institution_name, study_field, degree_level, start_year, end_year").eq("profile_id", user.id).order("start_year", { ascending: false }),
    supabase.from("user_professions").select("id, title, company, is_current").eq("profile_id", user.id).order("is_current", { ascending: false }),
    profile.promo_id ? supabase.from("promotions").select("name").eq("id", profile.promo_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft size={16} /> Retour
        </Link>
        <Link href={`/profile/${profile.username}`} className="text-sm text-cma-bordeaux font-medium">
          Voir mon profil
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Modifier mon profil</h1>

        {/* Avatar + name + badges */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6">
          <AvatarUpload
            firstName={profile.first_name}
            lastName={profile.last_name}
            currentUrl={profile.avatar_url}
            userId={user.id}
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

        {/* Bio */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <BioEditor initialBio={profile.bio} />
        </div>

        {/* Education */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <EducationSection education={education ?? []} />
        </div>

        {/* Professions */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <ProfessionsSection professions={professions ?? []} />
        </div>

        {/* Settings: Theme */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Apparence</h3>
          <ThemeToggle initialTheme={profile.theme_preference} />
        </div>

        {/* Invitation links (alumni only) */}
        {profile.role === "alumni" && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <InvitationGenerator />
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

        {/* Danger zone */}
        <DangerZone />
      </main>
    </div>
  );
}
