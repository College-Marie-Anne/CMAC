"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateBioSchema,
  updateIdentitySchema,
  addEducationSchema,
  addProfessionSchema,
  updateDesiredFieldsSchema,
  updateThemeSchema,
  updateActivitiesSchema,
  updateNotificationPrefsSchema,
  type AddEducationData,
  type AddProfessionData,
  type UpdateDesiredFieldsData,
  type UpdateActivitiesData,
  type UpdateNotificationPrefsData,
  type UpdateIdentityData,
} from "@/lib/validations/profile";
import {
  deactivateAccountLimiter,
  updateIdentityLimiter,
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

/* ─── Identité (username + prénoms + nom) ─── */

/**
 * Permet à l'utilisatrice de modifier elle-même son username, son prénom et
 * son nom. Avant, la spec exigeait de passer par un admin ; l'équipe a
 * relaxé cette règle suite aux retours utilisateur·ices.
 *
 * Checks :
 *   - Rate limit (3 / jour) pour éviter qu'un compte compromis change
 *     d'identité en boucle et brouille l'audit.
 *   - Unicité username via UNIQUE (profiles_username_key) — on fait un check
 *     préalable pour un message d'erreur propre, puis on se repose sur la
 *     contrainte DB pour la race (code 23505 → message clair).
 *   - RLS `profiles_update_own` autorise l'UPDATE quand id = auth.uid().
 */
export async function updateIdentityAction(
  data: UpdateIdentityData
): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(
      updateIdentityLimiter,
      user.id
    );
    if (!allowed) {
      const h = Math.ceil((resetAt - Date.now()) / 3600000);
      return {
        success: false,
        error: `Trop de changements d'identité. Réessayez dans ${h}h`,
      };
    }

    const parsed = updateIdentitySchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    // Check unicité username (skip si on garde le même)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", user.id)
      .single();

    if (existing && existing.username !== parsed.data.username) {
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", parsed.data.username)
        .maybeSingle();
      if (taken) return { success: false, error: "Ce username est déjà pris" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: parsed.data.username,
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
      })
      .eq("id", user.id);

    if (error) {
      // Postgres 23505 = UNIQUE violation (race sur le check ci-dessus)
      if (error.code === "23505") {
        return { success: false, error: "Ce username est déjà pris" };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/profile/edit");
    revalidatePath(`/profile/${parsed.data.username}`);
    if (existing?.username && existing.username !== parsed.data.username) {
      // Ancienne URL de profil devient orpheline côté cache → invalidate aussi
      revalidatePath(`/profile/${existing.username}`);
    }
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
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

/* ─── Activités parascolaires ─── */

export async function updateActivitiesAction(data: UpdateActivitiesData): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = updateActivitiesSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // Pattern DELETE + INSERT bulk (pas d'RPC atomique comme desired_fields car
    // pas de plafond strict côté DB). Risque de fenêtre "0 activités briefly"
    // négligeable car les activités n'ont pas de side-effect (pas de notification,
    // pas de vérification).
    const { error: delErr } = await supabase
      .from("profile_activities")
      .delete()
      .eq("profile_id", user.id);
    if (delErr) return { success: false, error: delErr.message };

    if (parsed.data.activity_ids.length > 0) {
      const { error: insErr } = await supabase
        .from("profile_activities")
        .insert(
          parsed.data.activity_ids.map((activity_id) => ({
            profile_id: user.id,
            activity_id,
          }))
        );
      if (insErr) return { success: false, error: insErr.message };
    }

    revalidatePath("/profile/edit");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── Préférences de notification ─── */

export async function updateNotificationPrefsAction(
  data: UpdateNotificationPrefsData
): Promise<ProfileActionResult> {
  try {
    const { supabase, user } = await requireAuth();
    const parsed = updateNotificationPrefsSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    // La row notification_preferences est créée automatiquement par le trigger
    // trg_create_notification_preferences (migration 003) à la création du profil.
    // On UPDATE avec le filtre profile_id (la RLS vérifie auth.uid() = profile_id).
    const { error } = await supabase
      .from("notification_preferences")
      .update(parsed.data)
      .eq("profile_id", user.id);
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

    // Check max 5 liens actifs simultanément (slots encore dispo + non-révoqué
    // + non-expiré). Depuis la migration 032, un lien peut accepter jusqu'à
    // max_uses inscriptions — un lien avec used_count < max_uses reste actif
    // même après 1-9 utilisations. On filtre par `used_count < max_uses`
    // plutôt que `is_used=false` (source de vérité plus fiable, résiste aux
    // rows legacy avec état incohérent).
    const { data: activeRows } = await supabase
      .from("invitation_links")
      .select("id, used_count, max_uses")
      .eq("inviter_id", user.id)
      .eq("is_revoked", false)
      .gt("expires_at", new Date().toISOString());

    const activeCount = (activeRows ?? []).filter(
      (r) => r.used_count < r.max_uses
    ).length;

    if (activeCount >= 5)
      return { success: false, error: "Maximum 5 liens actifs. Attendez qu'un lien expire." };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: link, error } = await supabase
      .from("invitation_links")
      .insert({
        inviter_id: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, token, expires_at, is_revoked, created_at, max_uses, used_count")
      .single();

    if (error) return { success: false, error: error.message };

    // Revalidation des 2 emplacements où le générateur est affiché :
    //  - /profile/edit (chemin statique)
    //  - /profile/[username] (chemin dynamique → on utilise le 2ème argument
    //    "page" pour invalider toutes les pages matching ce pattern, sans
    //    avoir à fetch le username spécifique ici).
    revalidatePath("/profile/edit");
    revalidatePath("/profile/[username]", "page");
    return { success: true, data: link };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Révoque un lien d'invitation appartenant à l'utilisatrice.
 *
 * RLS (migration 026) :
 *   - USING (inviter_id = auth.uid()) garantit qu'on ne peut révoquer que SES
 *     liens.
 *   - WITH CHECK (is_revoked = true) garantit qu'on ne peut PAS un-revoke.
 *
 * On filtre aussi côté action pour éviter les appels inutiles sur des liens
 * déjà utilisés ou déjà révoqués.
 */
export async function revokeInvitationLinkAction(
  linkId: string
): Promise<ProfileActionResult> {
  try {
    const { supabase, user, profile } = await requireAuth();

    if (profile.role !== "alumni")
      return { success: false, error: "Seules les alumni peuvent révoquer leurs liens" };

    const { error } = await supabase
      .from("invitation_links")
      .update({ is_revoked: true })
      .eq("id", linkId)
      .eq("inviter_id", user.id)
      .eq("is_used", false)
      .eq("is_revoked", false);

    if (error) return { success: false, error: error.message };

    // Même double-revalidation que generateInvitationLinkAction : le bouton
    // peut être cliqué depuis /profile/edit OU depuis /profile/[username].
    revalidatePath("/profile/edit");
    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
