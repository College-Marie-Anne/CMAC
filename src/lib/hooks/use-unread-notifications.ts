"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Compteur de notifications non-lues réactif (Realtime).
 *
 * Initialisé avec la valeur SSR (`initialCount`), puis maintenu à jour via
 * une subscription Supabase Realtime sur la table `notifications` filtrée par
 * `recipient_id = auth.uid()`.
 *
 * Événements pris en compte :
 *  - INSERT (is_read=false) → count + 1
 *  - UPDATE (is_read false→true) → count - 1
 *  - DELETE (d'une notif is_read=false) → count - 1
 *
 * La RLS (migration 004) limite déjà les notifs visibles à celles de
 * `recipient_id = auth.uid()`, donc le filtre Realtime est redondant mais on
 * le garde pour réduire le trafic inutile.
 *
 * Pattern copié de `conversation-thread.tsx` / `conversation-list.tsx`.
 */
export function useUnreadNotificationsCount(initialCount: number): number {
  const [count, setCount] = useState(initialCount);

  // Re-sync avec la nouvelle valeur SSR à chaque navigation (router.refresh()).
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !mounted) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { is_read?: boolean };
            if (row.is_read === false) {
              setCount((c) => c + 1);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const oldRow = payload.old as { is_read?: boolean };
            const newRow = payload.new as { is_read?: boolean };
            // Unread → read = -1
            if (oldRow.is_read === false && newRow.is_read === true) {
              setCount((c) => Math.max(c - 1, 0));
            }
            // Read → unread = +1 (cas rare, sécurité)
            else if (oldRow.is_read === true && newRow.is_read === false) {
              setCount((c) => c + 1);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            const old = payload.old as { is_read?: boolean };
            if (old.is_read === false) {
              setCount((c) => Math.max(c - 1, 0));
            }
          }
        )
        .subscribe();
    });

    return () => {
      mounted = false;
      if (channel) {
        // Utilise la même instance `supabase` (singleton côté client)
        createClient().removeChannel(channel);
      }
    };
  }, []);

  return count;
}
