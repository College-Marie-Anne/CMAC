import { z } from "zod";

const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/i;

export const promoCandidacySchema = z.object({
  pitch: z
    .string()
    .max(300, "Votre présentation ne doit pas dépasser 300 caractères")
    .optional(),
});

// Édition d'une promotion par un admin (spec §202-211).
// Limites : nom 1-150 (spec §1372), années cohérentes (start <= end).
export const updatePromotionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Le nom est requis")
      .max(150, "Le nom doit faire 150 caractères maximum")
      .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
    start_date: z
      .number()
      .int("Année invalide")
      .min(1900, "Année trop ancienne")
      .max(2100, "Année trop lointaine"),
    end_date: z
      .number()
      .int("Année invalide")
      .min(1900, "Année trop ancienne")
      .max(2100, "Année trop lointaine"),
  })
  .refine((v) => v.start_date <= v.end_date, {
    message: "L'année de début doit être ≤ l'année de fin",
    path: ["end_date"],
  });

export type UpdatePromotionData = z.infer<typeof updatePromotionSchema>;
