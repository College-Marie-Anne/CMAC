"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  resetPasswordSchema,
  type ResetPasswordData,
} from "@/lib/validations/password";
import {
  updatePromotionSchema,
  type UpdatePromotionData,
} from "@/lib/validations/promo";
import { tagSchema } from "@/lib/validations/forum";
import { sendAccountApprovedEmail } from "@/lib/emails/account-approved";
import { dispatchPush } from "@/lib/push";

export type AdminActionResult = {
  success: boolean;
  error?: string;
};

/* ─────────── helpers ─────────── */

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, is_super_admin")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.role !== "admin")
    throw new Error("Accès interdit");

  return { supabase, user, profile };
}

/** Verify a target profile exists. Returns error string if not found. */
async function requireTargetProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return data ? null : "Utilisatrice introuvable";
}

/* ─────────── force change password (first admin login) ─────────── */

export async function forceChangePasswordAction(
  data: ResetPasswordData
): Promise<AdminActionResult> {
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return { success: false, error: "Session expirée. Reconnectez-vous" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.includes("same_password"))
      return {
        success: false,
        error: "Le nouveau mot de passe doit être différent du temporaire",
      };
    return { success: false, error: "Erreur lors de la mise à jour. Réessayez" };
  }

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  const { data: profile, error: roleErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (roleErr || !profile) {
    revalidatePath("/feed");
    redirect("/feed");
  }
  if (profile.role === "admin") {
    revalidatePath("/admin");
    redirect("/admin");
  }
  revalidatePath("/feed");
  redirect("/feed");
}

/* ─────────── approvals ─────────── */

