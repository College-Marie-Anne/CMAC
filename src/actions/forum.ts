"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
import { parseMentions } from "@/lib/mentions";
import { dispatchPush } from "@/lib/push";

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
        promo_id: parsed.data.promo_id ?? null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };

    // ─── Notifications ───
    // Fire-and-forget : on n'attend pas et on avale les erreurs pour ne
    // jamais bloquer l'écriture du post à cause d'un échec de notification.
    const newPostId = post.id;

    // 1. Mentions @username : opt-in (preference_field 'mention')
    const mentionedUsernames = parseMentions(parsed.data.content);
    if (mentionedUsernames.length > 0) {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      const authorUsername = authorProfile?.username ?? "Quelqu'un";

      const { data: mentionedUsers } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", mentionedUsernames)
        .eq("status", "active")
        .neq("id", user.id);

      for (const u of mentionedUsers ?? []) {
        const recipientId = u.id;
        const content = `@${authorUsername} vous a mentionnée dans un post.`;
        supabase
          .rpc("notify_user", {
            p_recipient: recipientId,
            p_type: "mention",
            p_reference_id: newPostId,
            p_content: content,
            p_preference_field: "mention",
          })
          .then(
            () => {},
            () => {}
          );
        after(() => dispatchPush(recipientId, "mention", newPostId, content));
      }
    }

    // 2. new_opportunity : si tag = "Bourses & Opportunités" → broadcast aux étudiantes
    const { data: tagInfo } = await supabase
      .from("forum_tags")
      .select("name")
      .eq("id", parsed.data.tag_id)
      .maybeSingle();

    if (tagInfo?.name === "Bourses & Opportunités") {
      const { data: students } = await supabase
        .from("profiles")
        .select("id")
        .eq("status", "active")
        .in("role", ["student", "s4"])
        .neq("id", user.id);

      const oppContent = "Nouvelle opportunité publiée sur Bourses & Opportunités.";
      for (const s of students ?? []) {
        const recipientId = s.id;
        supabase
          .rpc("notify_user", {
            p_recipient: recipientId,
            p_type: "new_opportunity",
            p_reference_id: newPostId,
            p_content: oppContent,
            p_preference_field: "new_opportunity",
          })
          .then(
            () => {},
            () => {}
          );
        after(() => dispatchPush(recipientId, "new_opportunity", newPostId, oppContent));
      }
    }

    // Revalidation multi-routes : le post peut apparaître sur /feed (sauf
    // s'il a un tag système ou un promo_id), sur /opportunities (si tag
    // "Bourses & Opportunités"), et sur /promo (si promo_id). Le Realtime
    // côté PostFeed rattrape le reste pour les autres utilisatrices.
    revalidatePath("/feed");
    if (tagInfo?.name === "Bourses & Opportunités") {
      revalidatePath("/opportunities");
    }
    if (parsed.data.promo_id) {
      revalidatePath("/promo");
    }
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
    const { supabase, profile } = await requireAuth();

    const { data: post, error: fetchErr } = await supabase
      .from("forum_posts")
      .select("is_pinned, promo_id, author_id")
      .eq("id", postId)
      .single();

    if (fetchErr || !post) return { success: false, error: "Post introuvable" };

    const isAdmin = profile.role === "admin";
    let isLeader = false;

    if (!isAdmin && post.promo_id) {
       // Check if user is leader of this promo
       const { data: promo } = await supabase
         .from("promotions")
         .select("leader_id")
         .eq("id", post.promo_id)
         .single();

       if (promo?.leader_id === profile.id) {
         isLeader = true;
       }
    }

    if (!isAdmin && !isLeader) {
      return { success: false, error: "Non autorisé à épingler ce post" };
    }

    const willPin = !post.is_pinned;

    const { error } = await supabase
      .from("forum_posts")
      .update({ is_pinned: willPin })
      .eq("id", postId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_forum_posts_update
    // (action 'pin_post' ou 'unpin_post' détectée via toggle de is_pinned).

    // Notification `post_pinned` à l'auteur (spec §1255) — uniquement quand on
    // épingle (pas au désépinglage), et pas si l'auteur s'épingle lui-même.
    // Type non-opt-out (spec §488) → on passe `null` pour le préférence-field.
    // Passe par la RPC SECURITY DEFINER `notify_user` car la table notifications
    // n'a aucune RLS INSERT (migration 023).
    if (willPin && post.author_id && post.author_id !== profile.id) {
      const authorId = post.author_id;
      const content = "Votre post a ete epingle.";
      await supabase.rpc("notify_user", {
        p_recipient: authorId,
        p_type: "post_pinned",
        p_reference_id: postId,
        p_content: content,
        p_preference_field: null,
      });
      after(() => dispatchPush(authorId, "post_pinned", postId, content));
    }

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

    // Threading max 1 niveau (spec §324) : on peut répondre à un commentaire
    // racine, mais PAS à une réponse. Si l'utilisatrice tente de répondre à
    // une réponse (parent.parent_id non null), on ré-ancre automatiquement
    // au commentaire racine pour préserver l'intent conversationnel tout en
    // gardant une structure plate.
    //
    // Avant ce fix : toute profondeur était acceptée en DB puis aplatie côté
    // SSR via rootOf(). Ça fonctionnait mais violait la spec et rendait la
    // structure imprédictible (dataset de recherche, exports, etc.).
    let finalParentId: string | null = parsed.data.parent_id ?? null;
    if (finalParentId) {
      const { data: parent, error: parentErr } = await supabase
        .from("forum_comments")
        .select("id, parent_id")
        .eq("id", finalParentId)
        .single();

      if (parentErr || !parent)
        return { success: false, error: "Commentaire parent introuvable." };

      // Si le parent est lui-même une réponse, on remonte au commentaire
      // racine (parent.parent_id). Garantit que parent_id pointe TOUJOURS
      // vers un commentaire racine en DB.
      if (parent.parent_id) {
        finalParentId = parent.parent_id;
      }
    }

    const { error } = await supabase.from("forum_comments").insert({
      post_id: parsed.data.post_id,
      author_id: user.id,
      parent_id: finalParentId,
      content: parsed.data.content,
    });

    if (error) return { success: false, error: error.message };

    // ─── Notifications ───
    // Fire-and-forget pour les broadcasts ; l'échec ne casse jamais l'écriture.
    const postId = parsed.data.post_id;

    // Récupérer l'auteur du post (pour forum_reply + exclusion comment_reply)
    const { data: postData } = await supabase
      .from("forum_posts")
      .select("id, author_id")
      .eq("id", postId)
      .maybeSingle();

    // 1. forum_reply → auteur du post (sauf self-comment)
    if (postData?.author_id && postData.author_id !== user.id) {
      const authorId = postData.author_id;
      const refId = postData.id;
      const content = "Nouveau commentaire sur votre post.";
      await supabase.rpc("notify_user", {
        p_recipient: authorId,
        p_type: "forum_reply",
        p_reference_id: refId,
        p_content: content,
        p_preference_field: "forum_reply",
      });
      after(() => dispatchPush(authorId, "forum_reply", refId, content));
    }

    // 2. forum_comment_reply → autres commentateurs (sauf self + auteur du post)
    const { data: others } = await supabase
      .from("forum_comments")
      .select("author_id")
      .eq("post_id", postId)
      .eq("is_deleted", false)
      .neq("author_id", user.id);

    const uniqueCommenters = Array.from(
      new Set(
        (others ?? [])
          .map((c) => c.author_id)
          .filter(
            (id): id is string =>
              !!id && id !== user.id && id !== postData?.author_id
          )
      )
    );

    const commentReplyRef = postData?.id ?? postId;
    const commentReplyContent = "Nouveau commentaire sur un post que vous suivez.";
    for (const commenterId of uniqueCommenters) {
      supabase
        .rpc("notify_user", {
          p_recipient: commenterId,
          p_type: "forum_comment_reply",
          p_reference_id: commentReplyRef,
          p_content: commentReplyContent,
          p_preference_field: "forum_comment_reply",
        })
        .then(
          () => {},
          () => {}
        );
      after(() =>
        dispatchPush(
          commenterId,
          "forum_comment_reply",
          commentReplyRef,
          commentReplyContent
        )
      );
    }

    // 3. mentions @username dans le commentaire (référence = post_id)
    const mentionedUsernames = parseMentions(parsed.data.content);
    if (mentionedUsernames.length > 0) {
      const { data: authorProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      const authorUsername = authorProfile?.username ?? "Quelqu'un";

      const { data: mentionedUsers } = await supabase
        .from("profiles")
        .select("id, username")
        .in("username", mentionedUsernames)
        .eq("status", "active")
        .neq("id", user.id);

      const mentionContent = `@${authorUsername} vous a mentionnée dans un commentaire.`;
      for (const u of mentionedUsers ?? []) {
        const recipientId = u.id;
        supabase
          .rpc("notify_user", {
            p_recipient: recipientId,
            p_type: "mention",
            p_reference_id: postId,
            p_content: mentionContent,
            p_preference_field: "mention",
          })
          .then(
            () => {},
            () => {}
          );
        after(() => dispatchPush(recipientId, "mention", postId, mentionContent));
      }
    }

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

    // ─── Notification "reaction" ───
    // Uniquement quand on AJOUTE une réaction (pas au retrait).
    // Cible : auteur du post ou du commentaire réagi (sauf self).
    let targetAuthor: string | null = null;
    let refId: string | null = null;

    if (isPost) {
      const { data: p } = await supabase
        .from("forum_posts")
        .select("author_id")
        .eq("id", targetId)
        .maybeSingle();
      targetAuthor = p?.author_id ?? null;
      refId = targetId;
    } else {
      const { data: c } = await supabase
        .from("forum_comments")
        .select("author_id")
        .eq("id", targetId)
        .maybeSingle();
      targetAuthor = c?.author_id ?? null;
      refId = targetId;
    }

    if (targetAuthor && targetAuthor !== user.id) {
      const authorId = targetAuthor;
      const reactionRef = refId;
      const reactionContent = "Nouvelle réaction sur votre publication.";
      supabase
        .rpc("notify_user", {
          p_recipient: authorId,
          p_type: "reaction",
          p_reference_id: reactionRef,
          p_content: reactionContent,
          p_preference_field: "reaction",
        })
        .then(
          () => {},
          () => {}
        );
      after(() => dispatchPush(authorId, "reaction", reactionRef, reactionContent));
    }

    return { success: true, action: "added" };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
