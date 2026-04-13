"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createPostSchema,
  editPostSchema,
  createCommentSchema,
  editCommentSchema,
  type CreatePostData,
  type EditPostData,
  type CreateCommentData,
  type EditCommentData,
} from "@/lib/validations/forum";
import type { ReactionEmoji } from "@/lib/types/forum";
import {
  createPostLimiter,
  createCommentLimiter,
  reactionLimiter,
  checkRateLimit,
} from "@/lib/rate-limit";

export type ForumActionResult = {
  success: boolean;
  error?: string;
  postId?: string;
  action?: "added" | "removed";
};

/* ─── helper: require authenticated active user ─── */

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, status, promo_id, is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active")
    throw new Error("Compte inactif");

  return { supabase, user, profile };
}

/* ─── posts ─── */

export async function createPostAction(
  data: CreatePostData
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(
      createPostLimiter,
      user.id
    );
    if (!allowed) {
      const min = Math.ceil((resetAt - Date.now()) / 60000);
      return { success: false, error: `Trop de posts. Réessayez dans ${min} min` };
    }

    const parsed = createPostSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    const { data: post, error } = await supabase
      .from("forum_posts")
      .insert({
        author_id: user.id,
        content: parsed.data.content,
        tag_id: parsed.data.tag_id,
        image_url: parsed.data.image_url ?? null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/feed");
    return { success: true, postId: post.id };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function editPostAction(
  postId: string,
  data: EditPostData
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const parsed = editPostSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase
      .from("forum_posts")
      .update({ content: parsed.data.content, is_edited: true })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/feed");
    revalidatePath(`/feed/${postId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteOwnPostAction(
  postId: string
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("forum_posts")
      .update({ is_deleted: true })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/feed");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function pinPostAction(
  postId: string
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Only admin can pin
    if (!["admin"].includes((await requireAuth()).profile.role))
      return { success: false, error: "Seuls les admins peuvent épingler" };

    // Toggle pin state
    const { data: post, error: fetchErr } = await supabase
      .from("forum_posts")
      .select("is_pinned")
      .eq("id", postId)
      .single();

    if (fetchErr || !post) return { success: false, error: "Post introuvable" };

    const { error } = await supabase
      .from("forum_posts")
      .update({ is_pinned: !post.is_pinned })
      .eq("id", postId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: post.is_pinned ? "unpin_post" : "pin_post",
      target_type: "forum_post",
      target_id: postId,
    });

    revalidatePath("/feed");
    revalidatePath(`/feed/${postId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── comments ─── */

export async function createCommentAction(
  data: CreateCommentData
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(
      createCommentLimiter,
      user.id
    );
    if (!allowed) {
      const min = Math.ceil((resetAt - Date.now()) / 60000);
      return { success: false, error: `Trop de commentaires. Réessayez dans ${min} min` };
    }

    const parsed = createCommentSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    // If replying to a comment, verify parent is top-level (depth 0)
    if (parsed.data.parent_id) {
      const { data: parent, error: parentErr } = await supabase
        .from("forum_comments")
        .select("parent_id")
        .eq("id", parsed.data.parent_id)
        .single();

      if (parentErr || !parent)
        return { success: false, error: "Commentaire parent introuvable" };

      if (parent.parent_id !== null)
        return { success: false, error: "Les réponses imbriquées ne sont pas autorisées" };
    }

    const { error } = await supabase.from("forum_comments").insert({
      post_id: parsed.data.post_id,
      author_id: user.id,
      parent_id: parsed.data.parent_id ?? null,
      content: parsed.data.content,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/feed/${parsed.data.post_id}`);
    revalidatePath("/feed");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function editCommentAction(
  commentId: string,
  data: EditCommentData
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const parsed = editCommentSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase
      .from("forum_comments")
      .update({ content: parsed.data.content, is_edited: true })
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/feed");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteOwnCommentAction(
  commentId: string
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { error } = await supabase
      .from("forum_comments")
      .update({ is_deleted: true })
      .eq("id", commentId)
      .eq("author_id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/feed");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── reactions ─── */

export async function toggleReactionAction(
  target: { postId?: string; commentId?: string },
  emoji: ReactionEmoji
): Promise<ForumActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed } = await checkRateLimit(reactionLimiter, user.id);
    if (!allowed)
      return { success: false, error: "Trop de réactions. Patientez" };

    const isPost = !!target.postId;
    const targetCol = isPost ? "post_id" : "comment_id";
    const targetId = isPost ? target.postId! : target.commentId!;

    // Check if reaction exists
    const { data: existing } = await supabase
      .from("forum_reactions")
      .select("id")
      .eq("user_id", user.id)
      .eq(targetCol, targetId)
      .eq("emoji", emoji)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase.from("forum_reactions").delete().eq("id", existing.id);
      return { success: true, action: "removed" };
    }

    // Add reaction
    const insertData: Record<string, string> = {
      user_id: user.id,
      emoji,
    };
    if (isPost) insertData.post_id = targetId;
    else insertData.comment_id = targetId;

    const { error } = await supabase
      .from("forum_reactions")
      .insert(insertData);

    if (error) return { success: false, error: error.message };

    return { success: true, action: "added" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
