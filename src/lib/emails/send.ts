import { Resend } from "resend";
import { env } from "@/lib/env";

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  /** Pour identifier l'erreur dans les logs (ex: "welcome", "account-approved"). */
  label: string;
};

/**
 * Helper centralisé pour envoyer des emails transactionnels via Resend.
 *
 * Pourquoi ce helper existe :
 * Le SDK Resend v3+ retourne { data, error } — il NE THROW PAS en cas
 * d'échec d'envoi (domaine non vérifié, quota dépassé, destinataire invalide,
 * etc.). Si on fait juste `await resend.emails.send(...)` dans un try/catch,
 * les erreurs Resend sont ignorées silencieusement et les emails ne partent
 * jamais sans qu'on le sache.
 *
 * Ce helper :
 *   - Short-circuit si RESEND_API_KEY est absent (dev local) + warn
 *   - Utilise `env.emailFrom` (configurable via env var EMAIL_FROM)
 *   - Lit et LOG proprement la propriété `error` du retour Resend
 *   - Encapsule aussi un try/catch pour les erreurs réseau rares (timeout, DNS)
 *   - Ne throw jamais → l'appelant n'a pas besoin de try/catch, et le flow
 *     métier (inscription, approbation) continue même si l'email échoue.
 *
 * Retourne true si l'envoi a réussi, false sinon (utile pour logs d'audit).
 */
export async function sendTransactionalEmail({
  to,
  subject,
  html,
  label,
}: SendEmailArgs): Promise<boolean> {
  const apiKey = env.resendApiKey;
  if (!apiKey) {
    console.warn(
      `[email:${label}] RESEND_API_KEY non configuré — envoi ignoré`
    );
    return false;
  }

  const from = env.emailFrom;
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      // Resend nous donne un objet error riche : name, message, statusCode.
      // On log tout pour pouvoir diagnostiquer (domaine non vérifié = le cas
      // le plus fréquent, erreur "from_domain_not_verified").
      // Log complet via JSON.stringify pour préserver tous les champs Resend
      // (name, message, et statusCode sur certaines variantes d'erreur).
      console.error(
        `[email:${label}] Resend a refusé l'envoi à ${to} (from=${from})`,
        JSON.stringify(error, null, 2)
      );
      return false;
    }

    console.log(`[email:${label}] envoyé à ${to} (id: ${data?.id})`);
    return true;
  } catch (err) {
    // Erreur réseau / DNS / timeout — rare, mais on capture quand même
    console.error(
      `[email:${label}] exception pendant l'envoi Resend (réseau/timeout ?)`,
      err
    );
    return false;
  }
}
