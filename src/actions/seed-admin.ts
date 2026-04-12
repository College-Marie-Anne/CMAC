"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Seed one-shot du super-admin LakouSystems.
 * À exécuter une seule fois puis supprimer ce fichier.
 *
 * Required env vars:
 *   SEED_ADMIN_EMAIL — email du super-admin
 *   SEED_ADMIN_PASSWORD — mot de passe initial du super-admin
 */
export async function seedSuperAdmin(): Promise<{
  success: boolean;
  error?: string;
}> {
  const seedEmail = process.env.SEED_ADMIN_EMAIL;
  const seedPassword = process.env.SEED_ADMIN_PASSWORD;

  if (!seedEmail || !seedPassword) {
    return {
      success: false,
      error:
        "Variables SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD manquantes dans .env.local",
    };
  }

  const supabase = await createClient();

  // Vérifier si déjà créé
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", "LakouSystems")
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Super-admin déjà créé" };
  }

  // Créer le user Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: seedEmail,
    password: seedPassword,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: authError?.message || "Erreur création auth",
    };
  }

  const userId = authData.user.id;

  // Créer le profil super-admin
  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    username: "LakouSystems",
    first_name: "Lakou",
    last_name: "Systems",
    date_of_birth: "2000-01-01",
    nationality: ["Haïtienne"],
    country: "Haïti",
    role: "admin",
    status: "active",
    is_super_admin: true,
    is_profile_complete: true,
    must_change_password: false,
    accepted_terms_at: new Date().toISOString(),
    terms_version: "1.0",
  });

  if (profileError) {
    return {
      success: false,
      error: profileError.message,
    };
  }

  // Déconnecter (ce seed ne doit pas laisser une session active)
  await supabase.auth.signOut();

  return { success: true };
}
