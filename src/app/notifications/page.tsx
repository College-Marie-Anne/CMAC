import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  deleteNotificationAction,
  openNotificationAction,
} from "@/actions/notifications";

export const metadata = {
  title: "Notifications — CMA Connect",
};

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  dm: "Message prive",
  forum_reply: "Reponse a votre post",
  forum_comment_reply: "Reponse en discussion",
  reaction: "Reaction",
  mention: "Mention",
  admin: "Administration",
  account_approved: "Compte approuve",
  account_suspended: "Compte suspendu",
  account_deactivated: "Compte desactive",
  account_reactivated: "Compte reactive",
  promo_rejected: "Promotion rejetee",
  mentorship: "Mentorat",
  mentorship_completed: "Mentorat termine",
  invitation_used: "Invitation utilisee",
  election: "Election",
  post_pinned: "Post epingle",
  new_opportunity: "Nouvelle opportunite",
  support_reply: "Reponse support",
};

function labelForType(type: string): string {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function dayLabel(dateIso: string): string {
  const d = new Date(dateIso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const thatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((today - thatDay) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string; type?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(Number.parseInt(sp.page ?? "1", 10) || 1, 1);
  const filter = sp.filter === "unread" ? "unread" : "all";
  const typeFilter = sp.type?.trim() || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  let baseQuery = supabase
    .from("notifications")
    .select("id, type, content, reference_id, is_read, created_at", { count: "exact" })
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  if (filter === "unread") baseQuery = baseQuery.eq("is_read", false);
  if (typeFilter !== "all") baseQuery = baseQuery.eq("type", typeFilter);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: notifications, count: totalCount } = await baseQuery.range(from, to);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;
  const referenceIds = (notifications ?? [])
    .map((n) => n.reference_id)
    .filter((id): id is string => Boolean(id));

  // Types informationnels : pas de destination utile (le contenu est déjà
  // affiché dans la card de notif). Le bouton "Ouvrir" est caché pour eux.
  const INFO_ONLY_TYPES = new Set([
    "account_approved",
    "account_suspended",
    "account_deactivated",
    "account_reactivated",
    "admin",
    "invitation_used",
  ]);

  // Resolve reference_id precisely when possible.
  // null = info-only (pas de bouton "Ouvrir"). string = href de destination.
  const resolvedHrefByNotificationId = new Map<string, string | null>();
  if (notifications && notifications.length > 0) {
    const uniqRef = Array.from(new Set(referenceIds));

    // Résolution forum + mentorship + DM + support en 1 seul Promise.all
    const [
      { data: forumPosts },
      { data: forumComments },
      { data: mentorshipSessions },
      { data: mentorshipRequests },
      { data: convs },
      { data: dms },
      { data: supportTickets },
    ] = uniqRef.length > 0
      ? await Promise.all([
          supabase.from("forum_posts").select("id").in("id", uniqRef),
          supabase.from("forum_comments").select("id, post_id").in("id", uniqRef),
          supabase.from("mentorship_sessions").select("id").in("id", uniqRef),
          supabase.from("mentorship_requests").select("id").in("id", uniqRef),
          supabase.from("conversations").select("id").in("id", uniqRef),
          supabase.from("direct_messages").select("id, conversation_id").in("id", uniqRef),
          supabase.from("support_tickets").select("id").in("id", uniqRef),
        ])
      : [
          { data: [] as { id: string }[] },
          { data: [] as { id: string; post_id: string }[] },
          { data: [] as { id: string }[] },
          { data: [] as { id: string }[] },
          { data: [] as { id: string }[] },
          { data: [] as { id: string; conversation_id: string }[] },
          { data: [] as { id: string }[] },
        ];

    const postSet = new Set((forumPosts ?? []).map((p) => p.id));
    const commentToPost = new Map((forumComments ?? []).map((c) => [c.id, c.post_id]));
    const mentorshipSessionSet = new Set((mentorshipSessions ?? []).map((s) => s.id));
    const mentorshipRequestSet = new Set((mentorshipRequests ?? []).map((r) => r.id));
    const convSet = new Set((convs ?? []).map((c) => c.id));
    const dmToConversation = new Map((dms ?? []).map((m) => [m.id, m.conversation_id]));
    const supportTicketSet = new Set((supportTickets ?? []).map((t) => t.id));

    for (const n of notifications) {
      // Types purement informatifs → pas de bouton "Ouvrir"
      if (INFO_ONLY_TYPES.has(n.type)) {
        resolvedHrefByNotificationId.set(n.id, null);
        continue;
      }

      const ref = n.reference_id;
      let href: string | null = null;

      if (n.type === "dm") {
        if (ref && convSet.has(ref)) href = `/messages/${ref}`;
        else if (ref && dmToConversation.has(ref))
          href = `/messages/${dmToConversation.get(ref)}`;
        else href = "/messages";
      } else if (
        n.type === "forum_reply" ||
        n.type === "forum_comment_reply" ||
        n.type === "reaction" ||
        n.type === "mention" ||
        n.type === "post_pinned" ||
        n.type === "new_opportunity"
      ) {
        if (ref && postSet.has(ref)) href = `/feed/${ref}`;
        else if (ref && commentToPost.has(ref))
          href = `/feed/${commentToPost.get(ref)}`;
        else if (n.type === "new_opportunity") href = "/opportunities";
        // Si le post a été supprimé, pas de destination utile → null
      } else if (n.type === "mentorship" || n.type === "mentorship_completed") {
        if (ref && mentorshipSessionSet.has(ref)) href = `/mentorship/${ref}`;
        else if (ref && mentorshipRequestSet.has(ref)) href = "/mentorship";
        else href = "/mentorship";
      } else if (n.type === "election") {
        href = "/promo/election";
      } else if (n.type === "support_reply") {
        if (ref && supportTicketSet.has(ref)) href = `/support/${ref}`;
        else href = "/support";
      } else if (n.type === "promo_rejected") {
        href = "/promo";
      }
      // Sinon href reste null → bouton "Ouvrir" caché

      resolvedHrefByNotificationId.set(n.id, href);
    }
  }
  const totalPages = Math.max(Math.ceil((totalCount ?? 0) / PAGE_SIZE), 1);

  // Types disponibles déduits depuis la page courante (évite le SELECT 2000 rows)
  const typeCountMap = new Map<string, number>();
  for (const n of notifications ?? []) {
    typeCountMap.set(n.type, (typeCountMap.get(n.type) ?? 0) + 1);
  }
  const availableTypes = Array.from(typeCountMap.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type]) => type);
  const groupedNotifications = new Map<string, typeof notifications>();
  for (const n of notifications ?? []) {
    const label = dayLabel(n.created_at);
    const arr = groupedNotifications.get(label) ?? [];
    arr.push(n);
    groupedNotifications.set(label, arr);
  }

  return (
    <main className="min-h-screen bg-cma-gris px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 border border-gray-100 hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

          <form
            action={async () => {
              "use server";
              await markAllNotificationsReadAction();
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-cma-bordeaux px-3 py-2 text-sm text-white hover:bg-cma-bordeaux/90 disabled:opacity-50"
              disabled={unreadCount === 0}
            >
              <CheckCheck size={16} />
              Tout marquer lu
            </button>
          </form>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Bell size={16} className="text-cma-bordeaux" />
              Notifications ({totalCount ?? 0})
            </h1>
            <p className="text-xs text-gray-500 mt-1">{unreadCount} non lue(s)</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/notifications?page=1&filter=all&type=${encodeURIComponent(typeFilter)}`}
                className={`px-2.5 py-1 rounded-lg text-xs border ${
                  filter === "all"
                    ? "bg-cma-bordeaux text-white border-cma-bordeaux"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Toutes
              </Link>
              <Link
                href={`/notifications?page=1&filter=unread&type=${encodeURIComponent(typeFilter)}`}
                className={`px-2.5 py-1 rounded-lg text-xs border ${
                  filter === "unread"
                    ? "bg-cma-bordeaux text-white border-cma-bordeaux"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Non lues
              </Link>
              <Link
                href="/notifications?page=1&filter=all&type=all"
                className={`px-2.5 py-1 rounded-lg text-xs border ${
                  typeFilter === "all"
                    ? "bg-cma-bordeaux text-white border-cma-bordeaux"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                Tous types
              </Link>
              {availableTypes.map((t) => (
                <Link
                  key={t}
                  href={`/notifications?page=1&filter=${filter}&type=${encodeURIComponent(t)}`}
                  className={`px-2.5 py-1 rounded-lg text-xs border ${
                    typeFilter === t
                      ? "bg-cma-bordeaux text-white border-cma-bordeaux"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>

          {!notifications || notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-gray-800">
                Rien pour l&apos;instant
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Vos nouvelles activites apparaitront ici.
              </p>
            </div>
          ) : (
            <div>
              {Array.from(groupedNotifications.entries()).map(([groupLabel, items]) => (
                <div key={groupLabel}>
                  <div className="px-4 py-2 bg-gray-50 border-y border-gray-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      {groupLabel}
                    </p>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {(items ?? []).map((n) => (
                      <li key={n.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {!n.is_read && (
                                <span className="inline-block h-2 w-2 rounded-full bg-cma-bordeaux" />
                              )}
                              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                                {labelForType(n.type)}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-gray-800">{n.content}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(n.created_at).toLocaleString("fr-FR")}
                            </p>
                            {(() => {
                              const href = resolvedHrefByNotificationId.get(n.id);
                              // Pas de bouton "Ouvrir" pour les notifs sans
                              // destination utile (account_*, admin, etc.) ou
                              // dont la ressource a été supprimée.
                              if (!href) return null;
                              return (
                                <form
                                  action={openNotificationAction.bind(null, n.id, href)}
                                  className="mt-2"
                                >
                                  <button
                                    type="submit"
                                    className="inline-block text-xs font-medium text-cma-bordeaux hover:underline"
                                  >
                                    Ouvrir
                                  </button>
                                </form>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2">
                            {!n.is_read && (
                              <form
                                action={async () => {
                                  "use server";
                                  await markNotificationReadAction(n.id);
                                }}
                              >
                                <button
                                  type="submit"
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                  Lu
                                </button>
                              </form>
                            )}
                            <form
                              action={async () => {
                                "use server";
                                await deleteNotificationAction(n.id);
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                                aria-label="Supprimer la notification"
                              >
                                <Trash2 size={14} />
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <Link
                href={`/notifications?page=${Math.max(page - 1, 1)}&filter=${filter}&type=${encodeURIComponent(typeFilter)}`}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  page <= 1
                    ? "pointer-events-none opacity-50 bg-gray-50 text-gray-400 border-gray-200"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Precedent
              </Link>
              <p className="text-xs text-gray-500">
                Page {page} / {totalPages}
              </p>
              <Link
                href={`/notifications?page=${Math.min(page + 1, totalPages)}&filter=${filter}&type=${encodeURIComponent(typeFilter)}`}
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
