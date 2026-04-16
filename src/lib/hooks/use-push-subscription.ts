"use client";

import { useCallback, useEffect, useState } from "react";
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "@/actions/push";

/**
 * Hook client pour gérer le cycle de vie d'une PushSubscription.
 *
 * States possibles :
 *   - loading     : on lit navigator + registration (race SSR initial)
 *   - unsupported : Notification API absente (iOS < 16.4, navigateur vieux)
 *   - no-vapid    : clé publique VAPID absente en env → feature OFF côté prod
 *   - denied      : l'utilisatrice a cliqué "Block" sur la prompt OS
 *   - granted     : permission OK + subscription active côté browser + DB
 *   - prompt      : permission pas encore demandée (toggle OFF)
 *
 * L'appelant (NotificationPrefsSection) appelle `enable()` / `disable()` et
 * obtient true/false + éventuellement un message d'erreur pour toaster.
 */

type PushState =
  | "loading"
  | "unsupported"
  | "no-vapid"
  | "denied"
  | "granted"
  | "prompt";

type EnableResult = { ok: boolean; error?: string };

// Helper standard pour convertir la clé VAPID base64url en Uint8Array
// (format exigé par pushManager.subscribe). La clé publique contient des
// caractères URL-safe (- et _) qui doivent être convertis en + et / pour
// atob(). Padding optionnel avec des '=' pour atteindre un multiple de 4.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushState>("loading");
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  // Détection initiale des capacités + lecture de l'état courant
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!vapidPublicKey) {
      setState("no-vapid");
      return;
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      setState("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    // Permission OK ou pas encore demandée : on regarde s'il y a déjà une sub active
    let cancelled = false;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (cancelled) return;
        if (sub && Notification.permission === "granted") {
          setState("granted");
        } else {
          setState("prompt");
        }
      } catch {
        if (!cancelled) setState("prompt");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [vapidPublicKey]);

  /**
   * Active les push :
   *   1. Demande la permission OS
   *   2. Souscrit via pushManager.subscribe (si pas déjà fait)
   *   3. POST la subscription vers la Server Action
   */
  const enable = useCallback(async (): Promise<EnableResult> => {
    if (!vapidPublicKey) {
      return { ok: false, error: "Push non configuré sur ce déploiement" };
    }

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      typeof Notification === "undefined"
    ) {
      return { ok: false, error: "Votre navigateur ne supporte pas les push" };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return {
          ok: false,
          error:
            "Permission refusée. Autorisez les notifications dans les paramètres du navigateur",
        };
      }
      if (permission !== "granted") {
        return { ok: false, error: "Permission non accordée" };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        try {
          // Cast BufferSource : le lib.dom.d.ts attend un ArrayBuffer "non-shared"
          // mais Uint8Array<ArrayBufferLike> est plus permissif. En pratique
          // l'ArrayBuffer backing un Uint8Array créé via `new Uint8Array(n)`
          // est bien un ArrayBuffer classique (pas un SharedArrayBuffer).
          const key = urlBase64ToUint8Array(vapidPublicKey);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as unknown as BufferSource,
          });
        } catch (err) {
          console.error("[push] subscribe failed", err);
          return {
            ok: false,
            error: "Impossible de souscrire aux notifications",
          };
        }
      }

      const raw = sub.toJSON();
      if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
        return { ok: false, error: "Subscription invalide" };
      }

      const result = await savePushSubscriptionAction({
        endpoint: raw.endpoint,
        keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
      });

      if (!result.success) {
        // Rollback côté browser pour ne pas laisser une sub orpheline
        try {
          await sub.unsubscribe();
        } catch {
          // best effort
        }
        return { ok: false, error: result.error ?? "Erreur serveur" };
      }

      setState("granted");
      return { ok: true };
    } catch (err: unknown) {
      console.error("[push] enable failed", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inattendue",
      };
    }
  }, [vapidPublicKey]);

  /**
   * Désactive les push :
   *   1. Unsubscribe côté browser (supprime l'endpoint gateway)
   *   2. Delete la ligne DB
   */
  const disable = useCallback(async (): Promise<EnableResult> => {
    if (!("serviceWorker" in navigator)) {
      return { ok: true }; // rien à faire
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        try {
          await sub.unsubscribe();
        } catch (err) {
          console.warn("[push] browser unsubscribe failed", err);
          // On continue quand même pour nettoyer la DB
        }
        const result = await deletePushSubscriptionAction(endpoint);
        if (!result.success) {
          return { ok: false, error: result.error ?? "Erreur serveur" };
        }
      }

      setState("prompt");
      return { ok: true };
    } catch (err: unknown) {
      console.error("[push] disable failed", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inattendue",
      };
    }
  }, []);

  return { state, enable, disable };
}
