import { z } from "zod";

export const promoCandidacySchema = z.object({
  pitch: z
    .string()
    .max(300, "Votre présentation ne doit pas dépasser 300 caractères")
    .optional(),
});
