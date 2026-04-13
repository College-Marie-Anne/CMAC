"use client";

import { useState, useTransition } from "react";
import { Send, Loader2 } from "lucide-react";
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
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await createCommentAction({
        content: content.trim(),
        post_id: postId,
        parent_id: parentId,
      });

      if (!result.success) {
        setError(result.error ?? "Erreur");
        return;
      }

      setContent("");
      onSuccess?.();
    });
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder={placeholder}
            rows={2}
            disabled={isPending}
            className="resize-none rounded-xl text-sm border-gray-200 focus:border-cma-bordeaux pr-12"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="absolute bottom-2 right-3 text-[9px] text-gray-300">
            {content.length}/500
          </span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          size="icon"
          className="shrink-0 rounded-xl bg-cma-bordeaux hover:bg-cma-bordeaux/90 text-white h-10 w-10 self-end"
          aria-label="Envoyer le commentaire"
        >
          {isPending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </Button>
      </div>
    </div>
  );
}
