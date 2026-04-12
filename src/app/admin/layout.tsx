import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, username, role, status, is_super_admin, avatar_url, last_seen_at"
    )
    .eq("id", user.id)
    .single();

  // Vérifier que c'est un admin actif
  if (profileErr || !profile || profile.role !== "admin" || profile.status !== "active") {
    redirect("/feed");
  }

  // Vérifier inactivité > 2h
  if (profile.last_seen_at) {
    const lastSeen = new Date(profile.last_seen_at).getTime();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    if (lastSeen < twoHoursAgo) {
      await supabase.auth.signOut();
      redirect("/login");
    }
  }

  // Mettre à jour last_seen_at
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar
        profile={{
          firstName: profile.first_name,
          lastName: profile.last_name,
          username: profile.username,
          isSuperAdmin: profile.is_super_admin,
          avatarUrl: profile.avatar_url,
        }}
      />
      <main className="flex-1 bg-cma-gris min-h-screen lg:ml-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
