"use client";

import { useState, useTransition } from "react";
import { LogOut, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { motion, AnimatePresence } from "framer-motion";

interface LogoutButtonProps {
  variant?: "feed" | "admin";
}

export function LogoutButton({ variant = "feed" }: LogoutButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(() => {
      logoutAction();
    });
  };

  const feedClass =
    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-50 transition-colors w-full";
  const adminClass =
    "w-full justify-start gap-2 text-xs h-9 rounded-lg";

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={
          variant === "admin"
            ? "w-full flex items-center justify-start gap-2 text-xs h-9 px-3 rounded-lg hover:bg-white/10 transition-colors"
            : feedClass
        }
        style={{ color: variant === "admin" ? "rgba(255,255,255,0.4)" : undefined }}
      >
        <LogOut size={variant === "admin" ? 14 : 18} />
        Déconnexion
      </button>

      {/* Modale de confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isPending && setShowConfirm(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <LogOut size={20} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Se déconnecter ?
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Vous devrez vous reconnecter pour accéder à la plateforme
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Déconnexion...
                      </span>
                    ) : (
                      "Se déconnecter"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
