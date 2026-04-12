import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones } from "lucide-react";
import { SupportList } from "@/components/admin/support-list";
import { QueryError } from "@/components/admin/query-error";

export default async function SupportPage() {
  try {
    const supabase = await createClient();

    const { data: tickets, count, error } = await supabase
      .from("support_tickets")
      .select(
        `id, category, subject, message, status, created_at, resolved_at, admin_response,
         author:author_id(id, first_name, last_name, username),
         assigned:assigned_to(id, first_name, last_name, username)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const openCount = tickets.filter(
      (t) => t.status === "open" || t.status === "in_progress"
    ).length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-sm text-gray-500 mt-1">
            {openCount} ticket(s) ouvert(s) &middot; {count ?? 0} total
          </p>
        </div>

        {tickets.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Headphones size={24} className="text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucun ticket</h2>
              <p className="text-sm text-gray-400">Les tickets de support apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <SupportList tickets={tickets} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/support]", err);
    return <QueryError />;
  }
}
