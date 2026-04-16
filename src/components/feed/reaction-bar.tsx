"use client";

import { useState, useTransition, useEffect, useId } from "react";
import { Heart, ThumbsUp, HandMetal } from "lucide-react";
import { toggleReactionAction } from "@/actions/forum";
import { createClient } from "@/utils/supabase/client";
import type { ReactionEmoji } from "@/lib/types/forum";

const REACTIONS: { emoji: ReactionEmoji; icon: typeof Heart; label: string }[] = [
  { emoji: "like", icon: ThumbsUp, label: "J'aime" },
  { emoji: "heart", icon: Heart, label: "Coeur" },
  { emoji: "clap", icon: HandMetal, label: "Bravo" },
];

interface ReactionBarProps {
  targetId: string;
  targetType: "post" | "comment";
  reactionCount: number;
  userReactions: ReactionEmoji[];
  /** Requis pour filtrer les events Realtime émis par l'user elle-même
   *  (qui sont déjà reflétés via l'optimistic update local). */
  currentUserId?: string;
}

export function ReactionBar({
  targetId,
  targetType,
  reactionCount: initialCount,
  userReactions: initialReactions,
  currentUserId,
}: ReactionBarProps) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState<Set<ReactionEmoji>>(new Set(initialReactions));
  const [isPending, startTransition] = useTransition();
  const instanceId = useId();

  // Resync quand le parent re-render avec de nouvelles valeurs serveur (ex :
  // subscribe realtime dans PostFeed qui propage `forum_posts.reaction_count`
  // après une réaction d'une autre utilisatrice, ou router.refresh).
  // Sans ce resync, le state local `count` restait à la valeur du premier
  // mount → le chiffre affiché divergeait de la réalité DB après quelques
  // réactions croisées. "Le compte bug" observé venait de là.
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  // Idem pour `active` (mes propres réactions) — resync si un admin retire
  // une réaction, ou si la session bascule. La clé join(",") stabilise la
  // dépendance : une nouvelle référence d'array avec le même contenu ne
  // re-déclenche pas l'effet.
  const activeKey = initialReactions.slice().sort().join(",");
  useEffect(() => {
    setActive(new Set(initialReactions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Realtime : on écoute la valeur AUTORITATIVE `reaction_count` sur la row
  // parente (forum_posts / forum_comments) plutôt que les events INSERT/DELETE
  // de forum_reactions.
  //
  // Pourquoi ce changement :
  //   L'ancienne version écoutait forum_reactions INSERT/DELETE et faisait
  //   count++/--. Elle causait un double-count parce que :
  //     1. Le trigger DB `update_post_reaction_count` met à jour forum_posts.reaction_count.
  //     2. PostFeed subscribe UPDATE forum_posts et propage la nouvelle valeur
  //        au PostCard → ReactionBar reçoit une new prop → useEffect resync.
  //     3. Mais ReactionBar ecoutait aussi INSERT forum_reactions → count++
  //        → 2e incrémentation.
  //   Résultat : après quelques réactions croisées, le compteur divergeait.
  //
  //   En écoutant directement UPDATE sur la row parente, on reçoit la valeur
  //   serveur officielle. setCount(value) est idempotent — si PostFeed ou le
  //   useEffect l'a déjà fait, pas de problème. Plus de filter user_id
  //   nécessaire, plus de risque de double-count.
  //
  //   Bénéfice secondaire : les commentaires bénéficient aussi de la MAJ
  //   live (CommentSection ne propageait pas reaction_count dans son handler
  //   UPDATE, seulement content/is_edited/is_deleted).
  useEffect(() => {
    const supabase = createClient();
    const table = targetType === "post" ? "forum_posts" : "forum_comments";

    const channel = supabase
      .channel(`reactions-count:${targetType}:${targetId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `id=eq.${targetId}`,
        },
        (payload) => {
          const raw = payload.new as { reaction_count?: number };
          if (typeof raw.reaction_count === "number") {
            setCount(raw.reaction_count);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:reaction-count] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, instanceId]);

  const handleToggle = (emoji: ReactionEmoji) => {
    // Optimistic update
    const wasActive = active.has(emoji);
    const next = new Set(active);
    if (wasActive) {
      next.delete(emoji);
      setCount((c) => Math.max(0, c - 1));
    } else {
      next.add(emoji);
      setCount((c) => c + 1);
    }
    setActive(next);

    const target =
      targetType === "post"
        ? { postId: targetId }
        : { commentId: targetId };

    startTransition(async () => {
      const result = await toggleReactionAction(target, emoji);
      if (!result.success) {
        // Revert optimistic update
        if (wasActive) {
          setActive((prev) => new Set([...prev, emoji]));
          setCount((c) => c + 1);
        } else {
          setActive((prev) => {
            const s = new Set(prev);
            s.delete(emoji);
            return s;
          });
          setCount((c) => Math.max(0, c - 1));
        }
      }
    });
  };

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map(({ emoji, icon: Icon, label }) => {
        const isActive = active.has(emoji);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleToggle(emoji)}
            disabled={isPending}
            aria-label={label}
            aria-pressed={isActive}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
              isActive
                ? "bg-cma-bordeaux/10 text-cma-bordeaux"
                : "text-gray-400 hover:bg-gray-100"
            }`}
          >
            <Icon size={14} fill={isActive ? "currentColor" : "none"} />
          </button>
        );
      })}
      {count > 0 && (
        <span className="text-xs text-gray-400 ml-0.5">{count}</span>
      )}
    </div>
  );
}
