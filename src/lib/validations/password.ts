import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm_password: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// Changement de mot de passe pour une utilisatrice déjà connectée (spec §161).
// Requiert l'ancien mot de passe en plus → vérification via signInWithPassword
// avant updateUser({ password }) pour empêcher un attaquant ayant volé une
// session de changer le mot de passe sans le connaître.
export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "L'ancien mot de passe est requis"),
    password: z
      .string()
      .min(8, "Minimum 8 caractères")
      .regex(/[A-Z]/, "Au moins une majuscule")
      .regex(/[a-z]/, "Au moins une minuscule")
      .regex(/[0-9]/, "Au moins un chiffre"),
    confirm_password: z.string().min(1, "Confirmez le mot de passe"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  })
  .refine((data) => data.old_password !== data.password, {
    message: "Le nouveau mot de passe doit être différent de l'ancien",
    path: ["password"],
  });

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;
