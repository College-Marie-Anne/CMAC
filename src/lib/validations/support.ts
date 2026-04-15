import { z } from "zod";

// Regex XSS basique — bannir balises HTML et URI schemes dangereux
const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/i;

export const SUPPORT_CATEGORIES = [
  "profile_modification",
  "promo_issue",
  "account_reactivation",
  "bug_report",
  "other",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  profile_modification: "Modification de mon profil",
  promo_issue: "Problème de promotion",
  account_reactivation: "Réactivation de mon compte",
  bug_report: "Signalement d'un bug",
  other: "Autre",
};

// Spec §1381-1383 : subject 5-150, message 20-2000
export const supportTicketSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES, {
    message: "Choisissez une catégorie",
  }),
  subject: z
    .string()
    .trim()
    .min(5, "Le sujet doit contenir au moins 5 caractères")
    .max(150, "Le sujet doit faire 150 caractères maximum")
    .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
  message: z
    .string()
    .trim()
    .min(20, "Le message doit contenir au moins 20 caractères")
    .max(2000, "Le message doit faire 2000 caractères maximum")
    .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
});

export type SupportTicketData = z.infer<typeof supportTicketSchema>;
