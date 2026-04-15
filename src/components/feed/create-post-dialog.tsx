"use client";

import { useState, useTransition, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPostAction } from "@/actions/forum";
import { uploadForumImage } from "@/lib/upload-forum-image";
import { createClient } from "@/utils/supabase/client";
import type { ForumTag } from "@/lib/types/forum";

interface CreatePostDialogProps {
  tags: ForumTag[];
  open: boolean;
  onClose: () => void;
  userId: string;
  promoId?: string;
}

export function CreatePostDialog({ tags, open, onClose, userId, promoId }: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [tagId, setTagId] = useState(() => tags.length === 1 ? tags[0].id : "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (max 5 MB)");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = () => {
    if (!content.trim()) { setError("Le contenu est requis"); return; }
    if (!tagId) { setError("Sélectionnez un tag"); return; }
    setError(null);

    startTransition(async () => {
      let imageUrl: string | null = null;

      if (imageFile) {
        const supabase = createClient();
        const result = await uploadForumImage(supabase, imageFile, userId);
        if (result.error) { setError(result.error); return; }
        imageUrl = result.url;
      }

      const result = await createPostAction({
        content: content.trim(),
        tag_id: tagId,
        image_url: imageUrl,
        promo_id: promoId,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }

      // Reset and close
      setContent("");
      setTagId(tags.length === 1 ? tags[0].id : "");
      removeImage();
      onClose();
    });
  };

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
            className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Nouveau post</h2>
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
            <div className="px-5 py-4 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* Tag selector */}
              {tags.length === 1 ? (
                <div className="flex items-center">
                  <span 
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ background: `${tags[0].color}15`, color: tags[0].color }}
                  >
                    {tags[0].name}
                  </span>
                </div>
              ) : (
                <select
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-cma-bordeaux"
                  disabled={isPending}
                >
                  <option value="">Choisir un tag *</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Content */}
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                  placeholder="Quoi de neuf ?"
                  rows={5}
                  disabled={isPending}
                  className="resize-none rounded-xl border-gray-200 focus:border-cma-bordeaux"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-gray-300">
                  {content.length}/2000
                </span>
              </div>

              {/* Image */}
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="w-full max-h-48 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Retirer l'image"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isPending}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ImagePlus size={18} />
                  Ajouter une image
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !content.trim() || !tagId}
                className="w-full h-10 rounded-xl bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white gap-2"
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Publier
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
