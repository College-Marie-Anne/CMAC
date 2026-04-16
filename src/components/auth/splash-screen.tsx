"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash screen CMA Connect — particules dorées, logo, texte doré.
 *
 * OPTIM PWA — Réduction du splash natif Android :
 * - Rendu SSR-visible (initial={false} sur le container) → pas de
 *   opacity: 0 dans le HTML livré. Le premier paint contient déjà le logo,
 *   ce qui fait disparaître le splash natif Android plus tôt.
 * - Durée raccourcie : 3s (vs 5s) → lancement plus rapide.
 * - Timer démarre immédiatement (pas de requestAnimationFrame×2) : le splash
 *   est déjà visible au mount puisque SSR-rendu.
 * - Image avec preload={true} (API Next.js 16, remplace `priority` déprécié).
 *
 * Skippable par tap/Enter/Space.
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Timer lancé immédiatement : le splash est déjà visible (rendu SSR),
    // inutile d'attendre un frame pour que le navigateur le peigne.
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          key="splash"
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
          // Seule l'animation de sortie est conservée pour la transition vers login.
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <GoldenParticles />

          {/* Logo — visible dès le premier paint (pas d'initial opacity 0). */}
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
      )}
    </AnimatePresence>
  );
}
