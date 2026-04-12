import { z } from "zod";

// Regex XSS renforcée :
// - Rejette < > (balises HTML)
// - Rejette javascript: et data: (URI schemes dangereux)
// - Rejette les séquences d'échappement unicode \u et \x (obfuscation)
// - Rejette les accolades et backticks (template injection)
const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=|\\u[0-9a-f]{4}|\\x[0-9a-f]{2}/i;

const textField = (min: number, max: number) =>
  z
    .string()
    .min(min, `Minimum ${min} caractère${min > 1 ? "s" : ""}`)
    .max(max, `Maximum ${max} caractères`)
    .refine((val) => !XSS_BLOCKLIST.test(val), "Caractères non autorisés");

// ─── Étape 1 — Profil de base ───

export const step1Schema = z.object({
  first_name: textField(1, 100),
  last_name: textField(1, 100),
  date_of_birth: z.string().min(1, "Date de naissance requise"),
  nationality: z
    .array(z.string().min(1).max(100))
    .min(1, "Au moins une nationalité requise")
    .max(5, "Maximum 5 nationalités"),
  country: textField(1, 100),
  status_type: z.enum(["ancienne", "eleve_actuelle"], "Sélectionnez votre statut"),
});

export type Step1Data = z.infer<typeof step1Schema>;

// ─── Étape 2A — Branche Alumni ───

export const step2AlumniSchema = z.object({
  promotion_name: z.string().min(1, "Promotion requise").max(150),
  is_new_promo: z.boolean(),
  promo_start_date: z.coerce.number().int().min(1980, "Année invalide").max(new Date().getFullYear() + 10, "Année invalide"),
  filiere: z.enum(
    ["SVT", "SES", "SMP", "Section A", "Section B", "Section C", "Section D"],
    "Filière requise"
  ),
  activities: z.array(z.string()),
  institution_type: z.enum(
    ["university", "professional_school", "other"],
    "Type d'institution requis"
  ),
  institution_name: textField(1, 200),
  study_field: textField(1, 150),
  degree_level: z.string().max(100).optional(),
  start_year: z.coerce.number().int().min(1950).max(2100).optional(),
  end_year: z.coerce.number().int().min(1950).max(2100).optional(),
  job_title: textField(1, 150),
  job_company: z.string().max(200).optional(),
});

export type Step2AlumniData = z.infer<typeof step2AlumniSchema>;

// ─── Étape 2B — Branche S4 ───

export const step2S4Schema = z.object({
  promotion_name: z.string().min(1, "Promotion requise").max(150),
  promo_start_date: z.coerce.number().int().min(1980, "Année invalide").max(new Date().getFullYear() + 10, "Année invalide"),
  filiere: z.enum(
    ["SVT", "SES", "SMP", "Section A", "Section B", "Section C", "Section D"],
    "Filière requise"
  ),
  activities: z.array(z.string()),
  desired_study_fields: z
    .array(z.string().min(1).max(150))
    .min(1, "Au moins un domaine requis")
    .max(3, "Maximum 3 domaines"),
});

export type Step2S4Data = z.infer<typeof step2S4Schema>;

// ─── Étape 2C — Branche S1-S3 ───

export const step2StudentSchema = z.object({
  class: z.enum(["S1", "S2", "S3"], "Classe requise"),
  enrollment_date: z.coerce.number().int().min(1980, "Année invalide").max(new Date().getFullYear() + 10, "Année invalide"),
  activities: z.array(z.string()),
  desired_study_fields: z
    .array(z.string().min(1).max(150))
    .min(1, "Au moins un domaine requis")
    .max(3, "Maximum 3 domaines"),
});

export type Step2StudentData = z.infer<typeof step2StudentSchema>;

// ─── Sous-sélection élève actuelle ───

export const eleveSubTypeSchema = z.object({
  sub_type: z.enum(["s4", "s1_s3"], "Sélectionnez votre classe"),
});

export type EleveSubTypeData = z.infer<typeof eleveSubTypeSchema>;

// ─── Étape 3 — Création du compte ───

export const step3Schema = z
  .object({
    username: z
      .string()
      .min(3, "Minimum 3 caractères")
      .max(20, "Maximum 20 caractères")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Seuls les lettres, chiffres et underscores sont autorisés"
      ),
    email: z.string().email("Email invalide"),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm_password: z.string().min(1, "Confirmez le mot de passe"),
    accept_terms: z.literal(true, "Vous devez accepter les CGU"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

export type Step3Data = z.infer<typeof step3Schema>;

// ─── Type global ───

export type RegisterFormData = {
  step1: Step1Data;
  step2_type: "alumni" | "s4" | "student";
  step2_alumni?: Step2AlumniData;
  step2_s4?: Step2S4Data;
  step2_student?: Step2StudentData;
  step3: Step3Data;
};

// ─── Constantes ───

export const FILIERES = [
  "SVT",
  "SES",
  "SMP",
  "Section A",
  "Section B",
  "Section C",
  "Section D",
] as const;

export const CLASSES = ["S1", "S2", "S3"] as const;

export const INSTITUTION_TYPES = [
  { value: "university", label: "Université" },
  { value: "professional_school", label: "École professionnelle" },
  { value: "other", label: "Autre" },
] as const;