export async function approveUserAction(
  userId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    // Récupère first_name AVANT l'UPDATE pour l'email. Le fetch après l'UPDATE
    // marcherait aussi mais la RLS pourrait filtrer les comptes 'pending' selon
    // la politique de select — on sécurise en lisant maintenant.
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    // Audit log : inséré automatiquement par trigger trg_audit_profiles_update
    // (migration 020) — action 'approve_user' détectée via la transition status.

    // Notification in-app (non-opt-out → preference_field: null)
    const approvedContent = "Votre compte a été approuvé. Bienvenue sur CMA Connect !";
    await supabase.rpc("notify_user", {
      p_recipient: userId,
      p_type: "account_approved",
      p_reference_id: userId,
      p_content: approvedContent,
      p_preference_field: null,
    });
    after(() => dispatchPush(userId, "account_approved", userId, approvedContent));

    // Email de confirmation (non-bloquant — l'approbation DB est déjà
    // effective). L'email de l'utilisatrice vit dans auth.users donc on
    // passe par l'admin client qui bypass la RLS.
    //
    // `after()` garantit que l'envoi s'exécute après la response : sans ça,
    // le runtime Vercel pouvait couper la promise avant que Resend soit
    // appelé (bug silencieux signalé par l'équipe admin).
    const firstName = targetProfile?.first_name ?? null;
    after(async () => {
      try {
        const admin = createAdminClient();
        const { data: authRes } = await admin.auth.admin.getUserById(userId);
        const email = authRes?.user?.email;
        if (email && firstName) {
          await sendAccountApprovedEmail({ to: email, firstName });
        } else {
          console.warn(
            `[approveUserAction] email ou first_name manquant pour ${userId}, email skip`
          );
        }
      } catch (emailErr) {
        console.error("[approveUserAction] envoi email failed:", emailErr);
      }
    });

    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function rejectUserAction(
  userId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "deactivated" })
      .eq("id", userId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'reject_user' détectée : pending → deactivated).

    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function bulkApproveAction(
  userIds: string[]
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // Fetch first_names AVANT l'UPDATE pour pouvoir envoyer les emails après.
    const { data: targetProfiles } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", userIds)
      .eq("status", "pending");

    const firstNameMap = new Map<string, string>(
      (targetProfiles ?? [])
        .filter((p): p is { id: string; first_name: string } => !!p.first_name)
        .map((p) => [p.id, p.first_name])
    );

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .in("id", userIds)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    // Audit log : N entrées 'approve_user' individuelles générées par trigger.

    // Notifications in-app : on les envoie AVANT la response car on veut
    // qu'elles soient visibles immédiatement après le revalidate.
    const bulkApprovedContent = "Votre compte a été approuvé. Bienvenue sur CMA Connect !";
    try {
      await Promise.all(
        userIds.map((id) =>
          supabase.rpc("notify_user", {
            p_recipient: id,
            p_type: "account_approved",
            p_reference_id: id,
            p_content: bulkApprovedContent,
            p_preference_field: null,
          })
        )
      );
      after(() =>
        Promise.all(
          userIds.map((id) =>
            dispatchPush(id, "account_approved", id, bulkApprovedContent)
          )
        )
      );
    } catch (notifErr) {
      console.error("[bulkApproveAction] notifs partiellement échouées:", notifErr);
    }

    // Emails : après la response via `after()` pour ne pas bloquer l'admin
    // tout en garantissant que Resend soit réellement appelé (le runtime
    // sinon pouvait couper les promises fire-and-forget).
    after(async () => {
      try {
        const admin = createAdminClient();
        const emailResults = await Promise.all(
          userIds.map(async (id) => {
            const { data: authRes } = await admin.auth.admin.getUserById(id);
            return { id, email: authRes?.user?.email ?? null };
          })
        );

        await Promise.all(
          emailResults.map(({ id, email }) => {
            const firstName = firstNameMap.get(id);
            if (!email || !firstName) {
              console.warn(
                `[bulkApproveAction] email ou first_name manquant pour ${id}, skip`
              );
              return Promise.resolve();
            }
            return sendAccountApprovedEmail({ to: email, firstName });
          })
        );
      } catch (emailErr) {
        console.error(
          "[bulkApproveAction] envoi emails échoué:",
          emailErr
        );
      }
    });

    revalidatePath("/admin/approvals");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── user management ─────────── */

export async function suspendUserAction(
  userId: string,
  reason?: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'suspend_user' détectée via transition status).
    // Note : le motif (reason) n'est plus capturé dans l'audit — à passer via
    // un paramètre supplémentaire à la fonction log_admin_action si besoin.
    void reason; // conservé pour compat API, usage à étendre via RPC dédiée

    // Notification account_suspended (non-opt-out)
    // Note : notify_user filtre les comptes inactifs ; le compte vient d'être
    // suspendu donc la notification ne sera pas créée. C'est OK : la spec
    // §488 prévoit l'envoi par email (out-of-scope ici). On garde l'appel
    // pour rester cohérent avec le pattern.
    // Le push, lui, passe (sendPushToUser ne check pas le status) → le user
    // reçoit la notif OS même si la cloche in-app ne sera plus accessible.
    const suspendContent = "Votre compte a été suspendu par un administrateur.";
    await supabase.rpc("notify_user", {
      p_recipient: userId,
      p_type: "account_suspended",
      p_reference_id: userId,
      p_content: suspendContent,
      p_preference_field: null,
    });
    after(() => dispatchPush(userId, "account_suspended", userId, suspendContent));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function reactivateUserAction(
  userId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'reactivate_user' détectée).

    // Notification account_reactivated (non-opt-out). Le compte vient juste
    // de passer à 'active' donc notify_user créera bien la ligne.
    const reactivateContent = "Votre compte a été réactivé.";
    await supabase.rpc("notify_user", {
      p_recipient: userId,
      p_type: "account_reactivated",
      p_reference_id: userId,
      p_content: reactivateContent,
      p_preference_field: null,
    });
    after(() => dispatchPush(userId, "account_reactivated", userId, reactivateContent));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deactivateUserAction(
  userId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "deactivated" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'deactivate_user' détectée).

    // Notification account_deactivated (non-opt-out). Le compte vient d'être
    // désactivé ; notify_user filtre les comptes non-actifs donc l'INSERT sera
    // un no-op. Conservé pour cohérence (cf. suspendUserAction).
    const deactivateContent = "Votre compte a été désactivé.";
    await supabase.rpc("notify_user", {
      p_recipient: userId,
      p_type: "account_deactivated",
      p_reference_id: userId,
      p_content: deactivateContent,
      p_preference_field: null,
    });
    after(() => dispatchPush(userId, "account_deactivated", userId, deactivateContent));

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── create admin (super-admin only) ─────────── */

export async function createAdminAction(data: {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  temp_password: string;
}): Promise<AdminActionResult> {
  try {
    const { supabase, profile } = await requireAdmin();

    if (!profile.is_super_admin)
      return { success: false, error: "Seul le super-admin peut créer des admins" };

    // Check max 5 active admins (hors LakouSystems)
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "active")
      .eq("is_super_admin", false);

    if ((count ?? 0) >= 5)
      return { success: false, error: "Maximum 5 admins actifs atteint" };

    // Check username uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();

    if (existing)
      return { success: false, error: "Ce username est déjà pris" };

    // Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.temp_password,
    });

    if (signUpError || !authData.user)
      return {
        success: false,
        error: signUpError?.message ?? "Erreur lors de la création du compte",
      };

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      username: data.username,
      role: "admin",
      status: "active",
      is_profile_complete: true,
      must_change_password: true,
      nationality: ["Non renseignée"],
      country: "Non renseigné",
      accepted_terms_at: new Date().toISOString(),
      terms_version: "1.0",
    });

    if (profileError)
      return { success: false, error: profileError.message };

    // Audit log auto via trigger trg_audit_profiles_insert (action 'create_admin').

    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── tags CRUD ─────────── */

