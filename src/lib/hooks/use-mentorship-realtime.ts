"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Subscribe aux changements qui affectent le dashboard mentorat de
 * l'utilisatrice (à la fois côté mentor et mentee).
 *
 * Events surveillés :
 *   - mentorship_requests INSERT/UPDATE/DELETE
 *     → quand une mentee soumet une demande visible par cette alumni
 *       (mentor_id targeté ou open request dans son study_field), ou quand
 *       une réponse (accept/decline) arrive côté mentee.
 *   - mentorship_sessions INSERT/UPDATE
 *     → création de session à l'acceptation, transition status → completed
 *       quand une des deux parties termine le mentorat.
 *
 * Stratégie : on filtre côté client par currentUserId et on appelle
 * router.refresh() pour re-fetch les Server Components parents. Ça évite de
 * dupliquer toute la logique SSR (join des profiles, resolve des fields)
 * côté client ; Next.js déduplique les refresh concurrents.
 */
export function useMentorshipRealtime(currentUserId: string) {
  const router = useRouter();
  const instanceId = useId();

  useEffect(() => {
    const supabase = createClient();

    const refreshIfRelevant = (mentorId?: string | null, menteeId?: string | null) => {
      if (mentorId === currentUserId || menteeId === currentUserId) {
        router.refresh();
      }
    };

    const channel = supabase
      .channel(`mentorship:${currentUserId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mentorship_requests",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            mentor_id?: string | null;
            mentee_id?: string | null;
          } | null;
          // mentor_id NULL = open request visible par toutes les alumni dans
          // le bon study_field → on refresh systématiquement pour qu'elles le voient.
          if (row?.mentor_id === null || row?.mentor_id === undefined) {
            router.refresh();
            return;
          }
          refreshIfRelevant(row?.mentor_id, row?.mentee_id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mentorship_sessions",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            mentor_id?: string | null;
            mentee_id?: string | null;
          } | null;
          refreshIfRelevant(row?.mentor_id, row?.mentee_id);
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:mentorship] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, instanceId, router]);
}
