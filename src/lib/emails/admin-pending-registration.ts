import { env } from "@/lib/env";
import { sendTransactionalEmail } from "./send";

export type PendingRegistrationInfo = {
  /** Prénom de la nouvelle inscrite (pas l'admin destinataire). */
  firstName: string;
  /** Nom de la nouvelle inscrite. */
  lastName: string;
  /** Email de la nouvelle inscrite — utile pour contact rapide. */
  email: string;
  /** "alumni" | "s4" | "student" — affiché en label FR. */
  role: "alumni" | "s4" | "student";
  /** Nom de la promotion (si applicable). */
  promotion: string | null;
};

const ROLE_LABELS: Record<PendingRegistrationInfo["role"], string> = {
  alumni: "Ancienne élève",
  s4: "Finissante (S4)",
  student: "Élève actuelle (S1-S3)",
};

/**
 * Envoie un email aux admins pour les notifier qu'une nouvelle inscription
 * est en attente de validation.
 *
 * Appelé en batch (un envoi par admin) depuis `registerAction` après chaque
 * inscription non-invitée. Non-bloquant : toute erreur Resend est logguée
 * mais ne casse pas l'inscription.
 */
export async function sendAdminPendingRegistrationEmail({
  to,
  adminFirstName,
  newUser,
}: {
  to: string;
  adminFirstName: string | null;
  newUser: PendingRegistrationInfo;
}): Promise<void> {
  await sendTransactionalEmail({
    to,
    subject: `Nouvelle inscription en attente — ${newUser.firstName} ${newUser.lastName}`,
    html: buildHtml(adminFirstName, newUser, env.siteUrl),
    label: "admin-pending-registration",
  });
}

/* ─── HTML template ─── */

function buildHtml(
  adminFirstName: string | null,
  user: PendingRegistrationInfo,
  siteUrl: string
): string {
  const approvalsUrl = `${siteUrl}/admin/approvals`;
  const greeting = adminFirstName
    ? `Bonjour ${adminFirstName},`
    : "Bonjour,";
  const roleLabel = ROLE_LABELS[user.role];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nouvelle inscription en attente</title>
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
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:1px;">ESPACE ADMIN</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">
                ${greeting}
              </h2>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
                Une nouvelle inscription est en attente de votre validation sur CMA Connect.
              </p>

              <!-- User card -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fafafa;border:1px solid #eee;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#999;letter-spacing:1px;text-transform:uppercase;">
                      Nouvelle utilisatrice
                    </p>
                    <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#1a1a1a;">
                      ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#777;width:90px;">Statut</td>
                        <td style="padding:4px 0;font-size:13px;color:#1a1a1a;font-weight:500;">${roleLabel}</td>
                      </tr>
                      ${
                        user.promotion
                          ? `<tr>
                              <td style="padding:4px 0;font-size:13px;color:#777;">Promotion</td>
                              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;font-weight:500;">${escapeHtml(user.promotion)}</td>
                            </tr>`
                          : ""
                      }
                      <tr>
                        <td style="padding:4px 0;font-size:13px;color:#777;">Email</td>
                        <td style="padding:4px 0;font-size:13px;"><a href="mailto:${escapeHtml(user.email)}" style="color:#800020;text-decoration:none;">${escapeHtml(user.email)}</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
                <tr>
                  <td align="center" style="background:linear-gradient(135deg,#D4A017 0%,#b8860b 100%);border-radius:12px;">
                    <a href="${approvalsUrl}"
                       style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:600;color:#3a000f;text-decoration:none;letter-spacing:0.3px;">
                      Examiner la demande
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#888;">
                Si le bouton ne fonctionne pas, copie-colle ce lien :<br />
                <a href="${approvalsUrl}" style="color:#800020;word-break:break-all;">${approvalsUrl}</a>
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

/** Échappement minimal pour empêcher l'injection HTML dans le template. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
