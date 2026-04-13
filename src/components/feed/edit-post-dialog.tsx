"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { editPostAction } from "@/actions/forum";

interface EditPostDialogProps {
  postId: string;
  initialContent: string;
  open: boolean;
  onClose: () => void;
}

export function EditPostDialog({ postId, initialContent, open, onClose }: EditPostDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) { setError("Le contenu est requis"); return; }
    setError(null);
    startTransition(async () => {
      const result = await editPostAction(postId, { content: content.trim() });
      if (!result.success) { setError(result.error ?? "Erreur"); return; }
      onClose();
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
          <motion.div className="absolute inset-0 bg-black/50" onClick={() => !isPending && onClose()} />
          <motion.div
            className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Modifier le post</h2>
              <button type="button" onClick={onClose} disabled={isPending} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Fermer">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>}
              <div className="relative">
                <Textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 2000))} rows={5} disabled={isPending} className="resize-none rounded-xl" />
                <span className="absolute bottom-2 right-3 text-[10px] text-gray-300">{content.length}/2000</span>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100">
              <Button onClick={handleSubmit} disabled={isPending || !content.trim()} className="w-full h-10 rounded-xl bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white gap-2">
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Enregistrer
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
