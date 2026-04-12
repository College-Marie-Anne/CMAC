import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(3, "Minimum 3 caractères")
    .max(200, "Identifiant trop long"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ")
    .optional(),
  otp_code: z
    .string()
    .regex(/^\d{6}$/, "Le code doit contenir 6 chiffres")
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Détecte le type d'identifiant selon les specs :
 * - Contient `@` → email
 * - Alphanumérique + underscore uniquement → username
 * - Contient des espaces → nom complet
 */
export function detectIdentifierType(
  identifier: string
): "email" | "username" | "fullname" {
  if (identifier.includes("@")) return "email";
  if (/^[a-zA-Z0-9_]+$/.test(identifier)) return "username";
  return "fullname";
}
