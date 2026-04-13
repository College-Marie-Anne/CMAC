"use client";

import { useState, useTransition } from "react";
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
  currentUserId: string;
  isAdmin: boolean;
  memberCount: number;
}

export function PostFeed({
  initialPosts,
  initialHasMore,
  tags,
  excludeTagIds = [],
  currentUserId,
  isAdmin,
  memberCount,
}: PostFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [isLoadingMore, startLoadMore] = useTransition();

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
        .is("promo_id", null)
        .eq("is_pinned", false)
        .lt("created_at", lastPost.created_at)
        .order("created_at", { ascending: false })
        .limit(20);
      if (excludeTagIds.length > 0) q = q.not("tag_id", "in", `(${excludeTagIds.join(",")})`);
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

      {/* Create post bar */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="w-full mb-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-3 text-left hover:shadow-md transition-shadow"
      >
        <div className="w-10 h-10 rounded-full bg-cma-bordeaux/10 flex items-center justify-center text-cma-bordeaux">
          <Plus size={18} />
        </div>
        <span className="text-sm text-gray-400">Quoi de neuf ?</span>
      </button>

      {/* Tag filter */}
      {tags.length > 0 && (
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
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredPosts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-gray-700 mb-2">
            {tagFilter !== "all"
              ? "Aucun post avec ce tag"
              : "Soyez la première à partager quelque chose !"}
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
        userId={currentUserId}
      />
    </>
  );
}
