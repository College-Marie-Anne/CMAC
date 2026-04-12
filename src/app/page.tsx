"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/splash-screen";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  // showSplash = true uniquement si l'utilisateur n'a pas encore vu l'intro
  // dans cette session de navigation.
  const [showSplash, setShowSplash] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("cmac_splash_seen");
    if (!seen) {
      setShowSplash(true);
    }
    setReady(true);
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem("cmac_splash_seen", "1");
    setShowSplash(false);
  };

  // Évite le flash avant que useEffect détermine si le splash doit s'afficher
  if (!ready) return null;

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={handleSplashComplete} />
        ) : (
          <LoginForm key="login" />
        )}
      </AnimatePresence>
    </main>
  );
}
