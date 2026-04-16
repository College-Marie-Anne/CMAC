"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCommentAction } from "@/actions/forum";

interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  onSuccess?: () => void;
}

export function CommentForm({
  postId,
  parentId = null,
  placeholder = "Écrire un commentaire...",
  onSuccess,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Optimistic UI : on vide le textarea IMMÉDIATEMENT. Le commentaire
    // apparaîtra dans la liste via le subscribe Realtime de CommentSection
    // dès que l'INSERT serveur est propagé (~200–500 ms). Si l'action
    // échoue, on restore le contenu pour que l'utilisatrice puisse corriger.
    //
    // Sans cette optimistic, on avait un `disabled={isPending}` + spinner
    // Loader2 dans le bouton pendant ~500 ms → perception "lag" alors que
    // l'action est réellement instantanée côté réseau.
    setContent("");
    setError(null);
    onSuccess?.();

    startTransition(async () => {
      const result = await createCommentAction({
        content: trimmed,
        post_id: postId,
        parent_id: parentId,
      });

      if (!result.success) {
        // Restore le texte pour correction
        setContent(trimmed);
        setError(result.error ?? "Erreur lors de l'envoi");
      }
    });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-500 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 px-3 py-1.5">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder={placeholder}
            rows={2}
            className="resize-none rounded-xl text-sm border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-cma-bordeaux pr-12"
            style={{ colorScheme: "light" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="absolute bottom-2 right-3 text-[9px] text-gray-300 pointer-events-none">
            {content.length}/500
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!content.trim()}
          size="icon"
          className="shrink-0 rounded-xl bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white h-10 w-10 self-end"
          aria-label="Envoyer le commentaire"
        >
          <Send size={16} />
        </Button>
      </div>
    </div>
  );
}
