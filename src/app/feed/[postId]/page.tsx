import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Pin } from "lucide-react";
import { UserAvatar } from "@/components/feed/user-avatar";
import { TagBadge } from "@/components/feed/tag-badge";
import { ReactionBar } from "@/components/feed/reaction-bar";
import { CommentSection } from "@/components/feed/comment-section";
import { renderContentWithMentions } from "@/lib/mentions";
import { timeAgo } from "@/lib/time-ago";
import type { ForumPost, ForumComment, ReactionEmoji } from "@/lib/types/forum";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  const isAdmin = profile.role === "admin";

  // Fetch post
  const { data: rawPost, error: postErr } = await supabase
    .from("forum_posts")
    .select(`
      id, content, image_url, promo_id, reaction_count, is_pinned, is_edited, created_at, updated_at,
      author:author_id(id, first_name, last_name, username, avatar_url),
      tag:tag_id(id, name, color)
    `)
    .eq("id", postId)
    .eq("is_deleted", false)
    .single();

  if (postErr || !rawPost) notFound();

  // Fetch comments
  const { data: rawComments } = await supabase
    .from("forum_comments")
    .select(`
      id, post_id, parent_id, content, reaction_count, is_edited, created_at, updated_at,
      author:author_id(id, first_name, last_name, username, avatar_url)
    `)
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  // Fetch user reactions for post + all comments
  const commentIds = (rawComments ?? []).map((c) => c.id);
  const allIds = [postId, ...commentIds];

  const [{ data: postReactions }, { data: commentReactions }] = await Promise.all([
    supabase
      .from("forum_reactions")
      .select("post_id, emoji")
      .eq("user_id", user.id)
      .eq("post_id", postId),
    commentIds.length > 0
      ? supabase
          .from("forum_reactions")
          .select("comment_id, emoji")
          .eq("user_id", user.id)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Comment count
  const commentCount = (rawComments ?? []).length;

  // Build post
  const post: ForumPost = {
    id: rawPost.id,
    content: rawPost.content,
    image_url: rawPost.image_url,
    promo_id: rawPost.promo_id,
    reaction_count: rawPost.reaction_count,
    comment_count: commentCount,
    is_pinned: rawPost.is_pinned,
    is_edited: rawPost.is_edited,
    created_at: rawPost.created_at,
    updated_at: rawPost.updated_at,
    author: Array.isArray(rawPost.author) ? rawPost.author[0] : rawPost.author,
    tag: Array.isArray(rawPost.tag) ? rawPost.tag[0] : rawPost.tag,
    user_reactions: (postReactions ?? []).map((r) => r.emoji as ReactionEmoji),
  };

  // Build comment reaction map
  const commentReactionMap: Record<string, ReactionEmoji[]> = {};
  for (const r of commentReactions ?? []) {
    if (!r.comment_id) continue;
    if (!commentReactionMap[r.comment_id]) commentReactionMap[r.comment_id] = [];
    commentReactionMap[r.comment_id].push(r.emoji as ReactionEmoji);
  }

  // Build comments with nesting
  const commentsFlat: ForumComment[] = (rawComments ?? []).map((c) => ({
    id: c.id,
    post_id: c.post_id,
    parent_id: c.parent_id,
    content: c.content,
    reaction_count: c.reaction_count,
    is_edited: c.is_edited,
    created_at: c.created_at,
    updated_at: c.updated_at,
    author: Array.isArray(c.author) ? c.author[0] : c.author,
    user_reactions: commentReactionMap[c.id] ?? [],
    replies: [],
  }));

  // Nest replies under parent
  const topLevel: ForumComment[] = [];
  const replyMap: Record<string, ForumComment[]> = {};

  for (const c of commentsFlat) {
    if (c.parent_id) {
      if (!replyMap[c.parent_id]) replyMap[c.parent_id] = [];
      replyMap[c.parent_id].push(c);
    } else {
      topLevel.push(c);
    }
  }

  for (const c of topLevel) {
    c.replies = replyMap[c.id] ?? [];
  }

  return (
    <div className="min-h-screen bg-cma-gris">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 h-14 flex items-center gap-3">
        <Link
          href="/feed"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          Retour au fil
        </Link>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Post */}
        <article className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5">
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar
                firstName={post.author?.first_name ?? null}
                lastName={post.author?.last_name ?? null}
                avatarUrl={post.author?.avatar_url}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-gray-900">
                    {post.author
                      ? `${post.author.first_name} ${post.author.last_name}`
                      : "Utilisatrice supprimée"}
                  </p>
                  {post.is_pinned && <Pin size={14} className="text-cma-or" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {post.author && <span>@{post.author.username}</span>}
                  <span>&middot;</span>
                  <span>{timeAgo(post.created_at)}</span>
                  {post.is_edited && (
                    <>
                      <span>&middot;</span>
                      <span className="italic">modifié</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tag */}
            <div className="mb-3">
              <TagBadge name={post.tag.name} color={post.tag.color} />
            </div>

            {/* Content */}
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4">
              {renderContentWithMentions(post.content)}
            </div>

            {/* Image */}
            {post.image_url && (
              <div className="mb-4">
                <Image
                  src={post.image_url}
                  alt="Image du post"
                  width={700}
                  height={400}
                  className="w-full max-h-96 object-cover rounded-xl"
                />
              </div>
            )}

            {/* Reactions */}
            <ReactionBar
              targetId={post.id}
              targetType="post"
              reactionCount={post.reaction_count}
              userReactions={post.user_reactions}
            />
          </div>
        </article>

        {/* Comments */}
        <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <CommentSection
            postId={postId}
            comments={topLevel}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </div>
  );
}
