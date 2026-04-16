"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useUnreadNotificationsCount } from "@/lib/hooks/use-unread-notifications";

/**
 * Bouton notifications (Bell + badge compteur) avec mise à jour Realtime.
 *
 * - `initialCount` vient du SSR (query SELECT count côté serveur)
 * - Après l'hydratation, le hook subscribe à Realtime et maintient le count
 *   à jour sans refresh de la page
 * - Badge affiché uniquement si count > 0, avec plafonnement "9+"
 */
export function NotificationsBellBadge({ initialCount }: { initialCount: number }) {
  const count = useUnreadNotificationsCount(initialCount);

  return (
    <Link
      href="/notifications"
      className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-cma-bordeaux"
      title="Notifications"
      aria-label={
        count > 0
          ? `Notifications (${count} non lue${count > 1 ? "s" : ""})`
          : "Notifications"
      }
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-cma-bordeaux text-white text-[9px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
