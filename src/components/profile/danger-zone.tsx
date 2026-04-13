"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { deactivateAccountAction } from "@/actions/profile";

export function DangerZone() {
  const [showModal, setShowModal] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDeactivate = () => {
    if (confirmation !== "DÉSACTIVER") {
      setError("Tapez DÉSACTIVER pour confirmer");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deactivateAccountAction(confirmation);
      if (!result.success) setError(result.error ?? "Erreur");
    });
  };

  return (
    <>
      <div className="rounded-xl border-2 border-red-200 dark:border-red-900 p-5">
        <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-2">
          <AlertTriangle size={16} /> Zone de danger
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          La désactivation masque votre profil et bloque toutes vos interactions. La réactivation nécessite l&apos;approbation d&apos;une administratrice.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowModal(true)}
          className="rounded-xl text-xs text-red-500 border-red-200 hover:bg-red-50"
        >
          Désactiver mon compte
        </Button>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/50" onClick={() => !isPending && setShowModal(false)} />
            <motion.div
              className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button type="button" onClick={() => setShowModal(false)} disabled={isPending} className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Fermer">
                <X size={16} />
              </button>

              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Désactiver votre compte ?</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Votre profil sera masqué et vous ne pourrez plus accéder à la plateforme.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
              )}

              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">
                  Tapez <strong className="text-red-600">DÉSACTIVER</strong> pour confirmer :
                </p>
                <Input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="DÉSACTIVER"
                  className="rounded-xl h-10 text-center font-mono"
                  disabled={isPending}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} disabled={isPending} className="flex-1 h-10 rounded-xl">
                  Annuler
                </Button>
                <Button
                  onClick={handleDeactivate}
                  disabled={isPending || confirmation !== "DÉSACTIVER"}
                  className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : "Désactiver"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
