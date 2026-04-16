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
        `id, token, is_revoked, expires_at, created_at, max_uses, used_count,
         inviter:inviter_id(id, first_name, last_name, username)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Fetch des usages de chaque lien (une ligne par inscrite, jusqu'à
    // max_uses par lien). Migration 032 a introduit invitation_link_uses.
    const linkIds = links.map((l) => l.id);
    const usesByLink = new Map<
      string,
      { name: string; username: string; used_at: string }[]
    >();

    if (linkIds.length > 0) {
      const { data: uses } = await supabase
        .from("invitation_link_uses")
        .select(
          "invitation_link_id, used_at, user:user_id(first_name, last_name, username)"
        )
        .in("invitation_link_id", linkIds)
        .order("used_at", { ascending: true });

      type UseRow = {
        invitation_link_id: string;
        used_at: string;
        user: {
          first_name: string | null;
          last_name: string | null;
          username: string | null;
        } | null;
      };
      for (const u of (uses ?? []) as unknown as UseRow[]) {
        const list = usesByLink.get(u.invitation_link_id) ?? [];
        list.push({
          name: `${u.user?.first_name ?? ""} ${u.user?.last_name ?? ""}`.trim() || "Utilisatrice",
          username: u.user?.username ?? "",
          used_at: u.used_at,
        });
        usesByLink.set(u.invitation_link_id, list);
      }
    }

    const enrichedLinks = links.map((l) => ({
      ...l,
      uses: usesByLink.get(l.id) ?? [],
    }));

    const activeCount = enrichedLinks.filter(
      (l) =>
        l.used_count < l.max_uses &&
        !l.is_revoked &&
        new Date(l.expires_at) > new Date()
    ).length;
    const fullCount = enrichedLinks.filter(
      (l) => l.used_count >= l.max_uses
    ).length;
    const totalUses = enrichedLinks.reduce((s, l) => s + l.used_count, 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invitations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {count ?? 0} lien(s) &middot; {activeCount} actif(s) &middot; {fullCount} épuisé(s) &middot; {totalUses} inscription(s) via lien
          </p>
        </div>

        {enrichedLinks.length === 0 ? (
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
          <InvitationsList links={enrichedLinks} />
        )}
      </div>
    );
  } catch (err) {
    console.error("[admin/invitations]", err);
    return <QueryError />;
  }
}
