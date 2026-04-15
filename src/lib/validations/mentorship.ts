import { z } from "zod";

export const mentorshipRequestSchema = z.object({
  study_field: z.string().min(2, "Veuillez préciser le domaine d'études désiré"),
  message: z
    .string()
    .min(10, "Votre message doit contenir au moins 10 caractères")
    .max(1000, "Votre message est trop long (max 1000 caractères)"),
  mentor_id: z.string().uuid("ID de mentor invalide").nullable().optional(),
});
