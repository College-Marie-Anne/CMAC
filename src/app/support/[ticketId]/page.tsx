import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LifeBuoy,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { SUPPORT_CATEGORY_LABELS, type SupportCategory } from "@/lib/validations/support";
import { formatDateLongTime } from "@/lib/format-date";

export const metadata = {
  title: "Ticket de support — CMA Connect",
};

const STATUS_LABELS: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  open: {
    label: "Ouvert",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Clock,
  },
  in_progress: {
    label: "En cours",
    color: "bg-cma-or/10 text-cma-or border-cma-or/30",
    icon: Clock,
  },
  resolved: {
    label: "Résolu",
    color: "bg-green-50 text-cma-vert border-green-200",
    icon: CheckCircle2,
  },
  closed: {
    label: "Clôturé",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: XCircle,
  },
};

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
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

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      "id, author_id, category, subject, message, status, admin_response, resolved_at, created_at, updated_at"
    )
    .eq("id", ticketId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (error || !ticket) notFound();

  const cfg = STATUS_LABELS[ticket.status] ?? STATUS_LABELS.open;
  const Icon = cfg.icon;
  const categoryLabel =
    SUPPORT_CATEGORY_LABELS[ticket.category as SupportCategory] ??
    ticket.category;

  return (
    <main className="min-h-screen bg-cma-gris px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/support"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 border border-gray-100 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Retour aux tickets
          </Link>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${cfg.color}`}
          >
            <Icon size={12} aria-hidden="true" />
            {cfg.label}
          </span>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-cma-bordeaux mb-1">
              <LifeBuoy size={16} aria-hidden="true" />
              <p className="text-[11px] uppercase tracking-wider font-bold">
                {categoryLabel}
              </p>
            </div>
            <h1 className="text-base font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Créé le {formatDateLongTime(ticket.created_at)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">
              Votre message
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {ticket.message}
            </p>
          </div>
        </section>

        {ticket.admin_response ? (
          <section className="rounded-2xl border border-cma-vert/20 bg-green-50/30 shadow-sm">
            <div className="border-b border-cma-vert/20 px-5 py-3 flex items-center gap-2 text-cma-vert">
              <MessageCircle size={16} aria-hidden="true" />
              <p className="text-[11px] uppercase tracking-wider font-bold">
                Réponse de l&apos;administration
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">
                {ticket.admin_response}
              </p>
              {ticket.resolved_at ? (
                <p className="text-xs text-gray-500 mt-3">
                  Répondu le {formatDateLongTime(ticket.resolved_at)}
                </p>
              ) : null}
            </div>
          </section>
        ) : ticket.status === "open" || ticket.status === "in_progress" ? (
          <section className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center">
            <p className="text-sm text-gray-700 font-medium">
              En attente d&apos;une réponse de l&apos;administration
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Un administrateur prendra contact avec vous dès que possible.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
