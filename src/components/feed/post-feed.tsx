"use client";

import { useState, useTransition, useEffect, useId } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "./post-card";
import { CreatePostDialog } from "./create-post-dialog";
import { createClient } from "@/utils/supabase/client";
import type { ForumPost, ForumTag, ReactionEmoji } from "@/lib/types/forum";

interface PostFeedProps {
  initialPosts: ForumPost[];
  initialHasMore: boolean;
  tags: ForumTag[];
  excludeTagIds?: string[];
  includeTagId?: string;
  currentUserId: string;
  isAdmin: boolean;
  memberCount: number;
  emptyStateMessage?: string;
  createLabel?: string;
  promoId?: string;
  canPinAll?: boolean;
}

export function PostFeed({
  initialPosts,
  initialHasMore,
  tags,
  excludeTagIds = [],
  includeTagId,
  currentUserId,
  isAdmin,
  memberCount,
  emptyStateMessage,
  createLabel = "Quoi de neuf ?",
  promoId,
  canPinAll,
}: PostFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoadingMore, startLoadMore] = useTransition();
  const instanceId = useId();

  // Re-sync avec les nouvelles props SSR (ex: après un revalidatePath sur
  // createPostAction, initialPosts contient le nouveau post). Sans ça, l'état
  // local `posts` resterait figé à la valeur du premier mount.
  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  // Realtime : on écoute les INSERT sur forum_posts pour afficher les nouveaux
  // posts des autres utilisatrices sans reload. L'utilisatrice qui poste
  // elle-même voit son post via revalidatePath côté server action (effet du
  // useEffect ci-dessus) ; le dedup par id évite les doublons si les 2 events
  // (realtime + revalidate) arrivent ensemble.
  //
  // excludeTagIds est transformé en string pour stabiliser la dep (sinon
  // l'array nouvelle-référence à chaque render recrée la subscription).
  const excludeKey = excludeTagIds.join(",");

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`forum-posts:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
        },
        async (payload) => {
          const raw = payload.new as {
            id: string;
            promo_id: string | null;
            tag_id: string;
            is_deleted: boolean;
            is_pinned: boolean;
          };

          // Filtrage contextuel : on ignore les posts qui ne doivent pas
          // apparaître sur cette page (autre promo, tag exclu, etc.).
          if (raw.is_deleted) return;
          if (promoId) {
            if (raw.promo_id !== promoId) return;
          } else if (raw.promo_id !== null) {
            return;
          }
          if (includeTagId && raw.tag_id !== includeTagId) return;
          if (
            !includeTagId &&
            excludeKey &&
            excludeKey.split(",").includes(raw.tag_id)
          ) {
            return;
          }

          // Realtime payload = colonnes brutes. On re-fetch avec author + tag
          // joint pour reconstruire un ForumPost complet.
          const { data: enriched } = await supabase
            .from("forum_posts")
            .select(
              `id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
              author:author_id(id, first_name, last_name, username, avatar_url),
              tag:tag_id(id, name, color)`
            )
            .eq("id", raw.id)
            .maybeSingle();

          if (!enriched) return; // post supprimé entre-temps, ou RLS bloque

          const newPost: ForumPost = {
            id: enriched.id,
            content: enriched.content,
            image_url: enriched.image_url,
            promo_id: enriched.promo_id,
            reaction_count: enriched.reaction_count,
            comment_count: 0,
            is_pinned: enriched.is_pinned,
            is_edited: enriched.is_edited,
            created_at: enriched.created_at,
            updated_at: enriched.updated_at,
            author: Array.isArray(enriched.author)
              ? enriched.author[0]
              : enriched.author,
            tag: Array.isArray(enriched.tag) ? enriched.tag[0] : enriched.tag,
            user_reactions: [],
          };

          setPosts((prev) => {
            if (prev.some((p) => p.id === newPost.id)) return prev; // dedup
            return [newPost, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "forum_posts",
        },
        (payload) => {
          // UPDATE events : soft-delete, pin/unpin, edit. Le post doit soit
          // disparaître (is_deleted), soit voir ses métadonnées mises à jour
          // (is_pinned pour le tri, content/is_edited après édition, etc.).
          const updated = payload.new as {
            id: string;
            is_deleted: boolean;
            is_pinned: boolean;
            is_edited: boolean;
            content: string;
            image_url: string | null;
            reaction_count: number;
            updated_at: string;
          };

          setPosts((prev) => {
            if (updated.is_deleted) {
              return prev.filter((p) => p.id !== updated.id);
            }
            return prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    is_pinned: updated.is_pinned,
                    is_edited: updated.is_edited,
                    content: updated.content,
                    image_url: updated.image_url,
                    reaction_count: updated.reaction_count,
                    updated_at: updated.updated_at,
                  }
                : p
            );
          });
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:forum-posts] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, promoId, includeTagId, excludeKey]);

  const filteredPosts =
    tagFilter === "all"
      ? posts
      : posts.filter((p) => p.tag.id === tagFilter);

  // Separate pinned and non-pinned
  const pinned = filteredPosts.filter((p) => p.is_pinned);
  const regular = filteredPosts.filter((p) => !p.is_pinned);

  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    const lastPost = posts[posts.length - 1];
    if (!lastPost) return;

    startLoadMore(async () => {
      const supabase = createClient();
      let q = supabase
        .from("forum_posts")
        .select(`
          id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
          author:author_id(id, first_name, last_name, username, avatar_url),
          tag:tag_id(id, name, color)
        `)
        .eq("is_deleted", false)
        .eq("is_pinned", false);

      if (promoId) {
        q = q.eq("promo_id", promoId);
      } else {
        q = q.is("promo_id", null);
      }

      q = q.lt("created_at", lastPost.created_at)
        .order("created_at", { ascending: false })
        .limit(20);
      if (includeTagId) {
        q = q.eq("tag_id", includeTagId);
      } else if (excludeTagIds.length > 0) {
        q = q.not("tag_id", "in", `(${excludeTagIds.join(",")})`);
      }
      const { data: newPosts } = await q;

      if (!newPosts || newPosts.length === 0) {
        setHasMore(false);
        return;
      }

      // Fetch comment counts
      const postIds = newPosts.map((p) => p.id);
      const { data: commentCounts } = await supabase
        .from("forum_comments")
        .select("post_id")
        .in("post_id", postIds)
        .eq("is_deleted", false);

      const countMap: Record<string, number> = {};
      for (const c of commentCounts ?? []) {
        countMap[c.post_id] = (countMap[c.post_id] ?? 0) + 1;
      }

      // Fetch user reactions
      const { data: userReactions } = await supabase
        .from("forum_reactions")
        .select("post_id, emoji")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);

      const reactionMap: Record<string, ReactionEmoji[]> = {};
      for (const r of userReactions ?? []) {
        if (!reactionMap[r.post_id]) reactionMap[r.post_id] = [];
        reactionMap[r.post_id].push(r.emoji as ReactionEmoji);
      }

      const enriched: ForumPost[] = newPosts.map((p) => ({
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        promo_id: p.promo_id,
        reaction_count: p.reaction_count,
        comment_count: countMap[p.id] ?? 0,
        is_pinned: p.is_pinned,
        is_edited: p.is_edited,
        created_at: p.created_at,
        updated_at: p.updated_at,
        author: Array.isArray(p.author) ? p.author[0] : p.author,
        tag: Array.isArray(p.tag) ? p.tag[0] : p.tag,
        user_reactions: reactionMap[p.id] ?? [],
      }));

      setPosts((prev) => [...prev, ...enriched]);
      setHasMore(newPosts.length === 20);
    });
  };

  return (
    <>
      {/* Member count */}
      <div className="mb-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
        <p className="text-2xl font-bold text-cma-bordeaux">{memberCount}</p>
        <p className="text-xs text-gray-400">
          membre{memberCount > 1 ? "s" : ""} de la famille CMA
        </p>
      </div>

      {/* Create post bar — refondu pour ne plus ressembler à une seconde
          barre de recherche (le précédent design avec icône ronde à gauche
          + texte gris était visuellement confondu avec FeedSearch du header). */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="w-full mb-4 p-3.5 rounded-2xl flex items-center justify-center gap-2 font-medium text-white shadow-sm transition-all active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, #800020 0%, #5c0018 100%)",
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="text-sm">{createLabel}</span>
      </button>

      {/* Tag filter */}
      {!includeTagId && tags.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tagFilter === "all"
                ? "bg-cma-bordeaux text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Tous
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTagFilter(t.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tagFilter === t.id
                  ? "text-white"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
              style={
                tagFilter === t.id
                  ? { background: t.color }
                  : { background: `${t.color}15` }
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {[...pinned, ...regular].map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            canPin={canPinAll}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {tagFilter !== "all"
              ? "Aucun post avec ce tag"
              : emptyStateMessage || "Soyez la première à partager quelque chose !"}
          </p>
          <p className="text-sm text-gray-400">
            {tagFilter !== "all"
              ? "Essayez un autre filtre"
              : "Cliquez sur « Quoi de neuf ? » pour créer un post"}
          </p>
        </div>
      )}

      {/* Load more */}
      {hasMore && filteredPosts.length > 0 && (
        <div className="text-center py-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-xl gap-2"
          >
            {isLoadingMore ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            Charger plus
          </Button>
        </div>
      )}

      {/* Create post dialog */}
      <CreatePostDialog
        tags={tags}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        promoId={promoId}
      />
    </>
  );
}
