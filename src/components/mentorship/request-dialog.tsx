"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMentorshipRequestAction } from "@/actions/mentorship";
import Image from "next/image";
import type { SuggestedMentor } from "@/lib/types/mentorship";

interface RequestDialogProps {
  open: boolean;
  onClose: () => void;
  mentor: SuggestedMentor | null; // Null means open request
  studyFields: string[]; // Options for study_field
}

export function RequestDialog({ open, onClose, mentor, studyFields }: RequestDialogProps) {
  const [content, setContent] = useState("");
  const [studyField, setStudyField] = useState(mentor?.study_field || "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) {
      setError("Le contenu est requis");
      return;
    }
    if (!studyField) {
      setError("Le domaine d'études est requis");
      return;
    }
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.append("message", content.trim());
      formData.append("study_field", studyField);
      if (mentor) {
        formData.append("mentor_id", mentor.id);
      }

      const result = await sendMentorshipRequestAction(formData);

      if (!result.success) {
        setError(result.error ?? "Erreur technique");
        return;
      }

      setContent("");
      if (!mentor) setStudyField("");
      onClose();
    });
  };

  const initials = mentor
    ? `${(mentor.first_name || "?")[0]}${(mentor.last_name || "?")[0]}`
    : "?";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isPending && onClose()}
          />

          <motion.div
            className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[90vh]"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-900">
                {mentor ? "Demande de mentorat" : "Demande ouverte"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Target Indicator */}
              {mentor ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-cma-bordeaux flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden relative">
                    {mentor.avatar_url ? (
                      <Image src={mentor.avatar_url} alt="" fill className="object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {mentor.first_name} {mentor.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {mentor.profession_title || mentor.class}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-cma-or/10 border border-cma-or/20">
                  <p className="text-sm font-medium text-cma-or">Demande ouverte</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Votre demande sera visible par toutes les Alumni spécialisées dans le domaine sélectionné.
                  </p>
                </div>
              )}

              {/* Field Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Domaine concerné</label>
                {mentor ? (
                  <div className="w-full h-9 px-3 flex items-center rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-600">
                    {mentor.study_field}
                  </div>
                ) : (
                  <select
                    value={studyField}
                    onChange={(e) => setStudyField(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
                    disabled={isPending}
                  >
                    <option value="">Sélectionner un domaine *</option>
                    {studyFields.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Message d&apos;introduction</label>
                <div className="relative">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value.slice(0, 1000))}
                    placeholder="Présentez-vous brièvement, précisez vos objectifs et pourquoi vous cherchez un mentorat..."
                    rows={6}
                    disabled={isPending}
                    className="resize-none rounded-xl border-gray-200 focus:border-cma-bordeaux text-sm"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-gray-400">
                    {content.length}/1000
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 shrink-0">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !content.trim() || !studyField}
                className="w-full h-10 rounded-xl bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white gap-2 transition-all"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Envoyer la demande
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
