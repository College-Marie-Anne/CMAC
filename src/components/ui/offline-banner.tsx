"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Bannière fixe en bas de l'écran quand le réseau est indisponible.
 * Spec §1561 : "Bannière indiquant le mode hors-ligne".
 *
 * Écoute les events `online` / `offline` du navigateur.
 * Disparaît automatiquement quand la connexion revient.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial (au cas où déjà offline au montage)
    setIsOffline(!navigator.onLine);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white"
          style={{ background: "rgba(128,0,32,0.95)", backdropFilter: "blur(8px)" }}
          role="alert"
          aria-live="assertive"
        >
          <WifiOff size={16} aria-hidden="true" />
          <span>Vous êtes hors-ligne — le contenu affiché peut ne pas être à jour</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
