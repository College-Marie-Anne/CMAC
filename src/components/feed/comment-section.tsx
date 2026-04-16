"use client";

import { useEffect, useId, useState } from "react";
import { MessageSquare } from "lucide-react";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import { createClient } from "@/utils/supabase/client";
import type { ForumComment } from "@/lib/types/forum";

interface CommentSectionProps {
  postId: string;
  comments: ForumComment[];
  currentUserId: string;
  isAdmin: boolean;
}

export function CommentSection({
  postId,
  comments: initialComments,
  currentUserId,
  isAdmin,
}: CommentSectionProps) {
  const [comments, setComments] = useState<ForumComment[]>(initialComments);
  const instanceId = useId();

  // Re-sync quand le SSR re-fetch (ex. après router.refresh() déclenché par
  // delete/edit/add).
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Realtime : nouveau commentaire écrit par quelqu'un d'autre sur ce post,
  // ou soft-delete / edit. On filtre côté client par post_id car il y a
  // potentiellement plusieurs CommentSection montés (un par post dans le feed
  // détail). Les UPDATE events sont utilisés pour retirer les commentaires
  // is_deleted=true et aligner content/is_edited.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`forum-comments:${postId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_comments",
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          const raw = payload.new as {
            id: string;
            post_id: string;
            parent_id: string | null;
            author_id: string;
            content: string;
            is_deleted: boolean;
            is_edited: boolean;
            reaction_count: number;
            created_at: string;
          };
          if (raw.is_deleted) return;

          // Join author pour construire un ForumComment complet
          const { data: author } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, username, avatar_url")
            .eq("id", raw.author_id)
            .maybeSingle();

          const newComment = {
            id: raw.id,
            post_id: raw.post_id,
            parent_id: raw.parent_id,
            content: raw.content,
            is_edited: raw.is_edited,
            reaction_count: raw.reaction_count,
            created_at: raw.created_at,
            author: author ?? null,
            user_reactions: [],
            replies: [],
          } as unknown as ForumComment;

          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "forum_comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            is_deleted: boolean;
            is_edited: boolean;
            content: string;
          };
          setComments((prev) => {
            if (updated.is_deleted) {
              return prev.filter((c) => c.id !== updated.id);
            }
            return prev.map((c) =>
              c.id === updated.id
                ? { ...c, content: updated.content, is_edited: updated.is_edited }
                : c
            );
          });
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:comments] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, instanceId]);

  // Group: top-level comments (parent_id is null) with replies nested
  const topLevel = comments.filter((c) => !c.parent_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">
          {comments.length} commentaire{comments.length !== 1 ? "s" : ""}
        </h3>
      </div>

      {/* New comment form */}
      <CommentForm postId={postId} />

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">
          Soyez la première à commenter
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
