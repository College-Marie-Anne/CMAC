"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { reportSchema, type ReportData } from "@/lib/validations/moderation";
import { reportLimiter, checkRateLimit } from "@/lib/rate-limit";

export type ModerationResult = {
  success: boolean;
  error?: string;
};

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("id", user.id)
    .single();
  if (error || !profile || profile.status !== "active")
    throw new Error("Compte inactif");
  return { supabase, user };
}

/* ─────────── Signalement ─────────── */

/**
 * Crée un signalement (post, commentaire, profil ou DM).
 * La cible est déterminée par celui des 4 IDs fournis qui est non-null.
 * RLS (004:510-512) : INSERT autorisé si reporter_id = auth.uid() et profile actif.
 * Rate limit : 10/h par user (spec §707).
 */
export async function reportAction(data: ReportData): Promise<ModerationResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Rate limit
    const { allowed, resetAt } = await checkRateLimit(reportLimiter, user.id);
    if (!allowed) {
      const mins = Math.ceil((resetAt - Date.now()) / 60000);
      return {
        success: false,
        error: `Trop de signalements. Réessayez dans ${mins} min.`,
      };
    }

    const parsed = reportSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Empêcher l'auto-signalement (ex: user se signale lui-même)
    if (parsed.data.reported_user_id === user.id) {
      return { success: false, error: "Vous ne pouvez pas vous signaler vous-même." };
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: parsed.data.reported_user_id ?? null,
      reported_post_id: parsed.data.reported_post_id ?? null,
      reported_comment_id: parsed.data.reported_comment_id ?? null,
      reported_message_id: parsed.data.reported_message_id ?? null,
      reason: parsed.data.reason,
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/moderation");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── Blocage ─────────── */

/**
 * Bloque une utilisatrice. Passe par la RPC `block_user` (003:425-441) qui :
 *   1. Annule automatiquement les mentorats actifs entre les 2 users (spec §657)
 *   2. INSERT dans blocked_users (pattern SECURITY DEFINER)
 * RLS : SELECT dans blocked_users filtre par blocker_id = auth.uid() (004:522-526)
 */
export async function blockUserAction(
  blockedUserId: string
): Promise<ModerationResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Validation UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(blockedUserId)) {
      return { success: false, error: "ID utilisateur invalide." };
    }

    if (blockedUserId === user.id) {
      return { success: false, error: "Vous ne pouvez pas vous bloquer vous-même." };
    }

    // Vérifier que la cible existe
    const { data: target, error: targetErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", blockedUserId)
      .maybeSingle();
    if (targetErr || !target) {
      return { success: false, error: "Utilisatrice introuvable." };
    }

    // Vérifier qu'on ne l'a pas déjà bloquée (évite conflit UNIQUE)
    const { data: existing } = await supabase
      .from("blocked_users")
      .select("blocker_id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedUserId)
      .maybeSingle();
    if (existing) {
      return { success: false, error: "Utilisatrice déjà bloquée." };
    }

    const { error } = await supabase.rpc("block_user", {
      p_blocked_id: blockedUserId,
    });
    if (error) return { success: false, error: error.message };

    revalidatePath("/settings/blocked");
    revalidatePath(`/profile/${blockedUserId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Débloque une utilisatrice. DELETE direct (RLS 004:530-532 autorise par blocker_id).
 */
export async function unblockUserAction(
  blockedUserId: string
): Promise<ModerationResult> {
  try {
    const { supabase, user } = await requireAuth();

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(blockedUserId)) {
      return { success: false, error: "ID utilisateur invalide." };
    }

    const { error } = await supabase
      .from("blocked_users")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedUserId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/settings/blocked");
    revalidatePath(`/profile/${blockedUserId}`);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
