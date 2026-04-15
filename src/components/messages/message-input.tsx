"use client";

import { useState, useRef, useCallback } from "react";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";
import { sendMessageAction } from "@/actions/messages";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/lib/image-compress";

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onMessageSent?: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function MessageInput({ conversationId, userId, onMessageSent }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`; // Max ~4 lines
    }
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non supporté (JPG, PNG ou WebP)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Image trop lourde (max 5 MB)");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent && !imageFile) return;
    if (isSending) return;

    setIsSending(true);
    setError(null);

    try {
      let imageUrl: string | null = null;

      // Upload image first if present
      if (imageFile) {
        const supabase = createClient();

        // Compression côté client à 1200px max (spec §806)
        let toUpload: File;
        try {
          toUpload = await compressImage(imageFile, { maxWidth: 1200 });
        } catch {
          // Fallback : si compression échoue, on upload l'original
          toUpload = imageFile;
        }

        const ext = (toUpload.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("dm-images")
          .upload(path, toUpload, { upsert: false });

        if (uploadError) {
          setError("Erreur lors de l'upload de l'image");
          setIsSending(false);
          return;
        }

        // Store the path; signed URLs are generated when displaying
        imageUrl = path;
      }

      const result = await sendMessageAction(conversationId, {
        content: trimmedContent || " ", // Ensure content is not empty (image-only messages get a space)
        image_url: imageUrl,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur inconnue");
        setIsSending(false);
        return;
      }

      // Clear input
      setContent("");
      removeImage();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      onMessageSent?.();
    } catch {
      setError("Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = (content.trim().length > 0 || imageFile !== null) && !isSending;

  return (
    <div className="border-t border-gray-100 bg-white p-3 shrink-0">
      {/* Error toast */}
      {error && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <Image
            src={imagePreview}
            alt="Image à envoyer"
            width={120}
            height={80}
            className="rounded-xl object-cover max-h-20"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700"
            aria-label="Supprimer l'image"
          >
            <X size={10} />
          </button>
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 shrink-0"
          aria-label="Joindre une image"
        >
          <ImagePlus size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Votre message…"
          rows={1}
          maxLength={1000}
          disabled={isSending}
          className="flex-1 resize-none rounded-2xl bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cma-bordeaux/20 focus:border-cma-bordeaux/30 disabled:opacity-50 transition-colors"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className="p-2.5 rounded-xl bg-cma-bordeaux text-white hover:bg-cma-bordeaux-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="Envoyer"
        >
          {isSending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
