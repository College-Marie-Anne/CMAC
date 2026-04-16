import { sendTransactionalEmail } from "./send";

/**
 * Envoie l'email "inscription reçue, en attente d'approbation" après un signUp
 * non-invité. Utilise le helper centralisé `sendTransactionalEmail` qui lit
 * correctement les erreurs Resend (cf. `./send.ts`).
 */
export async function sendWelcomeEmail({
  to,
  firstName,
}: {
  to: string;
  firstName: string;
}): Promise<void> {
  await sendTransactionalEmail({
    to,
    subject: "Bienvenue sur CMA Connect ! 🎓",
    html: buildWelcomeHtml(firstName),
    label: "welcome",
  });
}

/* ─── HTML template ─── */

function buildWelcomeHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenue sur CMA Connect</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header bordeaux -->
          <tr>
            <td style="background:linear-gradient(135deg,#800020 0%,#5c0018 100%);padding:36px 32px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#D4A017;letter-spacing:0.5px;">CMA Connect</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:1px;">CONNEXION · MENTORAT</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">
                Bienvenue, ${firstName} ! 🎉
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">
                Votre inscription sur <strong>CMA Connect</strong> a bien été reçue.
                Notre équipe examine actuellement votre demande d'adhésion.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#555;">
                Vous recevrez une notification dès que votre compte sera approuvé.
                En attendant, n'hésitez pas à vérifier votre adresse email via le lien qui vous a été envoyé séparément.
              </p>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

              <!-- What's next -->
              <h3 style="margin:0 0 12px;font-size:16px;color:#800020;">Ce qui vous attend</h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Retrouvez les anciennes et actuelles élèves du CMA
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Échangez via le forum et la messagerie privée
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Bénéficiez du programme de mentorat
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Découvrez les bourses et opportunités
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:24px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="margin:0;font-size:12px;color:#999;line-height:1.5;">
                Cet email a été envoyé automatiquement par CMA Connect.<br />
                © ${new Date().getFullYear()} CMA Connect — Collège Marie-Anne
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
