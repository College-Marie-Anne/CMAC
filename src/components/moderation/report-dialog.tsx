"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, X, Loader2, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportAction } from "@/actions/moderation";

type TargetType = "user" | "post" | "comment" | "message";

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  targetType: TargetType;
  targetId: string;
  /** Nom lisible de la cible (ex: @username, "ce post", "ce commentaire") affiché dans l'en-tête */
  targetLabel: string;
}

const TARGET_COPY: Record<TargetType, { title: string; subtitle: string }> = {
  user: {
    title: "Signaler ce profil",
    subtitle: "Un signalement sera transmis à l'équipe de modération.",
  },
  post: {
    title: "Signaler ce post",
    subtitle: "Les admins examineront ce post dans les plus brefs délais.",
  },
  comment: {
    title: "Signaler ce commentaire",
    subtitle: "Les admins examineront ce commentaire dans les plus brefs délais.",
  },
  message: {
    title: "Signaler ce message",
    subtitle: "Les admins pourront examiner ton signalement sans accéder au contenu du message privé.",
  },
};

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset form state chaque fois que le modal (re-)ouvre
  useEffect(() => {
    if (open) {
      setReason(""); // eslint-disable-line react-hooks/set-state-in-effect
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const copy = TARGET_COPY[targetType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 10) {
      setError("Le motif doit faire au moins 10 caractères.");
      return;
    }
    startTransition(async () => {
      const payload = {
        reason: reason.trim(),
        reported_user_id: targetType === "user" ? targetId : null,
        reported_post_id: targetType === "post" ? targetId : null,
        reported_comment_id: targetType === "comment" ? targetId : null,
        reported_message_id: targetType === "message" ? targetId : null,
      };
      const result = await reportAction(payload);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }
      setSuccess(true);
      // Fermer automatiquement après 2s
      setTimeout(onClose, 2000);
    });
  };

  return (
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
            onClick={() => !isPending && onClose()}
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
              onClick={onClose}
              disabled={isPending}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>

            {success ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-cma-vert/10 flex items-center justify-center mx-auto mb-3">
                  <Check size={20} className="text-cma-vert" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Signalement envoyé
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Merci de contribuer à la sécurité de la communauté CMA.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                      <Flag size={16} className="text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {copy.title}
                      </h3>
                      <p className="text-xs text-gray-500">{targetLabel}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {copy.subtitle}
                  </p>
                </div>

                {error && (
                  <div className="mb-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="mb-5">
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-1.5 block">
                    Motif du signalement
                  </label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 500))}
                    rows={4}
                    maxLength={500}
                    placeholder="Explique ce qui pose problème (min. 10 caractères)..."
                    disabled={isPending}
                    className="rounded-xl text-sm resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-gray-400">
                      {reason.length < 10
                        ? `${10 - reason.length} caractères minimum`
                        : " "}
                    </p>
                    <p className="text-[10px] text-gray-400">{reason.length}/500</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1 h-10 rounded-xl text-sm"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || reason.trim().length < 10}
                    className="flex-1 h-10 rounded-xl text-sm bg-red-500 hover:bg-red-600 text-white gap-1"
                  >
                    {isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Flag size={14} />
                    )}
                    Signaler
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
