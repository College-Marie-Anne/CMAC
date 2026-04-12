import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock, User, AlertCircle, Tag } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketActions } from "@/components/admin/ticket-actions";

const CATEGORY_LABELS: Record<string, string> = {
  profile_modification: "Modification de profil",
  promo_issue: "Problème de promotion",
  account_reactivation: "Réactivation de compte",
  bug_report: "Signalement de bug",
  other: "Autre",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-amber-50", text: "text-amber-600" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-600" },
  resolved: { bg: "bg-green-50", text: "text-green-600" },
  closed: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const supabase = await createClient();

  const { data: ticket, error: ticketErr } = await supabase
    .from("support_tickets")
    .select(
      `id, category, subject, message, status, created_at, resolved_at, admin_response,
       author:author_id(id, first_name, last_name, username),
       assigned:assigned_to(id, first_name, last_name, username)`
    )
    .eq("id", ticketId)
    .single();

  if (ticketErr || !ticket) notFound();

  // Current admin ID for self-assignment
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const currentAdminId = currentUser?.id ?? "";

  // Supabase FK select may return object or array depending on relation type.
  // Normalize to single object with a typed helper.
  type ProfileRef = { id: string; first_name: string; last_name: string; username: string };
  const unwrap = (val: unknown): ProfileRef | null => {
    if (!val) return null;
    if (Array.isArray(val)) return (val[0] as ProfileRef) ?? null;
    return val as ProfileRef;
  };
  const author = unwrap(ticket.author);
  const assigned = unwrap(ticket.assigned);
  const sc = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.open;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/admin/support"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Retour aux tickets
      </Link>

      {/* Header */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {ticket.subject}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}
                >
                  {ticket.status}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                  <Tag size={10} />
                  {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                </span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            {author && (
              <span className="inline-flex items-center gap-1">
                <User size={10} /> {author.first_name} {author.last_name} (@
                {author.username})
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock size={10} />
              {new Date(ticket.created_at).toLocaleString("fr-FR")}
            </span>
            {assigned && (
              <span>Assigné à @{assigned.username}</span>
            )}
            {ticket.resolved_at && (
              <span>
                Résolu le{" "}
                {new Date(ticket.resolved_at).toLocaleString("fr-FR")}
              </span>
            )}
          </div>

          {/* Message */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {ticket.message}
            </p>
          </div>

          {/* Admin response if exists */}
          {ticket.admin_response && (
            <div className="bg-cma-vert/5 border border-cma-vert/20 rounded-xl p-4">
              <p className="text-[10px] text-cma-vert font-semibold mb-1.5">
                Réponse admin
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {ticket.admin_response}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {ticket.status !== "closed" && (
        <TicketActions
          ticketId={ticket.id}
          status={ticket.status}
          currentAdminId={currentAdminId}
          isAssigned={!!assigned}
        />
      )}
    </div>
  );
}
