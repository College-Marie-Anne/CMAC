import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { ModerationList } from "@/components/admin/moderation-list";
import { QueryError } from "@/components/admin/query-error";

export default async function ModerationPage() {
  try {
    const supabase = await createClient();

    const { data: reports, count, error } = await supabase
      .from("reports")
      .select(
        `id, reason, status, created_at, admin_note,
         reporter:reporter_id(id, first_name, last_name, username),
         reported_user:reported_user_id(id, first_name, last_name, username),
         reported_post:reported_post_id(id, content),
         reported_comment:reported_comment_id(id, content)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const pendingCount = reports.filter((r) => r.status === "pending").length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modération</h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingCount} signalement(s) en attente &middot; {count ?? 0} total
          </p>
        </div>

        {reports.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucun signalement</h2>
              <p className="text-sm text-gray-400">Les contenus signalés apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <ModerationList reports={reports} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/moderation]", err);
    return <QueryError />;
  }
}
