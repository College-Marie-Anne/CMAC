import { createClient } from "@/utils/supabase/server";
import { UserCheck } from "lucide-react";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { QueryError } from "@/components/admin/query-error";

export default async function ApprovalsPage() {
  try {
    const supabase = await createClient();

    const { data: pendingUsers, count, error } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, username, role, date_of_birth, nationality, country, created_at",
        { count: "exact" }
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Approbations</h1>
            <p className="text-sm text-gray-500 mt-1">
              {count ?? 0} inscription(s) en attente
            </p>
          </div>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <UserCheck size={24} className="text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Aucune inscription en attente
            </h2>
            <p className="text-sm text-gray-400">
              Toutes les demandes ont été traitées
            </p>
          </div>
        ) : (
          <ApprovalActions users={pendingUsers} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/approvals]", err);
    return <QueryError />;
  }
}
