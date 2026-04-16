import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(2000, "Maximum 2000 caractères"),
  tag_id: z.string().uuid("Tag requis"),
  image_url: z.string().url().nullable().optional(),
  promo_id: z.string().uuid().nullable().optional(),
});

export type CreatePostData = z.infer<typeof createPostSchema>;

export const editPostSchema = z.object({
  content: z
    .string()
    .min(1, "Le contenu est requis")
    .max(2000, "Maximum 2000 caractères"),
});

export type EditPostData = z.infer<typeof editPostSchema>;

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Le commentaire est requis")
    .max(500, "Maximum 500 caractères"),
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
});

export type CreateCommentData = z.infer<typeof createCommentSchema>;

export const editCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Le commentaire est requis")
    .max(500, "Maximum 500 caractères"),
});

export type EditCommentData = z.infer<typeof editCommentSchema>;

// XSS blocklist (aligné avec support.ts / moderation.ts)
const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/i;

// Spec §1370-1371 — tag forum :
//   name : 1-50 caractères
//   color : format hex #RGB / #RRGGBB / #RRGGBBAA (4-9 chars)
export const tagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis")
    .max(50, "Le nom doit faire 50 caractères maximum")
    .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
  color: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3}([0-9A-Fa-f]{2})?)?$/,
      "Couleur hex invalide (ex: #D4A017)"
    ),
});

export type TagData = z.infer<typeof tagSchema>;
