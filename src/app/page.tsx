"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/splash-screen";
import { LoginForm } from "@/components/auth/login-form";
import { createClient } from "@/utils/supabase/client";

/**
 * Détermine si le splash doit s'afficher.
 *
 * En PWA standalone, Android peut garder l'app en mémoire (sessionStorage
 * persiste entre les "lancements"). On utilise localStorage avec un timestamp :
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
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (shouldShowSplash()) {
      setShowSplash(true);
    }
    setReady(true);
  }, []);

  const handleSplashComplete = () => {
    markSplashSeen();
    setShowSplash(false);
  };

  // Après le splash : si connectée → /feed, sinon → LoginForm
  useEffect(() => {
    if (showSplash || !ready) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setRedirecting(true);
        router.replace("/feed");
      }
    });
  }, [showSplash, ready, router]);

  if (!ready) return null;

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        ) : redirecting ? null : (
          <Suspense key="login" fallback={null}>
            <LoginForm />
          </Suspense>
        )}
      </AnimatePresence>
    </main>
  );
}
