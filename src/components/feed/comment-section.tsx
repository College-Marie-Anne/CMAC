"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

  // Aplatissement à depth=1 : toute réponse (même reply-sur-reply) est
  // attachée au commentaire top-level ancestor. Sans ça, une reply ajoutée
  // via Realtime INSERT restait dans `comments[]` mais n'apparaissait sous
  // aucun parent → invisible côté UI.
  //
  // Mémoisé pour éviter de re-calculer à chaque render tant que `comments`
  // ne change pas. Aligné sur la logique SSR dans /feed/[postId]/page.tsx.
  const topLevel = useMemo(() => {
    const byId = new Map(comments.map((c) => [c.id, c]));
    const findRoot = (c: ForumComment): ForumComment | null => {
      let cur: ForumComment = c;
      const seen = new Set<string>();
      while (cur.parent_id) {
        if (seen.has(cur.id)) return null;
        seen.add(cur.id);
        const parent = byId.get(cur.parent_id);
        if (!parent) return null;
        cur = parent;
      }
      return cur;
    };

    const roots: ForumComment[] = [];
    const orphans: ForumComment[] = [];
    const repliesByRoot = new Map<string, ForumComment[]>();

    for (const c of comments) {
      if (!c.parent_id) {
        // Clone pour ne pas muter le state d'origine (et repartir des replies vides)
        roots.push({ ...c, replies: [] });
        continue;
      }
      const root = findRoot(c);
      if (!root) {
        orphans.push({ ...c, replies: [] });
        continue;
      }
      if (!repliesByRoot.has(root.id)) repliesByRoot.set(root.id, []);
      repliesByRoot.get(root.id)!.push(c);
    }

    for (const r of roots) {
      r.replies = repliesByRoot.get(r.id) ?? [];
    }
    // Les orphans (parent soft-deleted ou invisible) deviennent top-level
    const combined = [...roots, ...orphans];
    // Tri chronologique ascendant (cohérent avec le fetch SSR)
    combined.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return combined;
  }, [comments]);

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
