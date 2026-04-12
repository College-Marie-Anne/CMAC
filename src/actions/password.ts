"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordData,
  type ResetPasswordData,
} from "@/lib/validations/password";
import {
  resetPasswordLimiter,
  changePasswordLimiter,
  checkRateLimit,
  sanitizeIp,
} from "@/lib/rate-limit";

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
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
