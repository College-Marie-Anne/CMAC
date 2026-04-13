"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface DeleteConfirmDialogProps {
  onConfirm: () => Promise<void>;
  trigger: React.ReactNode;
  title?: string;
  message?: string;
}

export function DeleteConfirmDialog({
  onConfirm,
  trigger,
  title = "Supprimer ?",
  message = "Cette action est irréversible",
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      await onConfirm();
      setOpen(false);
    });
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => !isPending && setOpen(false)}
            />
            <motion.div
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X size={16} />
              </button>

              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 mb-6">{message}</p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Supprimer"
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
