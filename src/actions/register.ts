"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { RegisterFormData } from "@/lib/validations/register";
import { registerLimiter, checkRateLimit, sanitizeIp } from "@/lib/rate-limit";
import { sendWelcomeEmail } from "@/lib/emails/welcome";

export type RegisterResult = {
  success: boolean;
  error?: string;
};

/**
 * Reconstruit l'origine de la requête (ex: https://cmaconnect.app).
 * Priorité : NEXT_PUBLIC_SITE_URL env var > x-forwarded-* headers > host header.
 * Utilisé pour `emailRedirectTo` de signUp → le lien dans l'email pointera
 * vers notre domaine réel (pas celui du projet Supabase).
 */
function resolveOrigin(h: Headers): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto = h.get("x-forwarded-proto") ?? "https";
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function registerAction(
  data: RegisterFormData,
  invitationToken?: string
): Promise<RegisterResult> {
  // Rate limit by IP — 3 per hour
  const h = await headers();
  const ip = sanitizeIp(h.get("x-forwarded-for") ?? h.get("x-real-ip"));
  const { allowed, resetAt } = await checkRateLimit(registerLimiter, ip);
  if (!allowed) {
    const seconds = Math.ceil((resetAt - Date.now()) / 1000);
    return {
      success: false,
      error: `Trop de tentatives d'inscription. Réessayez dans ${Math.ceil(seconds / 60)} min`,
    };
  }

  const origin = resolveOrigin(h);
  const supabase = await createClient();
  // Admin client obligatoire pour les INSERTs ci-dessous : après signUp avec
  // confirmation email activée, l'utilisatrice N'EST PAS authentifiée (pas de
  // session tant que l'email n'est pas confirmé). Les policies RLS
  // `auth.uid() = id` échoueraient avec le client normal.
  const admin = createAdminClient();

  const { step1, step2_type, step2_alumni, step2_s4, step2_student, step3 } =
    data;

  // ─── 0. Validation token d'invitation (si fourni) ───
  //
  // Avec un token valide, le compte est pré-approuvé → status: 'active'
  // au lieu de 'pending' (spec §134).

  let inviteValid = false;
  if (invitationToken) {
    // Validation UUID format avant RPC
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(invitationToken)) {
      return { success: false, error: "Lien d'invitation invalide" };
    }

    const { data: validation, error: valErr } = await supabase.rpc(
      "validate_invitation_token",
      { p_token: invitationToken }
    );
    if (valErr) {
      console.error("[register] validate_invitation_token failed", valErr);
      return { success: false, error: "Erreur de validation du lien d'invitation" };
    }
    const result = Array.isArray(validation) ? validation[0] : validation;
    if (!result?.valid) {
      const reasonMsg: Record<string, string> = {
        not_found: "Lien d'invitation introuvable",
        revoked: "Ce lien d'invitation a été révoqué",
        used: "Ce lien d'invitation a déjà été utilisé",
        expired: "Ce lien d'invitation a expiré",
      };
      return {
        success: false,
        error: reasonMsg[result?.reason ?? ""] ?? "Lien d'invitation invalide",
      };
    }
    inviteValid = true;
  }

  // ─── 1. Vérifier unicité username ───

  const { data: existingUser } = await admin
    .from("profiles")
    .select("id")
    .eq("username", step3.username)
    .maybeSingle();

  if (existingUser) {
    return { success: false, error: "Ce username est déjà pris" };
  }

  // ─── 2. Résoudre ou créer la promotion ───

  let promoId: string | null = null;

  if (step2_type === "alumni" && step2_alumni) {
    if (step2_alumni.is_new_promo) {
      // Créer une promo pending (admin client car user pas encore authentifié)
      const { data: newPromo, error: promoError } = await admin
        .from("promotions")
        .insert({
          name: step2_alumni.promotion_name,
          start_date: step2_alumni.promo_start_date,
          end_date: step2_alumni.promo_start_date, // Sera corrigé par l'admin
          status: "pending",
        })
        .select("id")
        .single();

      if (promoError) {
        console.error("[register] promotion insert failed:", promoError);
        return {
          success: false,
          error: "Erreur lors de la création de la promotion",
        };
      }
      promoId = newPromo.id;
    } else {
      const { data: promo } = await admin
        .from("promotions")
        .select("id")
        .eq("name", step2_alumni.promotion_name)
        .maybeSingle();
      promoId = promo?.id ?? null;
    }
  } else if (step2_type === "s4" && step2_s4) {
    const { data: promo } = await admin
      .from("promotions")
      .select("id")
      .eq("name", step2_s4.promotion_name)
      .maybeSingle();
    promoId = promo?.id ?? null;
  }

  // ─── 3. Créer le compte Supabase Auth ───
  //
  // `emailRedirectTo` est indispensable : sans lui, Supabase utilise le Site URL
  // du projet, qui peut pointer vers un mauvais domaine. On force la redirection
  // vers notre callback PKCE qui échange le code contre une session puis redirige
  // vers /login?verified=1.

  // `next` doit être URL-encoded : sans ça, "?verified=1" serait parsé comme un
  // param top-level séparé par le callback et la query serait perdue.
  const nextPath = inviteValid ? "/login?invited=1" : "/login?verified=1";
  const emailRedirect = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: step3.email,
    password: step3.password,
    options: {
      emailRedirectTo: emailRedirect,
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }
    console.error("[register] signUp failed:", authError);
    return { success: false, error: "Erreur lors de la création du compte" };
  }

  const userId = authData.user.id;

  // ─── 4. Déterminer le rôle ───

  const role =
    step2_type === "alumni"
      ? "alumni"
      : step2_type === "s4"
        ? "s4"
        : "student";

  // ─── 5. Calculer expected_end_date pour S1-S3 ───

  let expectedEndDate: number | null = null;
  if (step2_type === "student" && step2_student) {
    const currentYear = new Date().getFullYear();
    const enrollment = step2_student.enrollment_date;

    if (enrollment < 1980 || enrollment > currentYear + 1) {
      // Cleanup : user créé mais données invalides
      await admin.auth.admin.deleteUser(userId);
      return { success: false, error: "Année d'entrée au collège invalide" };
    }

    const yearsToAdd =
      step2_student.class === "S1"
        ? 3
        : step2_student.class === "S2"
          ? 2
          : 1;
    expectedEndDate = enrollment + yearsToAdd;
  }

  // ─── 6. Créer le profil (admin client → bypass RLS) ───

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    username: step3.username,
    first_name: step1.first_name,
    last_name: step1.last_name,
    date_of_birth: step1.date_of_birth,
    nationality: step1.nationality,
    country: step1.country,
    role,
    class: step2_type === "student" ? step2_student?.class : null,
    filiere:
      step2_type === "alumni"
        ? step2_alumni?.filiere
        : step2_type === "s4"
          ? step2_s4?.filiere
          : null,
    enrollment_date:
      step2_type === "student" ? step2_student?.enrollment_date : null,
    promo_id: promoId,
    promo_start_date:
      step2_type === "alumni"
        ? step2_alumni?.promo_start_date
        : step2_type === "s4"
          ? step2_s4?.promo_start_date
          : null,
    expected_end_date: expectedEndDate,
    // Invitation valide → pré-approuvé 'active', sinon 'pending' (spec §134)
    status: inviteValid ? "active" : "pending",
    is_profile_complete: true,
    accepted_terms_at: new Date().toISOString(),
    terms_version: "1.0",
  });

  if (profileError) {
    // Cleanup auth user orphelin → le token email devient invalide mais l'UX
    // affiche "inscription a échoué", cohérent avec l'état réel.
    console.error(
      `[register] Profil INSERT échoué pour auth user ${userId}. Erreur:`,
      profileError
    );
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch (cleanupErr) {
      console.error(
        `[register] Échec suppression admin pour auth user ${userId}:`,
        cleanupErr
      );
    }
    return { success: false, error: "Erreur lors de la création du profil" };
  }

  // ─── 7. Insérer les données liées (admin client) ───

  const insertErrors: string[] = [];

  // Activités parascolaires
  const activities =
    step2_type === "alumni"
      ? step2_alumni?.activities
      : step2_type === "s4"
        ? step2_s4?.activities
        : step2_student?.activities;

  if (activities && activities.length > 0) {
    const { error } = await admin.from("profile_activities").insert(
      activities.map((activityId) => ({
        profile_id: userId,
        activity_id: activityId,
      }))
    );
    if (error) {
      console.error("[register] profile_activities insert failed:", error);
      insertErrors.push("activités parascolaires");
    }
  }

  // Parcours académique (alumni uniquement)
  if (step2_type === "alumni" && step2_alumni) {
    const { error: eduError } = await admin.from("user_education").insert({
      profile_id: userId,
      institution_type: step2_alumni.institution_type,
      institution_name: step2_alumni.institution_name,
      study_field: step2_alumni.study_field,
      degree_level: step2_alumni.degree_level || null,
      start_year: step2_alumni.start_year || null,
      end_year: step2_alumni.end_year || null,
    });
    if (eduError) {
      console.error("[register] user_education insert failed:", eduError);
      insertErrors.push("parcours académique");
    }

    // Métier actuel
    const { error: jobError } = await admin
      .from("user_professions")
      .insert({
        profile_id: userId,
        title: step2_alumni.job_title,
        company: step2_alumni.job_company || null,
        is_current: true,
      });
    if (jobError) {
      console.error("[register] user_professions insert failed:", jobError);
      insertErrors.push("métier actuel");
    }
  }

  // Domaines d'études désirés (S4 et S1-S3)
  const desiredFields =
    step2_type === "s4"
      ? step2_s4?.desired_study_fields
      : step2_type === "student"
        ? step2_student?.desired_study_fields
        : null;

  if (desiredFields && desiredFields.length > 0) {
    const { error } = await admin.from("desired_study_fields").insert(
      desiredFields.map((field) => ({
        profile_id: userId,
        field_name: field,
      }))
    );
    if (error) {
      console.error("[register] desired_study_fields insert failed:", error);
      insertErrors.push("domaines d'études");
    }
  }

  // Si des INSERT secondaires ont échoué :
  // 1. Marquer le profil comme incomplet (visible dans le dashboard admin)
  // 2. Logger l'erreur pour investigation
  if (insertErrors.length > 0) {
    console.error(
      `[register] Données partielles pour ${userId}: échec INSERT ${insertErrors.join(", ")}`
    );

    await admin
      .from("profiles")
      .update({ registration_incomplete: true })
      .eq("id", userId);

    // Note : on ne bloque PAS l'inscription. Le profil existe.
  }

  // ─── 8. Consommer le token d'invitation (si flow d'invitation) ───

  if (inviteValid && invitationToken) {
    const { data: consumed, error: consumeErr } = await admin.rpc(
      "consume_invitation_token",
      { p_token: invitationToken, p_user_id: userId }
    );
    if (consumeErr || consumed === false) {
      console.error(
        `[register] consume_invitation_token failed for ${userId}:`,
        consumeErr ?? "returned false (token race/invalid)"
      );
      // On n'échoue pas l'inscription.
    }
  }

  // ─── 9. Email de bienvenue (non bloquant) ───

  sendWelcomeEmail({
    to: step3.email,
    firstName: step1.first_name,
  });

  // ─── 10. Déconnexion (sécurité — pas de session locale après signUp) ───

  await supabase.auth.signOut();

  // ─── 11. Redirection selon le flow ───

  if (inviteValid) {
    revalidatePath("/admin/invitations");
    redirect("/login?invited=1");
  }

  revalidatePath("/admin/approvals");
  redirect("/pending");
}
