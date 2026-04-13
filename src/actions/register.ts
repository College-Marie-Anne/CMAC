"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { RegisterFormData } from "@/lib/validations/register";
import { registerLimiter, checkRateLimit, sanitizeIp } from "@/lib/rate-limit";

export type RegisterResult = {
  success: boolean;
  error?: string;
};

export async function registerAction(
  data: RegisterFormData
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

  const supabase = await createClient();
  const { step1, step2_type, step2_alumni, step2_s4, step2_student, step3 } =
    data;

  // ─── 1. Vérifier unicité username ───

  const { data: existingUser } = await supabase
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
      // Créer une promo pending
      const { data: newPromo, error: promoError } = await supabase
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
        return {
          success: false,
          error: "Erreur lors de la création de la promotion",
        };
      }
      promoId = newPromo.id;
    } else {
      // Promo existante
      const { data: promo } = await supabase
        .from("promotions")
        .select("id")
        .eq("name", step2_alumni.promotion_name)
        .maybeSingle();
      promoId = promo?.id ?? null;
    }
  } else if (step2_type === "s4" && step2_s4) {
    const { data: promo } = await supabase
      .from("promotions")
      .select("id")
      .eq("name", step2_s4.promotion_name)
      .maybeSingle();
    promoId = promo?.id ?? null;
  }

  // ─── 3. Créer le compte Supabase Auth ───

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: step3.email,
    password: step3.password,
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes("already registered")) {
      return { success: false, error: "Cet email est déjà utilisé" };
    }
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

    // Bounds check : enrollment doit être réaliste (1980 → année courante + 1)
    if (enrollment < 1980 || enrollment > currentYear + 1) {
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

  // ─── 6. Créer le profil ───

  const { error: profileError } = await supabase.from("profiles").insert({
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
    status: "pending",
    is_profile_complete: true,
    accepted_terms_at: new Date().toISOString(),
    terms_version: "1.0",
  });

  if (profileError) {
    // Cleanup : supprimer le user Auth orphelin si le profil échoue en utilisant l'admin client
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.deleteUser(userId);
      console.error(
        `[register] Profil INSERT échoué pour auth user ${userId}. ` +
        `User Auth supprimé via adminClient. Erreur: ${profileError.message}`
      );
    } catch (cleanupErr) {
      console.error(
        `[register] Échec suppression admin pour auth user ${userId}:`,
        cleanupErr
      );
    }
    return { success: false, error: "Erreur lors de la création du profil" };
  }

  // ─── 7. Insérer les données liées ───

  const insertErrors: string[] = [];

  // Activités parascolaires
  const activities =
    step2_type === "alumni"
      ? step2_alumni?.activities
      : step2_type === "s4"
        ? step2_s4?.activities
        : step2_student?.activities;

  if (activities && activities.length > 0) {
    const { error } = await supabase.from("profile_activities").insert(
      activities.map((activityId) => ({
        profile_id: userId,
        activity_id: activityId,
      }))
    );
    if (error) insertErrors.push("activités parascolaires");
  }

  // Parcours académique (alumni uniquement)
  if (step2_type === "alumni" && step2_alumni) {
    const { error: eduError } = await supabase.from("user_education").insert({
      profile_id: userId,
      institution_type: step2_alumni.institution_type,
      institution_name: step2_alumni.institution_name,
      study_field: step2_alumni.study_field,
      degree_level: step2_alumni.degree_level || null,
      start_year: step2_alumni.start_year || null,
      end_year: step2_alumni.end_year || null,
    });
    if (eduError) insertErrors.push("parcours académique");

    // Métier actuel
    const { error: jobError } = await supabase
      .from("user_professions")
      .insert({
        profile_id: userId,
        title: step2_alumni.job_title,
        company: step2_alumni.job_company || null,
        is_current: true,
      });
    if (jobError) insertErrors.push("métier actuel");
  }

  // Domaines d'études désirés (S4 et S1-S3)
  const desiredFields =
    step2_type === "s4"
      ? step2_s4?.desired_study_fields
      : step2_type === "student"
        ? step2_student?.desired_study_fields
        : null;

  if (desiredFields && desiredFields.length > 0) {
    const { error } = await supabase.from("desired_study_fields").insert(
      desiredFields.map((field) => ({
        profile_id: userId,
        field_name: field,
      }))
    );
    if (error) insertErrors.push("domaines d'études");
  }

  // Si des INSERT secondaires ont échoué :
  // 1. Marquer le profil comme incomplet (visible dans le dashboard admin)
  // 2. Logger l'erreur pour investigation
  // Le profil est créé, l'admin voit le flag et peut compléter les données
  if (insertErrors.length > 0) {
    console.error(
      `[register] Données partielles pour ${userId}: échec INSERT ${insertErrors.join(", ")}`
    );

    await supabase
      .from("profiles")
      .update({ registration_incomplete: true })
      .eq("id", userId);

    // Note : on ne bloque PAS l'inscription. Le profil existe,
    // les données manquantes seront ajoutées par l'admin ou l'utilisatrice.
    // Le flag registration_incomplete est visible dans /admin/users/[id].
  }

  // ─── 8. Déconnexion (le compte est pending) ───

  await supabase.auth.signOut();

  // ─── 9. Redirection vers la page d'attente ───

  revalidatePath("/admin/approvals");
  redirect("/pending");
}
