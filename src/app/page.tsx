"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/splash-screen";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <main className="min-h-screen">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen
            key="splash"
            onComplete={() => setShowSplash(false)}
          />
        ) : (
          <LoginForm key="login" />
        )}
      </AnimatePresence>
    </main>
  );
}
