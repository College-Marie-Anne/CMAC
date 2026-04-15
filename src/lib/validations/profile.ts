import { z } from "zod";

export const updateBioSchema = z.object({
  bio: z.string().max(500, "Maximum 500 caractères").nullable(),
});
export type UpdateBioData = z.infer<typeof updateBioSchema>;

export const addEducationSchema = z.object({
  institution_type: z.enum(["university", "professional_school", "other"], "Type requis"),
  institution_name: z.string().min(1, "Nom requis").max(200),
  study_field: z.string().min(1, "Domaine requis").max(150),
  degree_level: z.string().max(100).optional(),
  start_year: z.coerce.number().int().min(1950).max(2100).optional(),
  end_year: z.coerce.number().int().min(1950).max(2100).optional(),
});
export type AddEducationData = z.infer<typeof addEducationSchema>;

export const addProfessionSchema = z.object({
  title: z.string().min(1, "Titre requis").max(150),
  company: z.string().max(200).optional(),
  is_current: z.boolean(),
});
export type AddProfessionData = z.infer<typeof addProfessionSchema>;

export const updateDesiredFieldsSchema = z.object({
  fields: z
    .array(z.string().min(1).max(150))
    .max(3, "Maximum 3 domaines"),
});
export type UpdateDesiredFieldsData = z.infer<typeof updateDesiredFieldsSchema>;

export const deactivateAccountSchema = z.object({
  confirmation: z.literal("DÉSACTIVER", "Tapez DÉSACTIVER pour confirmer"),
});
export type DeactivateAccountData = z.infer<typeof deactivateAccountSchema>;

export const updateThemeSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
});
export type UpdateThemeData = z.infer<typeof updateThemeSchema>;

// ─── Activités parascolaires ───
// Un tableau d'UUIDs d'activités (table `activities`).
// Max 20 (filet de sécurité — en pratique l'admin définit ~10 activités).
export const updateActivitiesSchema = z.object({
  activity_ids: z.array(z.string().uuid()).max(20, "Maximum 20 activités"),
});
export type UpdateActivitiesData = z.infer<typeof updateActivitiesSchema>;

// ─── Préférences de notification ───
// Tous les types de notification que l'utilisatrice peut désactiver.
// Les notifications admin/account_*/promo_rejected/invitation_used/post_pinned/
// support_reply sont TOUJOURS envoyées (spec §488) et n'apparaissent pas ici.
export const updateNotificationPrefsSchema = z.object({
  dm: z.boolean(),
  forum_reply: z.boolean(),
  forum_comment_reply: z.boolean(),
  reaction: z.boolean(),
  mention: z.boolean(),
  mentorship: z.boolean(),
  mentorship_completed: z.boolean(),
  election: z.boolean(),
  new_opportunity: z.boolean(),
  push_enabled: z.boolean(),
});
export type UpdateNotificationPrefsData = z.infer<typeof updateNotificationPrefsSchema>;
