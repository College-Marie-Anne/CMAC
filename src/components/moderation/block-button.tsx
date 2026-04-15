"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, UserCheck, X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blockUserAction, unblockUserAction } from "@/actions/moderation";

interface BlockButtonProps {
  userId: string;
  /** Nom affiché dans le modal de confirmation (ex: "Marie Dupont") */
  userLabel: string;
  /** true si déjà bloquée (mode "Débloquer"), false sinon */
  isBlocked: boolean;
  /** Variant visual (bouton plein vs ghost menu-item) */
  variant?: "button" | "menu-item";
  /** Callback post-succès (ex: refresh de la liste) */
  onSuccess?: () => void;
}

export function BlockButton({
  userId,
  userLabel,
  isBlocked,
  variant = "button",
  onSuccess,
}: BlockButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = isBlocked
        ? await unblockUserAction(userId)
        : await blockUserAction(userId);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setShowModal(false);
      onSuccess?.();
    });
  };

  const trigger =
    variant === "menu-item" ? (
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
          isBlocked
            ? "text-gray-700 hover:bg-gray-50"
            : "text-red-500 hover:bg-red-50"
        }`}
      >
        {isBlocked ? <UserCheck size={14} /> : <Ban size={14} />}
        {isBlocked ? "Débloquer" : "Bloquer"}
      </button>
    ) : (
      <Button
        type="button"
        onClick={() => setShowModal(true)}
        variant="outline"
        size="sm"
        className={`rounded-xl text-xs gap-1 ${
          isBlocked
            ? "text-gray-600 border-gray-200"
            : "text-red-500 border-red-200 hover:bg-red-50"
        }`}
      >
        {isBlocked ? <UserCheck size={12} /> : <Ban size={12} />}
        {isBlocked ? "Débloquer" : "Bloquer"}
      </Button>
    );

  return (
    <>
      {trigger}

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isPending && setShowModal(false)}
            />
            <motion.div
              className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>

              <div className="text-center mb-5">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    isBlocked ? "bg-cma-vert/10" : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  {isBlocked ? (
                    <UserCheck size={20} className="text-cma-vert" />
                  ) : (
                    <Ban size={20} className="text-red-500" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {isBlocked ? "Débloquer" : "Bloquer"} {userLabel} ?
                </h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  {isBlocked ? (
                    <>
                      Tu pourras à nouveau recevoir ses messages et voir ses
                      posts dans les fils publics.
                    </>
                  ) : (
                    <>
                      Elle ne pourra plus t&apos;envoyer de messages privés. Tes
                      mentorats en cours avec cette personne seront annulés
                      automatiquement.
                    </>
                  )}
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  disabled={isPending}
                  className="flex-1 h-10 rounded-xl text-sm"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-xl text-sm text-white gap-1 ${
                    isBlocked
                      ? "bg-cma-vert hover:bg-cma-vert-dark"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isBlocked ? (
                    <UserCheck size={14} />
                  ) : (
                    <Ban size={14} />
                  )}
                  {isBlocked ? "Débloquer" : "Bloquer"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
