import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Le message est requis")
    .max(1000, "Maximum 1000 caractères"),
  image_url: z.string().url().nullable().optional(),
});

export type SendMessageData = z.infer<typeof sendMessageSchema>;
