import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Link2 } from "lucide-react";
import { InvitationsList } from "@/components/admin/invitations-list";
import { QueryError } from "@/components/admin/query-error";

export default async function InvitationsPage() {
  try {
    const supabase = await createClient();

    const { data: links, count, error } = await supabase
      .from("invitation_links")
      .select(
        `id, token, is_used, is_revoked, expires_at, created_at,
         inviter:inviter_id(id, first_name, last_name, username),
         used_by_profile:used_by(id, first_name, last_name, username)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const activeCount = links.filter(
      (l) => !l.is_used && !l.is_revoked && new Date(l.expires_at) > new Date()
    ).length;
    const usedCount = links.filter((l) => l.is_used).length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {count ?? 0} lien(s) &middot; {activeCount} actif(s) &middot; {usedCount} utilisé(s)
          </p>
        </div>

        {links.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Link2 size={24} className="text-gray-300" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Aucune invitation</h2>
              <p className="text-sm text-gray-400">Les liens d&apos;invitation générés par les alumni apparaîtront ici</p>
            </CardContent>
          </Card>
        ) : (
          <InvitationsList links={links} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/invitations]", err);
    return <QueryError />;
  }
}
