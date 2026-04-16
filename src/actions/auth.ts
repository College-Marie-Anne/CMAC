"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  loginSchema,
  detectIdentifierType,
  type LoginFormData,
} from "@/lib/validations/auth";
import { loginLimiter, checkRateLimit, sanitizeIp } from "@/lib/rate-limit";

export type AuthResult = {
  success: boolean;
  error?: string;
  needsDob?: boolean;
  needsOtp?: boolean;
  matches?: number;
};

async function getClientIp(): Promise<string> {
  const h = await headers();
  return sanitizeIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
}

export async function loginAction(data: LoginFormData): Promise<AuthResult> {
  // Rate limit by IP
  const ip = await getClientIp();
  const { allowed, resetAt } = await checkRateLimit(loginLimiter, ip);
  if (!allowed) {
    const seconds = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Trop de tentatives. Réessayez dans ${seconds}s`,
    };
  }

  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { identifier, password, dob, otp_code } = parsed.data;
  const supabase = await createClient();
  const admin = createAdminClient();

  // ─── Étape A — Résolution de l'email ───

  let email: string | null = null;
  const type = detectIdentifierType(identifier);

  if (type === "email") {
    email = identifier;
  } else if (type === "username") {
    // RPC SECURITY DEFINER — fonctionne avant l'auth (pas de session)
    const { data: profileId } = await supabase.rpc(
      "resolve_profile_id_by_username",
      { p_username: identifier }
    );

    if (!profileId) {
      return { success: false, error: "Aucun compte trouvé avec cet identifiant" };
    }

    const { data: resolvedEmail } = await admin.rpc(
      "resolve_email_by_profile_id",
      { p_profile_id: profileId }
    );
    email = resolvedEmail ?? null;
  } else {
    // type === "fullname"
    const parts = identifier.trim().split(/\s+/);
    if (parts.length < 2) {
      return {
        success: false,
        error: "Entrez vos prénoms suivis de votre nom de famille",
      };
    }

    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(" ");

    // RPC SECURITY DEFINER — retourne uniquement les IDs (pas de DOB exposé)
    const { data: matchedIds } = await supabase.rpc(
      "resolve_profiles_by_fullname",
      {
        p_first_name: firstName,
        p_last_name: lastName,
        p_dob: dob || null,
      }
    );

    if (!matchedIds || matchedIds.length === 0) {
      if (dob) {
        return {
          success: false,
          error: "Aucun compte ne correspond à ce nom et cette date de naissance",
        };
      }
      return { success: false, error: "Aucun compte trouvé avec ce nom" };
    }

    // Homonymes sans DOB → demander la date de naissance
    if (matchedIds.length > 1 && !dob) {
      return {
        success: false,
        needsDob: true,
        matches: matchedIds.length,
        error: "Plusieurs comptes correspondent à ce nom",
      };
    }

    // Même nom + même DOB → envoyer un code OTP par email
    if (matchedIds.length > 1 && dob && !otp_code) {
      for (const p of matchedIds) {
        const { data: pEmail } = await admin.rpc(
          "resolve_email_by_profile_id",
          { p_profile_id: p.id }
        );
        if (pEmail) {
          await supabase.auth.signInWithOtp({ email: pEmail });
        }
      }

      return {
        success: false,
        needsOtp: true,
        matches: matchedIds.length,
        error:
          "Un code de vérification a été envoyé aux adresses email correspondantes. Entrez le code reçu",
      };
    }

    // OTP fourni → vérifier le code contre chaque email candidate.
    // Supabase génère un OTP unique par email, donc un seul peut matcher.
    // On vérifie que la session créée par verifyOtp correspond bien au profile_id attendu.
    if (matchedIds.length > 1 && dob && otp_code) {
      let verified = false;
      for (const p of matchedIds) {
        const { data: pEmail } = await admin.rpc(
          "resolve_email_by_profile_id",
          { p_profile_id: p.id }
        );
        if (!pEmail) continue;

        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          email: pEmail,
          token: otp_code,
          type: "email",
        });
        if (!otpError && otpData?.user?.id === p.id) {
          // OTP valide ET le user Supabase Auth correspond au profil attendu
          email = pEmail;
          verified = true;
          await supabase.auth.signOut();
          break;
        }
      }

      if (!verified) {
        return {
          success: false,
          needsOtp: true,
          error: "Code invalide ou expiré. Réessayez",
        };
      }
    }

    // 1 seul résultat
    if (matchedIds.length === 1 && !email) {
      const { data: resolvedEmail } = await admin.rpc(
        "resolve_email_by_profile_id",
        { p_profile_id: matchedIds[0].id }
      );
      email = resolvedEmail ?? null;
    }
  }

  if (!email) {
    return {
      success: false,
      error: "Impossible de résoudre votre identifiant",
    };
  }

  // ─── Étape B — Authentification Supabase Auth ───

  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    // Log tentative échouée (IP + type d'identifiant, jamais le mot de passe)
    const ip = await getClientIp();
    console.warn(
      `[login:failed] ip=${ip} type=${type} identifier=${identifier.slice(0, 3)}*** reason=${authError.message}`
    );

    if (authError.message.includes("Invalid login credentials")) {
      return { success: false, error: "Identifiant ou mot de passe incorrect" };
    }
    return { success: false, error: "Erreur de connexion. Réessayez" };
  }

  // ─── Étape C — Vérification du statut (Critique) ───

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Erreur de connexion. Réessayez" };
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Profil introuvable. Contactez un administrateur",
    };
  }

  switch (profile.status) {
    case "pending":
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Votre compte est en attente de validation par un administrateur",
      };
    case "suspended":
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Votre compte a été suspendu. Contactez un administrateur",
      };
    case "deactivated":
      await supabase.auth.signOut();
      return {
        success: false,
        error:
          "Votre compte est désactivé. Contactez un administrateur pour le réactiver",
      };
    case "active":
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);
      break;
    default:
      await supabase.auth.signOut();
      return { success: false, error: "Statut de compte inconnu" };
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/login");
}
