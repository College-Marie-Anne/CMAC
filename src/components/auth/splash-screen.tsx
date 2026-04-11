"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GoldenParticles } from "@/components/ui/golden-particles-lazy";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

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
          onClick={() => setIsVisible(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsVisible(false);
            }
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <GoldenParticles />

          {/* Logo avec fond transparent via clip circulaire */}
          <motion.div
            className="relative"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
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
          <motion.div
            className="mt-8 flex flex-col items-center w-full"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
          >
            <p
              className="text-xs sm:text-sm tracking-[0.25em] uppercase font-light"
              style={{ color: "#D4A017" }}
            >
              Connexion
            </p>
            <p
              className="mt-1 text-xs sm:text-sm tracking-[0.25em] uppercase font-light"
              style={{ color: "#D4A017" }}
            >
              Mentorat &middot; Excellence
            </p>
          </motion.div>

          {/* Indicateur skip */}
          <motion.p
            className="absolute bottom-6 sm:bottom-8 text-[11px] text-center w-full"
            style={{ color: "rgba(245,222,179,0.35)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            Touchez pour continuer
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