export async function createTagAction(
  name: string,
  color: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // Validation Zod (spec §1370-1371)
    const parsed = tagSchema.safeParse({ name, color });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { error } = await supabase
      .from("forum_tags")
      .insert({ name: parsed.data.name, color: parsed.data.color });

    if (error) {
      if (error.code === "23505")
        return { success: false, error: "Ce tag existe déjà" };
      return { success: false, error: error.message };
    }

    // Audit log auto via trigger trg_audit_forum_tags (action 'create_tag').

    revalidatePath("/admin/tags");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateTagAction(
  tagId: string,
  name: string,
  color: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // Validation Zod (spec §1370-1371)
    const parsed = tagSchema.safeParse({ name, color });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { error } = await supabase
      .from("forum_tags")
      .update({ name: parsed.data.name, color: parsed.data.color })
      .eq("id", tagId)
      .eq("is_system", false);

    if (error) {
      if (error.code === "23505")
        return { success: false, error: "Un autre tag porte déjà ce nom" };
      return { success: false, error: error.message };
    }

    // Audit log auto via trigger (action 'update_tag').

    revalidatePath("/admin/tags");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteTagAction(
  tagId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("forum_tags")
      .delete()
      .eq("id", tagId)
      .eq("is_system", false);

    if (error) {
      if (error.code === "23503")
        return { success: false, error: "Ce tag est utilisé par des posts" };
      return { success: false, error: error.message };
    }

    // Audit log auto via trigger (action 'delete_tag').

    revalidatePath("/admin/tags");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── activities CRUD ─────────── */

export async function createActivityAction(
  name: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .insert({ name });

    if (error) {
      if (error.code === "23505")
        return { success: false, error: "Cette activité existe déjà" };
      return { success: false, error: error.message };
    }

    // Audit log auto via trigger trg_audit_activities (action 'create_activity').

    revalidatePath("/admin/activities");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateActivityAction(
  activityId: string,
  name: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .update({ name })
      .eq("id", activityId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'update_activity').

    revalidatePath("/admin/activities");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteActivityAction(
  activityId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'delete_activity').

    revalidatePath("/admin/activities");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── moderation ─────────── */

export async function reviewReportAction(
  reportId: string,
  status: "reviewed" | "dismissed",
  adminNote?: string
): Promise<AdminActionResult> {
  try {
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("reports")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: adminNote ?? null,
      })
      .eq("id", reportId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/moderation");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deletePostAction(
  postId: string
): Promise<AdminActionResult> {
  try {
    const { supabase, user } = await requireAdmin();

    // Fetch l'auteur AVANT le UPDATE (pour notification).
    const { data: postBefore } = await supabase
      .from("forum_posts")
      .select("author_id")
      .eq("id", postId)
      .maybeSingle();

    const { error } = await supabase
      .from("forum_posts")
      .update({ is_deleted: true })
      .eq("id", postId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_forum_posts_update (action 'delete_post'
    // détectée car is_deleted passe à true et auth.uid() ≠ author_id).

    // Notification : auteur du post supprimé (sauf si admin se supprime lui-même).
    if (postBefore?.author_id && postBefore.author_id !== user.id) {
      const authorId = postBefore.author_id;
      const content = "Votre post a été supprimé par un administrateur.";
      await supabase.rpc("notify_user", {
        p_recipient: authorId,
        p_type: "admin",
        p_reference_id: postId,
        p_content: content,
        p_preference_field: null,
      });
      after(() => dispatchPush(authorId, "admin", postId, content));
    }

    revalidatePath("/admin/moderation");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteCommentAction(
  commentId: string
): Promise<AdminActionResult> {
  try {
    const { supabase, user } = await requireAdmin();

    // Fetch l'auteur AVANT le UPDATE (pour notification).
    const { data: commentBefore } = await supabase
      .from("forum_comments")
      .select("author_id")
      .eq("id", commentId)
      .maybeSingle();

    const { error } = await supabase
      .from("forum_comments")
      .update({ is_deleted: true })
      .eq("id", commentId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_forum_comments_update (action 'delete_comment').

    // Notification : auteur du commentaire supprimé (sauf self-delete admin).
    if (commentBefore?.author_id && commentBefore.author_id !== user.id) {
      const authorId = commentBefore.author_id;
      const content = "Votre commentaire a été supprimé par un administrateur.";
      await supabase.rpc("notify_user", {
        p_recipient: authorId,
        p_type: "admin",
        p_reference_id: commentId,
        p_content: content,
        p_preference_field: null,
      });
      after(() => dispatchPush(authorId, "admin", commentId, content));
    }

    revalidatePath("/admin/moderation");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── invitations ─────────── */

export async function revokeInvitationAction(
  linkId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("invitation_links")
      .update({ is_revoked: true })
      .eq("id", linkId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_invitation_links (action 'revoke_invitation').

    revalidatePath("/admin/invitations");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── support tickets ─────────── */

export async function assignTicketAction(
  ticketId: string,
  adminId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // Vérifier que l'admin cible existe, est admin et est actif
    const { data: targetAdmin, error: targetErr } = await supabase
      .from("profiles")
      .select("id, role, status")
      .eq("id", adminId)
      .maybeSingle();

    if (targetErr || !targetAdmin || targetAdmin.role !== "admin" || targetAdmin.status !== "active")
      return { success: false, error: "L'admin cible n'existe pas ou n'est pas actif" };

    const { error } = await supabase
      .from("support_tickets")
      .update({ assigned_to: adminId, status: "in_progress" })
      .eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_support_tickets (action 'assign_ticket').

    revalidatePath("/admin/support");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function respondTicketAction(
  ticketId: string,
  response: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_response: response,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'respond_ticket' détectée via admin_response).

    // Notification support_reply (non-opt-out) à l'auteur du ticket.
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("author_id")
      .eq("id", ticketId)
      .maybeSingle();

    if (ticket?.author_id) {
      const authorId = ticket.author_id;
      const content = "Un administrateur a répondu à votre ticket de support.";
      await supabase.rpc("notify_user", {
        p_recipient: authorId,
        p_type: "support_reply",
        p_reference_id: ticketId,
        p_content: content,
        p_preference_field: null,
      });
      after(() => dispatchPush(authorId, "support_reply", ticketId, content));
    }

    revalidatePath("/admin/support");
    revalidatePath(`/admin/support/${ticketId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function closeTicketAction(
  ticketId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger (action 'close_ticket' détectée via status → closed).

    revalidatePath("/admin/support");
    revalidatePath(`/admin/support/${ticketId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── update profile (admin edit user) ─────────── */

// Field validators: whitelist + type/length/enum checks per field
const FIELD_VALIDATORS: Record<string, (v: unknown) => string | null> = {
  first_name: (v) =>
    typeof v !== "string" || v.length < 1 || v.length > 100 ? "first_name : texte 1-100 chars" : null,
  last_name: (v) =>
    typeof v !== "string" || v.length < 1 || v.length > 100 ? "last_name : texte 1-100 chars" : null,
  date_of_birth: (v) =>
    typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) ? "date_of_birth : format YYYY-MM-DD" : null,
  nationality: (v) =>
    !Array.isArray(v) || v.length === 0 || v.length > 5 || v.some((n: unknown) => typeof n !== "string")
      ? "nationality : tableau de 1-5 strings"
      : null,
  country: (v) =>
    typeof v !== "string" || v.length > 100 ? "country : texte max 100 chars" : null,
  class: (v) =>
    v !== null && (typeof v !== "string" || !["S1", "S2", "S3"].includes(v))
      ? "class : S1, S2, S3 ou null"
      : null,
  filiere: (v) =>
    v !== null &&
    (typeof v !== "string" ||
      !["SVT", "SES", "SMP", "Section A", "Section B", "Section C", "Section D"].includes(v))
      ? "filiere : valeur invalide"
      : null,
  promo_id: (v) =>
    v !== null && (typeof v !== "string" || v.length !== 36) ? "promo_id : UUID ou null" : null,
  promo_start_date: (v) =>
    v !== null && (typeof v !== "number" || v < 1980 || v > 2100) ? "promo_start_date : année 1980-2100" : null,
  enrollment_date: (v) =>
    v !== null && (typeof v !== "number" || v < 1980 || v > 2100) ? "enrollment_date : année 1980-2100" : null,
  expected_end_date: (v) =>
    v !== null && (typeof v !== "number" || v < 1980 || v > 2100) ? "expected_end_date : année 1980-2100" : null,
  bio: (v) =>
    v !== null && (typeof v !== "string" || v.length > 500) ? "bio : texte max 500 chars" : null,
  avatar_url: (v) =>
    v !== null && (typeof v !== "string" || v.length > 500) ? "avatar_url : URL max 500 chars" : null,
};

const SUPER_ADMIN_FIELD_VALIDATORS: Record<string, (v: unknown) => string | null> = {
  role: (v) =>
    typeof v !== "string" || !["alumni", "s4", "student", "admin"].includes(v)
      ? "role : alumni, s4, student, admin"
      : null,
  status: (v) =>
    typeof v !== "string" || !["pending", "active", "suspended", "deactivated"].includes(v)
      ? "status : pending, active, suspended, deactivated"
      : null,
  must_change_password: (v) =>
    typeof v !== "boolean" ? "must_change_password : boolean" : null,
};

export async function updateProfileAction(
  userId: string,
  updates: Record<string, unknown>
): Promise<AdminActionResult> {
  try {
    const { supabase, profile: adminProfile } = await requireAdmin();

    const sanitized: Record<string, unknown> = {};
    const rejected: string[] = [];
    const validationErrors: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const validator = FIELD_VALIDATORS[key];
      const superValidator = SUPER_ADMIN_FIELD_VALIDATORS[key];

      if (validator) {
        const err = validator(value);
        if (err) { validationErrors.push(err); continue; }
        sanitized[key] = value;
      } else if (superValidator) {
        if (!adminProfile.is_super_admin) { rejected.push(key); continue; }
        const err = superValidator(value);
        if (err) { validationErrors.push(err); continue; }
        sanitized[key] = value;
      } else {
        rejected.push(key);
      }
    }

    if (validationErrors.length > 0)
      return { success: false, error: `Validation : ${validationErrors.join(", ")}` };

    if (Object.keys(sanitized).length === 0)
      return {
        success: false,
        error: rejected.length > 0
          ? `Champs non autorisés : ${rejected.join(", ")}`
          : "Aucun champ à modifier",
      };

    const { error } = await supabase
      .from("profiles")
      .update(sanitized)
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    // Audit log auto via trigger trg_audit_profiles_update (action détectée
    // selon les champs modifiés : status transition, role, promo_id, ou update_profile).
    // Les rejected fields ne sont plus capturés dans les détails — prune silencieux.
    void rejected;

    // Notification (non-opt-out) à la propriétaire du profil modifié.
    // On notifie systématiquement (peu importe quels champs) sauf si l'admin
    // édite son propre profil (cas peu probable mais possible).
    const updateProfileContent = "Votre profil a été modifié par un administrateur.";
    await supabase.rpc("notify_user", {
      p_recipient: userId,
      p_type: "admin",
      p_reference_id: userId,
      p_content: updateProfileContent,
      p_preference_field: null,
    });
    after(() => dispatchPush(userId, "admin", userId, updateProfileContent));

    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/* ─────────── Promotions ─────────── */

/**
 * Met à jour le nom et les années d'une promotion existante.
 * Spec §457 (action `update_promo`), §202-211 (table promotions).
 *
 * - Vérifie l'unicité du nom (excepté la promo elle-même)
 * - Garde-fou : start_date <= end_date
 * - Loggue dans admin_audit_log via RPC log_admin_action
 */
export async function updatePromotionAction(
  promoId: string,
  data: UpdatePromotionData
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    const parsed = updatePromotionSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    // 1. Vérifier que la promo existe + récupérer l'état avant
    const { data: existing, error: fetchErr } = await supabase
      .from("promotions")
      .select("id, name, start_date, end_date")
      .eq("id", promoId)
      .maybeSingle();

    if (fetchErr || !existing)
      return { success: false, error: "Promotion introuvable" };

    // 2. Unicité du nom (uniquement si modifié)
    if (parsed.data.name !== existing.name) {
      const { data: dup } = await supabase
        .from("promotions")
        .select("id")
        .eq("name", parsed.data.name)
        .neq("id", promoId)
        .maybeSingle();

      if (dup)
        return {
          success: false,
          error: "Une autre promotion porte déjà ce nom",
        };
    }

    // 3. UPDATE
    const { error: updateErr } = await supabase
      .from("promotions")
      .update({
        name: parsed.data.name,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", promoId);

    if (updateErr)
      return { success: false, error: updateErr.message };

    // 4. Audit log via RPC SECURITY DEFINER
    await supabase.rpc("log_admin_action", {
      p_action: "update_promo",
      p_target_type: "promotion",
      p_target_id: promoId,
      p_details: {
        before: {
          name: existing.name,
          start_date: existing.start_date,
          end_date: existing.end_date,
        },
        after: {
          name: parsed.data.name,
          start_date: parsed.data.start_date,
          end_date: parsed.data.end_date,
        },
      },
    });

    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Rejette une promotion : suspend les profils rattachés + notifie + push.
 *
 * Extraite de `src/app/admin/promotions/page.tsx` pour pouvoir utiliser
 * `after()` + `dispatchPush()` (APIs serveur uniquement). Le composant
 * client appelle cette action au lieu de faire les supabase calls inline.
 *
 * Ordre critique :
 *   1. Fetch profils actifs liés (AVANT suspend) — notify_user filtre les
 *      comptes non-actifs, il faut donc notifier avant de suspend.
 *   2. UPDATE promotions.status = 'rejected'
 *   3. notify_user + dispatchPush pour chaque profil
 *   4. UPDATE profiles.status = 'suspended' en masse
 */
export async function rejectPromotionAction(
  promoId: string
): Promise<AdminActionResult> {
  try {
    const { supabase } = await requireAdmin();

    // 1. Profils affectés AVANT la suspension
    const { data: affectedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("promo_id", promoId)
      .neq("role", "admin")
      .eq("status", "active");

    // 2. Reject la promo
    const { error: rejectErr } = await supabase
      .from("promotions")
      .update({ status: "rejected" })
      .eq("id", promoId);

    if (rejectErr) return { success: false, error: rejectErr.message };

    // 3. Notifications + push (fire-and-forget côté DB, push via after())
    const rejectContent =
      "Votre promotion a été rejetée. Contactez un admin dans les 3 jours.";
    const recipientIds = (affectedProfiles ?? []).map((p) => p.id);

    for (const recipientId of recipientIds) {
      supabase
        .rpc("notify_user", {
          p_recipient: recipientId,
          p_type: "promo_rejected",
          p_reference_id: promoId,
          p_content: rejectContent,
          p_preference_field: null,
        })
        .then(
          () => {},
          () => {}
        );
    }

    after(() =>
      Promise.all(
        recipientIds.map((id) =>
          dispatchPush(id, "promo_rejected", promoId, rejectContent)
        )
      )
    );

    // 4. Suspendre les profils liés
    await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("promo_id", promoId)
      .neq("role", "admin");

    revalidatePath("/admin/promotions");
    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
