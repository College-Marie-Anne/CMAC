import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Ban, Users } from "lucide-react";
import { UnblockButton } from "@/components/moderation/unblock-button";

export const metadata = {
  title: "Utilisatrices bloquées — CMA Connect",
};

export default async function BlockedUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Récupère les blocked_id, puis joindre les profils en seconde requête.
  // (RLS sur blocked_users : SELECT par blocker_id = auth.uid())
  const { data: blocks } = await supabase
    .from("blocked_users")
    .select("blocked_id, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });

  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);
  const { data: blockedProfiles } = blockedIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, first_name, last_name, avatar_url, role")
        .in("id", blockedIds)
    : { data: [] as { id: string; username: string; first_name: string; last_name: string; avatar_url: string | null; role: string }[] };

  const profileMap = new Map((blockedProfiles ?? []).map((p) => [p.id, p]));
  const blockedList = (blocks ?? [])
    .map((b) => ({ ...b, profile: profileMap.get(b.blocked_id) }))
    .filter((b) => b.profile);

  return (
    <div className="min-h-screen bg-cma-gris dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
        >
          <ArrowLeft size={16} /> Paramètres
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ban size={20} className="text-red-500" /> Utilisatrices bloquées
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Les utilisatrices bloquées ne peuvent pas t&apos;envoyer de messages
            privés ni démarrer un mentorat avec toi.
          </p>
        </div>

        {blockedList.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Aucune utilisatrice bloquée
            </h3>
            <p className="text-sm text-gray-400">
              Tu peux bloquer une utilisatrice depuis son profil si nécessaire.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
            {blockedList.map((block) => {
              const p = block.profile!;
              const initials = `${(p.first_name || "?")[0]}${(p.last_name || "?")[0]}`;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <Link
                    href={`/profile/${p.username}`}
                    className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                  >
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt={`${p.first_name} ${p.last_name}`}
                        width={40}
                        height={40}
                        className="rounded-full object-cover shrink-0"
                        style={{ width: 40, height: 40 }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">@{p.username}</p>
                    </div>
                  </Link>
                  <UnblockButton
                    userId={p.id}
                    userLabel={`${p.first_name} ${p.last_name}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
