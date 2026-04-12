"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  resetPasswordSchema,
  type ResetPasswordData,
} from "@/lib/validations/password";

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
    const { supabase, user } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "approve_user",
      target_type: "profile",
      target_id: userId,
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
    const { supabase, user } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "deactivated" })
      .eq("id", userId)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "reject_user",
      target_type: "profile",
      target_id: userId,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .in("id", userIds)
      .eq("status", "pending");

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "bulk_approve",
      target_type: "profile",
      target_id: userIds.join(","),
      details: { count: userIds.length },
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
    const { supabase, user } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "suspend_user",
      target_type: "profile",
      target_id: userId,
      details: reason ? { reason } : null,
    });

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
    const { supabase, user } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "reactivate_user",
      target_type: "profile",
      target_id: userId,
    });

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
    const { supabase, user } = await requireAdmin();

    const notFound = await requireTargetProfile(supabase, userId);
    if (notFound) return { success: false, error: notFound };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "deactivated" })
      .eq("id", userId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "deactivate_user",
      target_type: "profile",
      target_id: userId,
    });

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
    const { supabase, user, profile } = await requireAdmin();

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

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "create_admin",
      target_type: "profile",
      target_id: authData.user.id,
      details: { username: data.username, email: data.email },
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("forum_tags")
      .insert({ name, color });

    if (error) {
      if (error.code === "23505")
        return { success: false, error: "Ce tag existe déjà" };
      return { success: false, error: error.message };
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "create_tag",
      target_type: "forum_tag",
      target_id: name,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("forum_tags")
      .update({ name, color })
      .eq("id", tagId)
      .eq("is_system", false);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "update_tag",
      target_type: "forum_tag",
      target_id: tagId,
    });

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
    const { supabase, user } = await requireAdmin();

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

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "delete_tag",
      target_type: "forum_tag",
      target_id: tagId,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .insert({ name });

    if (error) {
      if (error.code === "23505")
        return { success: false, error: "Cette activité existe déjà" };
      return { success: false, error: error.message };
    }

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "create_activity",
      target_type: "activity",
      target_id: name,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .update({ name })
      .eq("id", activityId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "update_activity",
      target_type: "activity",
      target_id: activityId,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "delete_activity",
      target_type: "activity",
      target_id: activityId,
    });

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

    const { error } = await supabase
      .from("forum_posts")
      .update({ is_deleted: true })
      .eq("id", postId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "delete_post",
      target_type: "forum_post",
      target_id: postId,
    });

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

    const { error } = await supabase
      .from("forum_comments")
      .update({ is_deleted: true })
      .eq("id", commentId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "delete_comment",
      target_type: "forum_comment",
      target_id: commentId,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("invitation_links")
      .update({ is_revoked: true })
      .eq("id", linkId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "revoke_invitation",
      target_type: "invitation_link",
      target_id: linkId,
    });

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
    const { supabase, user } = await requireAdmin();

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

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "assign_ticket",
      target_type: "support_ticket",
      target_id: ticketId,
      details: { assigned_to: adminId },
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_response: response,
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "respond_ticket",
      target_type: "support_ticket",
      target_id: ticketId,
    });

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
    const { supabase, user } = await requireAdmin();

    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "closed" })
      .eq("id", ticketId);

    if (error) return { success: false, error: error.message };

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "close_ticket",
      target_type: "support_ticket",
      target_id: ticketId,
    });

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
    const { supabase, user, profile: adminProfile } = await requireAdmin();

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

    await supabase.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "update_profile",
      target_type: "profile",
      target_id: userId,
      details: { applied: sanitized, rejected },
    });

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
