import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { UsersSearch } from "@/components/admin/users-search";
import { QueryError } from "@/components/admin/query-error";

export default async function UsersPage() {
  try {
    const supabase = await createClient();

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: currentAdmin } = authUser
      ? await supabase
          .from("profiles")
          .select("is_super_admin")
          .eq("id", authUser.id)
          .maybeSingle()
      : { data: null };

    const { data: users, count, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, username, role, status, is_super_admin, created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Utilisatrices</h1>
            <p className="text-sm text-gray-500 mt-1">{count ?? 0} compte(s)</p>
          </div>
          {currentAdmin?.is_super_admin && (
            <Link href="/admin/users/create">
              <Button
                size="sm"
                className="gap-1.5 rounded-xl text-xs bg-cma-or hover:bg-cma-or/80 text-black"
              >
                <UserPlus size={14} />
                Créer un admin
              </Button>
            </Link>
          )}
        </div>

        <UsersSearch users={users} />
      </div>
    );
  } catch (err) {
    console.error("[admin/users]", err);
    return <QueryError />;
  }
}
