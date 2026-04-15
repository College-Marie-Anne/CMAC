import { z } from "zod";

// Regex XSS basique (aligné avec register.ts) — on interdit les balises HTML
// et les URI schemes dangereux dans le motif de signalement.
const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/i;

// Type de cible d'un report. Exactement un seul des 4 IDs doit être renseigné.
export const reportTargetSchema = z
  .object({
    reported_user_id: z.string().uuid().nullable().optional(),
    reported_post_id: z.string().uuid().nullable().optional(),
    reported_comment_id: z.string().uuid().nullable().optional(),
    reported_message_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) => {
      const filled = [
        v.reported_user_id,
        v.reported_post_id,
        v.reported_comment_id,
        v.reported_message_id,
      ].filter(Boolean).length;
      return filled === 1;
    },
    { message: "Un seul type de cible peut être signalé à la fois" }
  );

export const reportSchema = z
  .object({
    reason: z
      .string()
      .min(10, "Le motif doit contenir au moins 10 caractères")
      .max(500, "Le motif doit faire 500 caractères maximum")
      .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
    reported_user_id: z.string().uuid().nullable().optional(),
    reported_post_id: z.string().uuid().nullable().optional(),
    reported_comment_id: z.string().uuid().nullable().optional(),
    reported_message_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) => {
      const filled = [
        v.reported_user_id,
        v.reported_post_id,
        v.reported_comment_id,
        v.reported_message_id,
      ].filter(Boolean).length;
      return filled === 1;
    },
    { message: "Un seul type de cible peut être signalé à la fois" }
  );

export type ReportData = z.infer<typeof reportSchema>;

export const blockUserSchema = z.object({
  user_id: z.string().uuid("ID utilisateur invalide"),
});

export type BlockUserData = z.infer<typeof blockUserSchema>;
