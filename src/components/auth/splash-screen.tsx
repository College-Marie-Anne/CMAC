"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * Splash screen CMA Connect — particules dorées, logo animé, texte doré.
 *
 * PWA fix : en mode standalone, le splash natif Android se joue AVANT que le
 * JS ne charge. Le timer doit commencer seulement quand la page est réellement
 * peinte à l'écran (pas pendant le splash natif invisible).
 *
 * - En navigateur : auto-dismiss après 5s
 * - En PWA standalone : auto-dismiss après 5s MAIS le timer démarre seulement
 *   après le premier paint réel (requestAnimationFrame)
 * - Skippable par tap/Enter/Space dans les deux cas
 */
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Attendre que le navigateur ait réellement peint le composant
    // (après que le splash natif PWA ait disparu).
    // requestAnimationFrame x2 garantit que le frame a été rendu à l'écran.
    let raf1: number;
    let raf2: number;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        // Maintenant le splash React est visible → lancer le timer
        timerRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 5000);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
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
            background: "radial-gradient(ellipse at center, #800020 0%, #5c0018 50%, #3a000f 100%)",
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        >
          <GoldenParticles />

          {/* Logo */}
          <motion.div
            className="relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden flex items-center justify-center"
              style={{
                boxShadow: "0 0 60px rgba(212,160,23,0.2), 0 0 120px rgba(128,0,32,0.3)",
                border: "2px solid rgba(212,160,23,0.3)",
              }}
            >
              <Image
                src="/CMAC.jpeg"
                alt="CMA Connect"
                width={200}
                height={200}
                className="object-cover scale-125"
                priority
              />
            </div>
          </motion.div>

          {/* Texte */}
          <motion.p
            className="absolute left-0 right-0 text-center text-xs sm:text-sm tracking-[0.25em] uppercase font-light"
            style={{ color: "#D4A017", top: "calc(50% + 110px)", paddingLeft: "0.25em" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: "easeOut" }}
          >
            CMA &middot; Connexion &middot; Mentorat
          </motion.p>

          {/* Indicateur skip */}
          <motion.p
            className="absolute bottom-6 sm:bottom-8 text-[11px] text-center w-full"
            style={{ color: "rgba(245,222,179,0.35)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
          >
            Touchez pour continuer
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
