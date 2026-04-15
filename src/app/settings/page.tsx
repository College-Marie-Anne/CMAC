import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCog, Ban, ChevronRight } from "lucide-react";
import { ChangePasswordSection } from "@/components/settings/change-password-section";
import { NotificationPrefsSection } from "@/components/profile/notification-prefs-section";
import { DangerZone } from "@/components/profile/danger-zone";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { NotificationPrefs } from "@/lib/types/profile";

export const metadata = {
  title: "Paramètres — CMA Connect",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, status, theme_preference")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const { data: notificationPrefs } = await supabase
    .from("notification_preferences")
    .select(
      "dm, forum_reply, forum_comment_reply, reaction, mention, mentorship, mentorship_completed, election, new_opportunity, push_enabled"
    )
    .eq("profile_id", user.id)
    .maybeSingle();

  const prefs: NotificationPrefs = notificationPrefs ?? {
    dm: true,
    forum_reply: true,
    forum_comment_reply: true,
    reaction: true,
    mention: true,
    mentorship: true,
    mentorship_completed: true,
    election: true,
    new_opportunity: true,
    push_enabled: false,
  };

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft size={16} /> Retour
        </Link>
        <Link
          href="/profile/edit"
          className="inline-flex items-center gap-1.5 text-sm text-cma-bordeaux font-medium"
        >
          <UserCog size={14} /> Modifier mon profil
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Paramètres
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Apparence, sécurité, notifications et gestion du compte.
          </p>
        </div>

        {/* Apparence */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Apparence
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Le mode sombre s&apos;active automatiquement selon les préférences de ton appareil (« Système »).
          </p>
          <ThemeToggle initialTheme={profile.theme_preference} />
        </div>

        {/* Sécurité — Mot de passe */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <ChangePasswordSection />
        </div>

        {/* Préférences de notification */}
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <NotificationPrefsSection initial={prefs} userRole={profile.role} />
        </div>

        {/* Lien vers la liste des utilisatrices bloquées */}
        <Link
          href="/settings/blocked"
          className="block rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:border-cma-bordeaux/30 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                <Ban size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Utilisatrices bloquées
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Voir et gérer la liste des utilisatrices que tu as bloquées
                </p>
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-gray-400 group-hover:text-cma-bordeaux group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </div>
        </Link>

        {/* Zone de danger — désactivation */}
        <DangerZone />
      </main>
    </div>
  );
}
