"use client";

import { useEffect } from "react";
import {
  SerwistProvider as VendoredProvider,
  type SerwistProviderProps,
} from "@serwist/turbopack/react";

/**
 * Wrapper autour du SerwistProvider de `@serwist/turbopack` qui avale les
 * rejets de `navigator.serviceWorker.register()` pour éviter qu'ils ne soient
 * reportés à Sentry comme des erreurs unhandled.
 *
 * Problème corrigé :
 *   Sentry issue 91abe34e — sur iOS Safari (observé 18.7 / Safari 26.2), le
 *   fetch de `/serwist/sw.js` peut échouer avec `TypeError: Script ... load
 *   failed` (réseau, CSP transitoire, hibernation). Le SerwistProvider amont
 *   appelle `void window.serwist.register()` sans `.catch()` — la promesse
 *   rejette, l'event bubble à window.onunhandledrejection, Sentry le capture.
 *
 *   Conséquence UX : aucune. L'app continue sans SW (pas d'offline / pas de
 *   push), ce qui est acceptable. Mais le volume de reports Sentry faussait
 *   les métriques d'erreurs prod.
 *
 * Stratégie :
 *   On installe un listener `unhandledrejection` qui catch spécifiquement les
 *   messages liés au SW et appelle preventDefault → Sentry ignore. On filtre
 *   par substring pour ne PAS silencer les autres erreurs légitimes.
 *
 *   Pas de hack type global sur Sentry (beforeSend) : le filtre reste local
 *   au domaine PWA et auto-documenté.
 */
export function SerwistProvider(props: SerwistProviderProps) {
  useEffect(() => {
    const isSwLoadFailure = (reason: unknown): boolean => {
      const msg =
        (reason as { message?: string })?.message ??
        (typeof reason === "string" ? reason : "");
      if (!msg) return false;
      // iOS Safari : "Script ... load failed" — l'URL contient le path du SW
      // Chromium : "Failed to register a ServiceWorker"
      return (
        msg.includes("serwist/sw.js") ||
        (msg.includes("Script") && msg.includes("load failed")) ||
        msg.includes("Failed to register a ServiceWorker")
      );
    };

    // Google WRS (Web Rendering Service — le renderer de Googlebot) stub
    // navigator.serviceWorker.register et rejette avec un bare `Error: Rejected`.
    // Stack frames contiennent `wrsParams.serviceWorkers` / `<anonymous>`. Le
    // bot n'a pas besoin de SW ; silence pour éviter de polluer Sentry.
    // Sentry issue 7634beded27f — Googlebot (66.249.83.34) sur /login.
    const isBotSwStubRejection = (reason: unknown): boolean => {
      const msg =
        (reason as { message?: string })?.message ??
        (typeof reason === "string" ? reason : "");
      const stack = (reason as { stack?: string })?.stack ?? "";
      return (
        msg === "Rejected" &&
        (stack.includes("wrsParams") || stack.includes("serviceWorker.register"))
      );
    };

    // Supabase JS utilise navigator.locks pour synchroniser le refresh token
    // entre plusieurs tabs / iframes. Sur certains navigateurs (Samsung
    // Internet observé — Sentry issue a646f851, aussi Firefox Android),
    // quand deux onglets essaient de rafraîchir le token en même temps, le
    // lock est "stolen" par le plus récent et l'ancien getUser() rejette avec
    // cette erreur. C'est transitoire et non-fatal : Supabase retente, et
    // l'auth finit par se stabiliser. Pas de valeur à remonter ça à Sentry.
    const isSupabaseAuthLockStolen = (reason: unknown): boolean => {
      const msg =
        (reason as { message?: string })?.message ??
        (typeof reason === "string" ? reason : "");
      return (
        !!msg &&
        msg.includes('Lock "') &&
        msg.includes("was released because another request stole it")
      );
    };

    // Erreurs réseau iOS Safari / Firefox Android pendant un fetch (souvent
    // un Server Action POST ou un appel Supabase). "Load failed" (WebKit) et
    // "Failed to fetch" (Chromium/Firefox) sont le même symptôme : connexion
    // instable, switch WiFi/4G, tab mis en arrière-plan juste avant le fetch.
    // Les composants métier (register-form, comment-form, etc.) catchent déjà
    // ces erreurs localement pour afficher un message UX. Celles qui se
    // glissent à travers (fetchs internes de Next.js router, etc.) n'ont pas
    // de valeur à remonter — elles ne sont pas actionnables.
    // Sentry issue 0911f517 : /register/invite/[token] POST fail iOS Safari.
    const isTransientNetworkError = (reason: unknown): boolean => {
      const msg =
        (reason as { message?: string })?.message ??
        (typeof reason === "string" ? reason : "");
      if (!msg) return false;
      return (
        msg === "Load failed" ||
        msg === "Failed to fetch" ||
        msg === "NetworkError when attempting to fetch resource." ||
        msg.includes("The network connection was lost") ||
        msg.includes("The Internet connection appears to be offline")
      );
    };

    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (isSwLoadFailure(e.reason)) {
        console.warn("[sw] registration failed, continuing without PWA:", e.reason);
        e.preventDefault();
        return;
      }
      if (isBotSwStubRejection(e.reason)) {
        console.warn("[sw] registration rejected by bot stub (WRS), ignoring:", e.reason);
        e.preventDefault();
        return;
      }
      if (isSupabaseAuthLockStolen(e.reason)) {
        console.warn("[auth] lock stolen (transient, supabase retries):", e.reason);
        e.preventDefault();
        return;
      }
      if (isTransientNetworkError(e.reason)) {
        console.warn("[net] transient network error (offline / tab backgrounded):", e.reason);
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return <VendoredProvider {...props} />;
}
