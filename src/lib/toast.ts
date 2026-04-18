import { toast } from "sonner";

/**
 * Helpers toast unifiés pour les actions serveur.
 *
 * Pattern de base :
 *   const res = await someServerAction(input);
 *   toastActionResult(res, { success: "Message envoyé" });
 *
 * Cas d'usage :
 *   - `success` : toast vert si res.success === true
 *   - `error`   : toast rouge avec res.error si res.success === false
 *   - message de succès optionnel (si pas fourni, pas de toast sur succès)
 *
 * Compatible avec le `ActionResult` type utilisé dans /src/actions/* :
 *   { success: boolean; error?: string; data?: unknown }
 */

export type ServerActionResult = {
  success: boolean;
  error?: string;
  [key: string]: unknown;
};

type ToastOptions = {
  /** Message à afficher si succès. Si omis, pas de toast sur succès. */
  success?: string;
  /** Message à afficher si erreur sans détail. Si omis, utilise res.error. */
  fallbackError?: string;
};

/**
 * Émet un toast selon le résultat d'une server action.
 * Retourne le même `res` pour permettre le chaînage.
 */
export function toastActionResult<T extends ServerActionResult>(
  res: T,
  opts: ToastOptions = {}
): T {
  if (res.success) {
    if (opts.success) toast.success(opts.success);
  } else {
    toast.error(
      res.error || opts.fallbackError || "Un problème est survenu. Réessayez."
    );
  }
  return res;
}

/** Re-export direct de `toast` pour usage custom. */
export { toast };
