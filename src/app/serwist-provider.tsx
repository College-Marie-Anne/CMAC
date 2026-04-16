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

    const onUnhandled = (e: PromiseRejectionEvent) => {
      if (isSwLoadFailure(e.reason)) {
        console.warn("[sw] registration failed, continuing without PWA:", e.reason);
        e.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return <VendoredProvider {...props} />;
}
