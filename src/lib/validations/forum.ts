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
