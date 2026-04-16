"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type ForgotPasswordData,
  type ResetPasswordData,
  type ChangePasswordData,
} from "@/lib/validations/password";
import {
  resetPasswordLimiter,
  changePasswordLimiter,
  checkRateLimit,
  sanitizeIp,
} from "@/lib/rate-limit";
import { env } from "@/lib/env";

export type PasswordResult = {
  success: boolean;
  error?: string;
};

/**
 * Envoie un email de réinitialisation de mot de passe.
 * Retourne toujours un succès (même si l'email n'existe pas — sécurité).
 */
export async function forgotPasswordAction(
  data: ForgotPasswordData
): Promise<PasswordResult> {
  // Rate limit by IP — 3 per hour
  const h = await headers();
  const ip = sanitizeIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
  const { allowed, resetAt } = await checkRateLimit(resetPasswordLimiter, ip);
  if (!allowed) {
    const seconds = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Trop de demandes. Réessayez dans ${Math.ceil(seconds / 60)} min`,
    };
  }

  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Doit être whitelisté dans Supabase Dashboard → Auth → Redirect URLs.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${env.siteUrl}/auth/callback?next=/auth/reset-password`,
    }
  );

  // On ne révèle jamais si l'email existe ou non
  if (error) {
    console.error("[forgot-password]", error.message);
  }

  return { success: true };
}

/**
 * Met à jour le mot de passe de l'utilisatrice connectée (via le lien email).
 * La session est déjà active grâce au callback PKCE.
 */
export async function resetPasswordAction(
  data: ResetPasswordData
): Promise<PasswordResult> {
  // Rate limit by user session — 3 per hour
  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  if (sessionUser) {
    const { allowed, resetAt } = await checkRateLimit(
      changePasswordLimiter,
      sessionUser.id
    );
    if (!allowed) {
      const seconds = Math.ceil((resetAt - Date.now()) / 1000);
      return {
        success: false,
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(seconds / 60)} min`,
      };
    }
  }

  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Vérifier qu'une session existe (réutilise sessionUser du rate limit)
  if (!sessionUser) {
    return {
      success: false,
      error: "Session expirée. Veuillez redemander un lien de réinitialisation",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.includes("same_password")) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit être différent de l'ancien",
      };
    }
    return { success: false, error: "Erreur lors de la mise à jour. Réessayez" };
  }

  // Succès — redirection vers /feed (session déjà active)
  revalidatePath("/feed");
  redirect("/feed");
}

/**
 * Changement de mot de passe pour une utilisatrice connectée (depuis /settings).
 * Vérifie d'abord l'ancien mot de passe (re-auth via signInWithPassword) avant
 * d'autoriser la mise à jour. Spec §161.
 */
export async function changePasswordAction(
  data: ChangePasswordData
): Promise<PasswordResult> {
  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Session expirée. Reconnectez-vous." };
  }

  // Rate limit par user (3/h pour limiter les tentatives brute-force sur l'ancien mdp)
  const { allowed, resetAt } = await checkRateLimit(changePasswordLimiter, user.id);
  if (!allowed) {
    const mins = Math.ceil((resetAt - Date.now()) / 60000);
    return {
      success: false,
      error: `Trop de tentatives. Réessayez dans ${mins} min.`,
    };
  }

  if (!user.email) {
    return { success: false, error: "Email du compte introuvable. Contactez le support." };
  }

  // ─── Vérification de l'ancien mot de passe ───
  // signInWithPassword avec l'email courant + l'ancien mot de passe.
  // Si l'ancien est bon → pas d'erreur, la session reste valide.
  // Si mauvais → auth error → on refuse le changement.
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.old_password,
  });

  if (verifyErr) {
    return { success: false, error: "L'ancien mot de passe est incorrect." };
  }

  // ─── Mise à jour du mot de passe ───
  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateErr) {
    if (updateErr.message.includes("same_password")) {
      return {
        success: false,
        error: "Le nouveau mot de passe doit être différent de l'ancien.",
      };
    }
    return { success: false, error: "Erreur lors de la mise à jour. Réessayez." };
  }

  revalidatePath("/settings");
  return { success: true };
}
