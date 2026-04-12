import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { AuditList } from "@/components/admin/audit-list";
import { QueryError } from "@/components/admin/query-error";

export default async function AuditPage() {
  try {
    const supabase = await createClient();

    const { data: logs, count, error } = await supabase
      .from("admin_audit_log")
      .select(
        `id, action, target_type, target_id, details, created_at,
         admin:admin_id(id, first_name, last_name, username)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const actionTypes = [...new Set(logs.map((l) => l.action))].sort();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal d&apos;audit</h1>
          <p className="text-sm text-gray-500 mt-1">
            {count ?? 0} entrée(s) — Log chronologique de toutes les actions admin
          </p>
        </div>

        {logs.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <FileText size={24} className="text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune entrée</h2>
              <p className="text-sm text-gray-400">Les actions admin seront tracées ici automatiquement</p>
            </CardContent>
          </Card>
        ) : (
          <AuditList logs={logs} actionTypes={actionTypes} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/audit]", err);
    return <QueryError />;
  }
}
