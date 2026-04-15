"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateBioSchema,
  addEducationSchema,
  addProfessionSchema,
  updateDesiredFieldsSchema,
  updateThemeSchema,
  type AddEducationData,
  type AddProfessionData,
  type UpdateDesiredFieldsData,
} from "@/lib/validations/profile";
import {
  deactivateAccountLimiter,
  checkRateLimit,
} from "@/lib/rate-limit";

export type ProfileActionResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();
  if (error || !profile || profile.status !== "active")
    throw new Error("Compte inactif");
  return { supabase, user, profile };
}

/* ─── Bio ─── */

export async function updateBioAction(bio: string | null): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = updateBioSchema.safeParse({ bio });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase
      .from("profiles")
      .update({ bio: parsed.data.bio })
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Avatar ─── */

export async function updateAvatarAction(avatarUrl: string): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    revalidatePath("/feed");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Education ─── */

export async function addEducationAction(data: AddEducationData): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = addEducationSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase.from("user_education").insert({
      profile_id: user.id,
      ...parsed.data,
      degree_level: parsed.data.degree_level ?? null,
      start_year: parsed.data.start_year ?? null,
      end_year: parsed.data.end_year ?? null,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteEducationAction(eduId: string): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("user_education")
      .delete()
      .eq("id", eduId)
      .eq("profile_id", user.id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Professions ─── */

export async function addProfessionAction(data: AddProfessionData): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = addProfessionSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase.from("user_professions").insert({
      profile_id: user.id,
      title: parsed.data.title,
      company: parsed.data.company ?? null,
      is_current: parsed.data.is_current,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteProfessionAction(profId: string): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const { error } = await supabase
      .from("user_professions")
      .delete()
      .eq("id", profId)
      .eq("profile_id", user.id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Desired Fields ─── */

export async function updateDesiredFieldsAction(data: UpdateDesiredFieldsData): Promise<ProfileActionResult> {
  try {
    const { supabase } = await requireAuth();
    const parsed = updateDesiredFieldsSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Atomic DELETE + INSERT via RPC — enforces max 3 server-side even if
    // a client bypasses Zod. Also prevents the "0 domains briefly" window
    // caused by splitting into two PostgREST requests.
    // Defense in depth : trigger trg_enforce_desired_study_fields_limit
    // (migration 018) blocks any direct INSERT beyond 3 at DB level.
    const { error } = await supabase.rpc("replace_desired_study_fields", {
      p_fields: parsed.data.fields,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Theme ─── */

export async function updateThemeAction(theme: "light" | "dark" | "system"): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = updateThemeSchema.safeParse({ theme });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const { error } = await supabase
      .from("profiles")
      .update({ theme_preference: parsed.data.theme })
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Account Deactivation ─── */

export async function deactivateAccountAction(confirmation: string): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(deactivateAccountLimiter, user.id);
    if (!allowed) {
      const hours = Math.ceil((resetAt - Date.now()) / 3600000);
      return { success: false, error: `Réessayez dans ${hours}h` };
    }

    if (confirmation !== "DÉSACTIVER")
      return { success: false, error: "Tapez DÉSACTIVER pour confirmer" };

    const { error } = await supabase
      .from("profiles")
      .update({ status: "deactivated" })
      .eq("id", user.id);
    if (error) return { success: false, error: error.message };

    await supabase.auth.signOut();
    revalidatePath("/");
    redirect("/login");
  } catch (e: unknown) {
    // redirect throws — only catch real errors
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Invitation Link Generation ─── */

export async function generateInvitationLinkAction(): Promise<ProfileActionResult> {
  try {
    const { supabase, user, profile } = await requireAuth();

    if (profile.role !== "alumni")
      return { success: false, error: "Seules les alumni peuvent générer des liens" };

    // Check max 5 active links
    const { count } = await supabase
      .from("invitation_links")
      .select("id", { count: "exact", head: true })
      .eq("inviter_id", user.id)
      .eq("is_used", false)
      .eq("is_revoked", false)
      .gt("expires_at", new Date().toISOString());

    if ((count ?? 0) >= 5)
      return { success: false, error: "Maximum 5 liens actifs. Attendez qu'un lien expire." };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: link, error } = await supabase
      .from("invitation_links")
      .insert({
        inviter_id: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("token, expires_at")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/profile/edit");
    return { success: true, data: link };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
