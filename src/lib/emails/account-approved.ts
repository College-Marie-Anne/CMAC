import { env } from "@/lib/env";
import { sendTransactionalEmail } from "./send";

/**
 * Envoie l'email de confirmation d'approbation de compte.
 *
 * Déclenché par `approveUserAction` et `bulkApproveAction` après que l'admin
 * valide un compte pending.
 */
export async function sendAccountApprovedEmail({
  to,
  firstName,
}: {
  to: string;
  firstName: string;
}): Promise<void> {
  await sendTransactionalEmail({
    to,
    subject: "Ton compte CMA Connect est approuvé ! 🎉",
    html: buildHtml(firstName, env.siteUrl),
    label: "account-approved",
  });
}

/* ─── HTML template ─── */

function buildHtml(firstName: string, siteUrl: string): string {
  const loginUrl = `${siteUrl}/login`;
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ton compte CMA Connect est approuvé</title>
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
                Bienvenue officielle, ${firstName} ! 🎉
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#555;">
                Bonne nouvelle : ton compte <strong>CMA Connect</strong> vient d'être approuvé par l'équipe.
                Tu peux désormais te connecter et profiter de toutes les fonctionnalités de la plateforme.
              </p>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#D4A017 0%,#b8860b 100%);border-radius:12px;">
                    <a href="${loginUrl}"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#3a000f;text-decoration:none;letter-spacing:0.3px;">
                      Me connecter
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

              <!-- Next steps -->
              <h3 style="margin:0 0 12px;font-size:16px;color:#800020;">Par où commencer</h3>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Complète ton profil et ajoute une photo
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Explore l'annuaire et retrouve tes anciennes camarades
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Participe au forum et aux élections de ta promotion
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#555;">
                    <span style="color:#D4A017;font-weight:700;margin-right:8px;">✦</span>
                    Demande ou propose du mentorat
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#888;">
                Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br />
                <a href="${loginUrl}" style="color:#800020;word-break:break-all;">${loginUrl}</a>
              </p>
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
