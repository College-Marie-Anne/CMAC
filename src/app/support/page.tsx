import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, Clock, CheckCircle2, XCircle } from "lucide-react";
import { SupportTicketForm } from "@/components/support/support-ticket-form";

export const metadata = {
  title: "Support — CMA Connect",
};

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
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

type TicketRow = {
  id: string;
  category: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1);

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

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: tickets, count } = await supabase
    .from("support_tickets")
    .select("id, category, subject, status, created_at, updated_at", {
      count: "exact",
    })
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.max(Math.ceil((count ?? 0) / PAGE_SIZE), 1);
  const rows = (tickets ?? []) as TicketRow[];

  return (
    <main className="min-h-screen bg-cma-gris px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 border border-gray-100 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <LifeBuoy size={18} className="text-cma-bordeaux" />
              Contacter le support
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Décrivez votre demande. Un administrateur vous répondra dans les meilleurs délais.
            </p>
          </div>

          <div className="px-5 py-5">
            <SupportTicketForm />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Mes tickets ({count ?? 0})
            </h2>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-gray-800">
                Vous n&apos;avez pas encore de demande de support
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Utilisez le formulaire ci-dessus pour en créer une.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rows.map((t) => {
                const cfg = STATUS_LABELS[t.status] ?? STATUS_LABELS.open;
                const Icon = cfg.icon;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/support/${t.id}`}
                      className="block px-5 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {t.subject}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(t.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.color}`}
                        >
                          <Icon size={12} aria-hidden="true" />
                          {cfg.label}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <Link
                href={`/support?page=${Math.max(page - 1, 1)}`}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  page <= 1
                    ? "pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Précédent
              </Link>
              <p className="text-xs text-gray-500">
                Page {page} / {totalPages}
              </p>
              <Link
                href={`/support?page=${Math.min(page + 1, totalPages)}`}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  page >= totalPages
                    ? "pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Suivant
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
