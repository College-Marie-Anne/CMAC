"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { pushSubscribeLimiter, checkRateLimit } from "@/lib/rate-limit";

export type PushActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Schéma d'une subscription browser telle que renvoyée par
 * `PushSubscription.toJSON()`. Les 3 champs keys.p256dh / keys.auth / endpoint
 * sont obligatoires pour reconstruire la subscription côté serveur.
 */
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(200),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

async function requireActiveUser() {
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

  if (error || !profile || profile.status !== "active") {
    throw new Error("Compte inactif");
  }

  return { supabase, user };
}

/**
 * Persiste une PushSubscription browser dans la table push_subscriptions.
 * Upsert idempotent via la contrainte UNIQUE (profile_id, endpoint) ajoutée
 * en migration 029 → re-souscrire sur le même device met juste à jour les
 * clés (utile si elles tournent côté gateway).
 */
export async function savePushSubscriptionAction(
  sub: PushSubscriptionInput
): Promise<PushActionResult> {
  try {
    const { supabase, user } = await requireActiveUser();

    const { allowed, resetAt } = await checkRateLimit(
      pushSubscribeLimiter,
      user.id
    );
    if (!allowed) {
      const min = Math.ceil((resetAt - Date.now()) / 60000);
      return {
        success: false,
        error: `Trop de tentatives. Réessayez dans ${min} min`,
      };
    }

    const parsed = pushSubscriptionSchema.safeParse(sub);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Subscription invalide",
      };
    }

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        profile_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
      },
      { onConflict: "profile_id,endpoint" }
    );

    if (error) {
      console.error("[push] upsert subscription failed", error);
      return { success: false, error: "Impossible d'enregistrer la subscription" };
    }

    // Activer le flag push_enabled. L'UPDATE est silencieux si la ligne
    // n'existe pas encore (trigger de migration 003 crée la ligne à la
    // création du profil → elle existe toujours pour un user actif).
    await supabase
      .from("notification_preferences")
      .update({ push_enabled: true })
      .eq("profile_id", user.id);

    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Supprime une PushSubscription (quand l'utilisatrice unsubscribe côté
 * browser, ou désactive le toggle push). Cascade RLS : on ne peut supprimer
 * que ses propres subscriptions (policy push_subscriptions_delete).
 *
 * Bascule aussi push_enabled=false si c'était la dernière subscription, pour
 * éviter que sendPushToUser envoie vers d'autres devices résiduels.
 */
export async function deletePushSubscriptionAction(
  endpoint: string
): Promise<PushActionResult> {
  try {
    const { supabase, user } = await requireActiveUser();

    if (!endpoint || typeof endpoint !== "string" || endpoint.length > 1000) {
      return { success: false, error: "Endpoint invalide" };
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("profile_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[push] delete subscription failed", error);
      return { success: false, error: "Impossible de supprimer la subscription" };
    }

    // Si plus aucune subscription → bascule push_enabled=false
    const { count } = await supabase
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id);

    if ((count ?? 0) === 0) {
      await supabase
        .from("notification_preferences")
        .update({ push_enabled: false })
        .eq("profile_id", user.id);
    }

    return { success: true };
  } catch (e: unknown) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
