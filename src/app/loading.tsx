"use client";

import { motion } from "framer-motion";
import Image from "next/image";

/**
 * Loading UI racine — affiché par Next.js pour toute route sans `loading.tsx`
 * spécifique (Suspense fallback). Les routes qui ont leur propre loading
 * (feed, directory, admin/*, etc.) gardent leur skeleton dédié.
 *
 * Design : dégradé bordeaux brandé CMA avec logo pulsant et 3 dots dorés.
 * Animation rapide (250 ms entrée) pour ne pas paraître bloquant.
 */
export default function RootLoading() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, rgba(128,0,32,0.96) 0%, rgba(92,0,24,0.94) 45%, rgba(58,0,15,0.96) 100%)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
      }}
      role="status"
      aria-live="polite"
      aria-label="Chargement en cours"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="flex flex-col items-center gap-5"
      >
        {/* Logo CMA en cercle doré qui pulse */}
        <motion.div
          className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
          style={{
            border: "2px solid rgba(212,160,23,0.4)",
            boxShadow: "0 0 30px rgba(212,160,23,0.25)",
          }}
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/CMAC.jpeg"
            alt=""
            width={80}
            height={80}
            className="object-cover scale-125"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </motion.div>

        {/* 3 dots dorés en relais */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#D4A017" }}
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Texte discret pour les utilisatrices avec lecteur d'écran */}
        <span className="sr-only">Chargement en cours, veuillez patienter</span>
      </motion.div>
    </div>
  );
}
