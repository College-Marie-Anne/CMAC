"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash screen CMA Connect — particules dorées, logo, texte doré.
 *
 * Architecture :
 * - Le parent (page.tsx) détient l'état `showSplash` et wrappe ce composant
 *   dans un `<AnimatePresence mode="wait">` qui gère le mount/unmount + la
 *   transition vers LoginForm.
 * - Ce composant n'a PAS sa propre AnimatePresence — il est juste une
 *   `motion.div` avec `exit` animation qui est pilotée par le parent. Deux
 *   AnimatePresence imbriquées provoquaient un double-exit (flash, timing
 *   incohérent entre `onComplete` et le démontage du parent).
 * - Après 1.5s (ou au tap/Enter/Space), `onComplete` est appelé → le parent
 *   set `showSplash=false` → le parent AnimatePresence anime la sortie → puis
 *   monte LoginForm. Durée raccourcie de 3s → 1.5s : empilée avec le splash
 *   natif Android (0.8-1.5s), le total perçu passe de ~4s à ~2-3s.
 *
 * OPTIM PWA : rendu SSR-visible (initial={false}) pour raccourcir le splash
 * natif Android — premier paint contient déjà le logo, pas de opacity:0.
 *
 * Skippable par tap/Enter/Space.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onComplete]);

  const dismiss = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onComplete();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden px-6"
      style={{
        background:
          "radial-gradient(ellipse at center, #800020 0%, #5c0018 50%, #3a000f 100%)",
      }}
      role="button"
      tabIndex={0}
      aria-label="Passer l'animation d'ouverture"
      onClick={dismiss}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          dismiss();
        }
      }}
      // initial={false} → rendu SSR-visible (pas d'opacity:0 dans le HTML).
      // Seule l'animation de sortie reste, gérée par l'AnimatePresence parent.
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <GoldenParticles />

      {/* Logo — visible dès le premier paint. */}
      <div
        className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          boxShadow:
            "0 0 60px rgba(212,160,23,0.2), 0 0 120px rgba(128,0,32,0.3)",
          border: "2px solid rgba(212,160,23,0.3)",
        }}
      >
        <Image
          src="/CMAC.jpeg"
          alt="CMA Connect"
          width={200}
          height={200}
          className="object-cover scale-125"
          preload
        />
      </div>

      {/* Texte doré — visible dès le premier paint. */}
      <p
        className="absolute left-0 right-0 text-center text-xs sm:text-sm tracking-[0.25em] uppercase font-light"
        style={{
          color: "#D4A017",
          top: "calc(50% + 110px)",
          paddingLeft: "0.25em",
        }}
      >
        CMA &middot; Connexion &middot; Mentorat
      </p>

      {/* Indicateur skip — légère entrée après hydratation (non critique). */}
      <motion.p
        className="absolute bottom-6 sm:bottom-8 text-[11px] text-center w-full"
        style={{ color: "rgba(245,222,179,0.35)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        Touchez pour continuer
      </motion.p>
    </motion.div>
  );
}
