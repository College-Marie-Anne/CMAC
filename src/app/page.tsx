"use client";

import { useState, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/splash-screen";
import { LoginForm } from "@/components/auth/login-form";

/**
 * Page d'accueil — réservée aux non-connectées.
 *
 * Les utilisatrices connectées sont redirigées CÔTÉ SERVEUR par le proxy vers
 * /feed avant même d'atteindre cette page. Le splash React ne s'affiche donc
 * que pour les non-connectées, ce qui raccourcit au maximum le splash natif
 * PWA pour les connectées (qui vont directement sur /feed).
 *
 * En PWA standalone, Android peut garder l'app en mémoire (sessionStorage
 * persiste entre les "lancements"). On utilise localStorage avec timestamp :
 * le splash se remontre si la dernière vue date de plus d'1 heure.
 */
function shouldShowSplash(): boolean {
  try {
    const lastSeen = localStorage.getItem("cmac_splash_ts");
    if (!lastSeen) return true;
    const elapsed = Date.now() - Number(lastSeen);
    const ONE_HOUR = 60 * 60 * 1000;
    return elapsed > ONE_HOUR;
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
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false;
    return shouldShowSplash();
  });
  const [ready] = useState(() => typeof window !== "undefined");

  const handleSplashComplete = () => {
    markSplashSeen();
    setShowSplash(false);
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
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
