"use client";

import { MessageSquare } from "lucide-react";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import type { ForumComment } from "@/lib/types/forum";

interface CommentSectionProps {
  postId: string;
  comments: ForumComment[];
  currentUserId: string;
  isAdmin: boolean;
}

export function CommentSection({
  postId,
  comments,
  currentUserId,
  isAdmin,
}: CommentSectionProps) {
  // Group: top-level comments (parent_id is null) with replies nested
  const topLevel = comments.filter((c) => !c.parent_id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-700">
          {comments.length} commentaire{comments.length !== 1 ? "s" : ""}
        </h3>
      </div>

      {/* New comment form */}
      <CommentForm postId={postId} />

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">
          Soyez la première à commenter
        </p>
      ) : (
        <div className="divide-y divide-gray-50">
          {topLevel.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
