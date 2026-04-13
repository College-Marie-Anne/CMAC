"use client";

import { useState, useTransition } from "react";
import { Heart, ThumbsUp, HandMetal } from "lucide-react";
import { toggleReactionAction } from "@/actions/forum";
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
}

export function ReactionBar({
  targetId,
  targetType,
  reactionCount: initialCount,
  userReactions: initialReactions,
}: ReactionBarProps) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState<Set<ReactionEmoji>>(new Set(initialReactions));
  const [isPending, startTransition] = useTransition();

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
