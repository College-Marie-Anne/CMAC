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

  // Realtime : INSERT/DELETE de réactions par d'AUTRES utilisatrices sur ce
  // post/commentaire. On filtre côté client par user_id ≠ currentUserId car
  // nos propres réactions sont déjà gérées par l'optimistic update
  // (sinon on double-compterait).
  useEffect(() => {
    const supabase = createClient();
    const targetCol = targetType === "post" ? "post_id" : "comment_id";

    const channel = supabase
      .channel(`reactions:${targetType}:${targetId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_reactions",
          filter: `${targetCol}=eq.${targetId}`,
        },
        (payload) => {
          const raw = payload.new as { user_id: string };
          if (currentUserId && raw.user_id === currentUserId) return;
          setCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "forum_reactions",
          filter: `${targetCol}=eq.${targetId}`,
        },
        (payload) => {
          // REPLICA IDENTITY FULL (migration 033) garantit que payload.old
          // contient toutes les colonnes, dont user_id.
          const old = payload.old as { user_id?: string };
          if (currentUserId && old.user_id === currentUserId) return;
          setCount((c) => Math.max(0, c - 1));
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:reactions] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, currentUserId, instanceId]);

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
