import webpush from "web-push";
import { createAdminClient } from "@/utils/supabase/admin";
import { env } from "@/lib/env";

/**
 * Helper Web Push centralisé — pattern aligné sur `sendTransactionalEmail`.
 *
 * Règle d'or : never throws. Le caller (Server Action) n'a pas à try/catch.
 * Retourne un compteur pour les logs / sanity-check en dev.
 *
 * Opt-in global : la colonne `notification_preferences.push_enabled` gate
 * l'envoi. Si `false` (défaut), aucun push n'est émis même si l'utilisatrice
 * a des `push_subscriptions` actives. Ça couvre le cas "je désactive les
 * notifs push mais je n'unsubscribe pas immédiatement le browser".
 *
 * Nettoyage : les endpoints renvoyant 404/410 sont supprimés. Ça évite
 * qu'une subscription fantôme (PWA désinstallée, clé VAPID changée côté
 * gateway, navigateur ayant purgé la souscription) continue à générer des
 * erreurs à chaque notif.
 *
 * Client admin obligatoire : `sendPushToUser` est appelée par un user A
 * pour déclencher un push chez user B (ex. DM). Les policies RLS
 * `push_subscriptions` et `notification_preferences` n'autorisent que
 * `profile_id = auth.uid()` → un client SSR normal ne peut pas lire les
 * rows d'un autre user. Le service role bypass pour ce cas précis.
 *
 * Gap connu (Phase 1) : les notifications insérées par triggers DB purs
 * (élections broadcast via trigger, cron sync_all_pending_elections) ne
 * passent PAS par ce helper → pas de push OS. À adresser en Phase 2 via
 * DB trigger + pg_net + Edge Function.
 */

export type PushNotificationType =
  | "dm"
  | "forum_reply"
  | "forum_comment_reply"
  | "reaction"
  | "mention"
  | "mentorship"
  | "mentorship_completed"
  | "election"
  | "new_opportunity"
  | "post_pinned"
  | "account_approved"
  | "account_suspended"
  | "account_deactivated"
  | "account_reactivated"
  | "promo_rejected"
  | "invitation_used"
  | "admin"
  | "support_reply";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Construit un payload push cohérent à partir du type de notification.
 * Centralise la logique titre/URL pour ne pas dupliquer le mapping dans
 * les 21 call-sites `notify_user`.
 *
 * Le `body` reçu est le même que `p_content` passé à `notify_user` → cohérence
 * avec la cloche in-app.
 */
export function buildPushPayload(
  type: PushNotificationType,
  body: string,
  referenceId: string | null
): PushPayload {
  const titles: Record<PushNotificationType, string> = {
    dm: "Nouveau message",
    forum_reply: "Réponse à votre post",
    forum_comment_reply: "Réponse dans la discussion",
    reaction: "Nouvelle réaction",
    mention: "Vous avez été mentionnée",
    mentorship: "Mentorat",
    mentorship_completed: "Mentorat terminé",
    election: "Élection de promo",
    new_opportunity: "Bourses & Opportunités",
    post_pinned: "Post épinglé",
    account_approved: "Compte approuvé",
    account_suspended: "Compte suspendu",
    account_deactivated: "Compte désactivé",
    account_reactivated: "Compte réactivé",
    promo_rejected: "Promotion rejetée",
    invitation_used: "Invitation utilisée",
    admin: "Administration",
    support_reply: "Réponse du support",
  };

  // URL cible au clic : URL deep quand elle a du sens, sinon /notifications.
  const urlByType: Partial<Record<PushNotificationType, string>> = {
    dm: referenceId ? `/messages/${referenceId}` : "/messages",
    forum_reply: referenceId ? `/feed/${referenceId}` : "/feed",
    forum_comment_reply: referenceId ? `/feed/${referenceId}` : "/feed",
    reaction: referenceId ? `/feed/${referenceId}` : "/feed",
    mention: referenceId ? `/feed/${referenceId}` : "/feed",
    post_pinned: referenceId ? `/feed/${referenceId}` : "/feed",
    mentorship: "/mentorship",
    mentorship_completed: referenceId ? `/mentorship/${referenceId}` : "/mentorship",
    election: "/promo/election",
    new_opportunity: "/opportunities",
    support_reply: referenceId ? `/support/${referenceId}` : "/support",
  };

  return {
    title: titles[type] ?? "CMA Connect",
    body,
    url: urlByType[type] ?? "/notifications",
    // tag = coalesce d'un même event sur l'OS (évite la pile de push doublons)
    tag: `${type}:${referenceId ?? "global"}`,
  };
}

/**
 * Envoie un push à toutes les subscriptions actives d'une utilisatrice.
 * Short-circuit gracieux si :
 *   - VAPID keys absents (dev sans configuration)
 *   - push_enabled = false (opt-in désactivé)
 *   - aucune subscription active
 */
export async function sendPushToUser(
  profileId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    console.warn("[push] VAPID keys missing — skipping send");
    return { sent: 0, removed: 0 };
  }

  try {
    webpush.setVapidDetails(
      env.vapidSubject,
      env.vapidPublicKey,
      env.vapidPrivateKey
    );
  } catch (err) {
    console.error("[push] setVapidDetails failed (bad keys?)", err);
    return { sent: 0, removed: 0 };
  }

  const admin = createAdminClient();

  // 1. Respecter l'opt-in global
  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("push_enabled")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!prefs?.push_enabled) {
    return { sent: 0, removed: 0 };
  }

  // 2. Lire les subscriptions actives
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  if (subsErr) {
    console.error("[push] fetch subs failed", subsErr);
    return { sent: 0, removed: 0 };
  }

  if (!subs || subs.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const body = JSON.stringify(payload);
  let sent = 0;
  let removed = 0;

  // 3. Envoyer en parallèle (allSettled : un échec n'interrompt pas les autres)
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          body
        );
        sent++;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : undefined;

        // 404 Not Found / 410 Gone → subscription expirée, on la purge
        if (statusCode === 404 || statusCode === 410) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("id", s.id);
          removed++;
        } else {
          const details =
            typeof err === "object" && err !== null && "body" in err
              ? (err as { body: unknown }).body
              : err;
          console.error(
            `[push] send failed endpoint=${s.endpoint.slice(0, 60)}... status=${statusCode ?? "?"}`,
            details
          );
        }
      }
    })
  );

  if (sent > 0 || removed > 0) {
    console.log(
      `[push] profileId=${profileId} sent=${sent} removed=${removed}`
    );
  }

  return { sent, removed };
}

/**
 * Raccourci `notify + push` à appeler dans une Server Action :
 *
 * ```ts
 * import { after } from "next/server";
 * import { dispatchPush } from "@/lib/push";
 *
 * await supabase.rpc("notify_user", { p_recipient, p_type, p_reference_id, p_content, p_preference_field });
 * after(() => dispatchPush(p_recipient, p_type, p_reference_id, p_content));
 * ```
 *
 * Fait le `buildPushPayload` en interne → évite 21 imports redondants.
 */
export async function dispatchPush(
  recipientId: string,
  type: PushNotificationType,
  referenceId: string | null,
  content: string
): Promise<void> {
  await sendPushToUser(recipientId, buildPushPayload(type, content, referenceId));
}
