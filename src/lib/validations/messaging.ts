import { z } from "zod";

// Regex XSS basique — bannit balises HTML et URI schemes dangereux
// (aligné avec support.ts / moderation.ts).
const XSS_BLOCKLIST = /[<>{}`]|javascript\s*:|data\s*:|vbscript\s*:|on\w+\s*=/i;

// Format attendu pour `image_url` côté DM : path interne du bucket Supabase
// `dm-images/{userId}/{uuid}.{ext}` (sans le préfixe bucket — juste le path
// stocké en DB). Pas d'URL absolue, pas de traversal.
const STORAGE_PATH_REGEX = /^[A-Za-z0-9._\-/]{3,256}$/;

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Le message est requis")
    .max(1000, "Maximum 1000 caractères")
    .refine((v) => !XSS_BLOCKLIST.test(v), "Caractères non autorisés"),
  image_url: z
    .string()
    .regex(STORAGE_PATH_REGEX, "Chemin d'image invalide")
    .refine((v) => !v.includes(".."), "Chemin invalide")
    .nullable()
    .optional(),
});

export type SendMessageData = z.infer<typeof sendMessageSchema>;
