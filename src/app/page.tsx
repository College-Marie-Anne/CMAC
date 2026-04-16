"use client";

import { useState, useEffect, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/splash-screen";
import { LoginForm } from "@/components/auth/login-form";

/**
 * Page d'accueil — réservée aux non-connectées.
 *
 * Les utilisatrices connectées sont redirigées CÔTÉ SERVEUR par le proxy vers
 * /feed avant même d'atteindre cette page. Le splash React ne s'affiche donc
 * que pour les non-connectées.
 *
 * PERF PWA — Réduction du splash natif Android :
 * Le splash natif Android reste à l'écran jusqu'au premier paint de contenu
 * visible (FCP). Pour le raccourcir, on rend le splash CMA dès le SSR (pas
 * de "return null" en attendant l'hydratation) : le HTML livré contient
 * déjà le logo + le dégradé bordeaux, donc FCP contient du vrai contenu et
 * le splash natif disparaît plus tôt.
 *
 * Pour les utilisatrices qui ont déjà vu le splash récemment (< 1h),
 * on skip côté client via useEffect → pas de hydration mismatch (SSR et
 * premier render client rendent tous deux le splash).
 */
const ONE_HOUR = 60 * 60 * 1000;

function shouldShowSplash(): boolean {
  try {
    const lastSeen = localStorage.getItem("cmac_splash_ts");
    if (!lastSeen) return true;
    return Date.now() - Number(lastSeen) > ONE_HOUR;
  } catch {
    return true;
  }
}

function markSplashSeen() {
  try {
    localStorage.setItem("cmac_splash_ts", String(Date.now()));
  } catch {
    // Pas critique
  }
}

export default function Home() {
  // SSR + premier render client : toujours true → continuité visuelle avec
  // le splash natif Android, FCP contient du vrai contenu.
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Après hydratation : si la splash a été vue récemment, skip directement.
    if (!shouldShowSplash()) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    markSplashSeen();
    setShowSplash(false);
  };

  return (
    <main className="min-h-screen">
      {/* initial={false} → pas d'animation d'entrée sur le splash (déjà visible
          dès le premier paint). L'animation de sortie (splash → login) reste. */}
      <AnimatePresence initial={false} mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        ) : (
          <Suspense key="login" fallback={null}>
            <LoginForm />
          </Suspense>
        )}
      </AnimatePresence>
    </main>
  );
}
