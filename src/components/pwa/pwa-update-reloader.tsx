"use client";

import { useEffect } from "react";
import { useSerwist } from "@serwist/turbopack/react";

/**
 * Auto-reload de la PWA quand un nouveau Service Worker prend le contrôle.
 *
 * Problème résolu : Sans ce composant, l'utilisatrice devait désinstaller/
 * réinstaller la PWA pour voir les updates. Le SW a bien `skipWaiting:true`
 * + `clientsClaim:true` (le nouveau SW s'active dès son install), mais
 * l'onglet déjà ouvert continue d'afficher le HTML/bundle déjà parsé en
 * mémoire. Sur Android PWA en particulier, rouvrir l'app reprend juste le
 * state en cache sans déclencher de navigation → écran figé sur l'ancienne
 * version.
 *
 * Stratégie :
 *  1. `visibilitychange` → quand la PWA redevient visible (utilisatrice
 *     rouvre l'app ou change d'onglet), on check `serwist.update()`
 *     THROTTLÉ à 1x / 6h via localStorage. Sans throttle, Android hiberne
 *     les PWA agressivement → chaque retour déclenchait une requête réseau
 *     vers /serwist/sw.js (500ms-3s) → warm start perçu comme lent.
 *  2. `controlling` event → émis quand un nouveau SW prend le contrôle
 *     (skipWaiting + clientsClaim). On reload la page pour récupérer le
 *     HTML/JS de la nouvelle version.
 *
 * Safeguard : si le page est cachée au moment du controlling event (ex: un
 * autre onglet a déclenché l'update), on diffère le reload au prochain
 * visibilitychange pour ne pas interrompre un flow en arrière-plan.
 */
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h
const LAST_UPDATE_CHECK_KEY = "cmac-sw-last-update-check";

export function PwaUpdateReloader() {
  const { serwist } = useSerwist();

  useEffect(() => {
    if (!serwist) return;
    if (typeof window === "undefined") return;

    let reloading = false;
    const reloadOnce = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    // Reload quand un nouveau SW prend le contrôle
    const onControlling = () => {
      if (document.visibilityState === "visible") {
        reloadOnce();
      } else {
        // Page cachée → on attend qu'elle redevienne visible
        const onVisible = () => {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", onVisible);
            reloadOnce();
          }
        };
        document.addEventListener("visibilitychange", onVisible);
      }
    };

    // Check update throttlé : 1x / 6h max. Sans throttle, chaque retour de
    // focus déclenchait une requête réseau synchrone vers /serwist/sw.js —
    // cause principale du warm start lent sur Android PWA. 6h est le bon
    // compromis : une utilisatrice voit au plus 24h de retard sur un deploy,
    // mais la PWA ne paie jamais plus d'un round-trip réseau par session
    // typique.
    const maybeCheckUpdate = () => {
      try {
        const last = Number(
          window.localStorage.getItem(LAST_UPDATE_CHECK_KEY) ?? 0
        );
        if (Date.now() - last < UPDATE_CHECK_INTERVAL_MS) return;
        window.localStorage.setItem(
          LAST_UPDATE_CHECK_KEY,
          String(Date.now())
        );
      } catch {
        // localStorage peut échouer (mode privé, iframe, etc.) — on laisse
        // passer l'update dans ce cas plutôt que de le rater silencieusement.
      }
      void serwist.update();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        maybeCheckUpdate();
      }
    };

    serwist.addEventListener("controlling", onControlling);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      serwist.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [serwist]);

  return null;
}
