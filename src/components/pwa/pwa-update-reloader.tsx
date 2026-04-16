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
 *     rouvre l'app ou change d'onglet), on force `serwist.update()` qui
 *     re-fetch /serwist/sw.js et détecte les nouvelles versions.
 *  2. `controlling` event → émis quand un nouveau SW prend le contrôle
 *     (skipWaiting + clientsClaim). On reload la page pour récupérer le
 *     HTML/JS de la nouvelle version.
 *
 * Safeguard : si le page est cachée au moment du controlling event (ex: un
 * autre onglet a déclenché l'update), on diffère le reload au prochain
 * visibilitychange pour ne pas interrompre un flow en arrière-plan.
 */
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

    // Check update à chaque fois que la PWA redevient visible
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // update() re-fetch le SW ; si une nouvelle version existe, elle
        // s'installera → event `controlling` → reload via handler ci-dessus.
        void serwist.update();
      }
    };

    serwist.addEventListener("controlling", onControlling);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Check initial au montage (au cas où l'app vient d'être ouverte)
    void serwist.update();

    return () => {
      serwist.removeEventListener("controlling", onControlling);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [serwist]);

  return null;
}
