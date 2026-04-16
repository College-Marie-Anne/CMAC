"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2, Reply, Flag } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { ReactionBar } from "./reaction-bar";
import { CommentForm } from "./comment-form";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { renderContentWithMentions } from "@/lib/mentions";
import { timeAgo } from "@/lib/time-ago";
import { editCommentAction, deleteOwnCommentAction } from "@/actions/forum";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ForumComment } from "@/lib/types/forum";

interface CommentItemProps {
  comment: ForumComment;
  postId: string;
  currentUserId: string;
  isAdmin: boolean;
  depth?: number;
}

export function CommentItem({
  comment,
  postId,
  currentUserId,
  isAdmin,
  depth = 0,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // isLocallyDeleted : masque le commentaire IMMÉDIATEMENT après la suppression,
  // sans attendre le re-fetch serveur. Sans ce flag, `deleteOwnCommentAction`
  // UPDATE is_deleted=true en DB + revalidatePath mais le state React local ne
  // bouge pas → le commentaire reste visible jusqu'à navigation/reload, ce qui
  // donnait l'impression que "la suppression ne marche pas".
  const [isLocallyDeleted, setIsLocallyDeleted] = useState(false);
  const router = useRouter();
  const isAuthor = comment.author?.id === currentUserId;
  const canShowMenu = isAuthor || isAdmin || (!!comment.author && !!currentUserId);

  if (isLocallyDeleted) return null;

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    const result = await editCommentAction(comment.id, {
      content: editContent.trim(),
    });
    if (result.success) setIsEditing(false);
  };

  return (
    <div className={`${depth > 0 ? "ml-8 pl-4 border-l-2 border-gray-100" : ""}`}>
      <div className="py-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <UserAvatar
              firstName={comment.author?.first_name ?? null}
              lastName={comment.author?.last_name ?? null}
              avatarUrl={comment.author?.avatar_url}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {comment.author ? (
                  <Link href={`/profile/${comment.author.username}`} className="text-sm font-medium text-gray-900 hover:underline">
                    {comment.author.first_name} {comment.author.last_name}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-gray-400">Utilisatrice supprimée</span>
                )}
                <span className="text-xs text-gray-400">
                  {timeAgo(comment.created_at)}
                </span>
                {comment.is_edited && (
                  <span className="text-xs text-gray-400 italic">modifié</span>
                )}
              </div>

              {/* Content / Edit mode */}
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value.slice(0, 500))}
                    rows={2}
                    className="resize-none rounded-xl text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      className="rounded-lg text-xs bg-cma-vert text-white"
                    >
                      Enregistrer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditing(false);
                        setEditContent(comment.content);
                      }}
                      className="rounded-lg text-xs"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {renderContentWithMentions(comment.content)}
                </p>
              )}

              {/* Actions bar */}
              {!isEditing && (
                <div className="mt-2 flex items-center gap-3">
                  <ReactionBar
                    targetId={comment.id}
                    targetType="comment"
                    reactionCount={comment.reaction_count}
                    userReactions={comment.user_reactions}
                  />
                  {depth === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowReply(!showReply)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Reply size={12} />
                      Répondre
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Menu */}
          {canShowMenu && !isEditing && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Actions"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-36">
                    {isAuthor && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Pencil size={12} /> Modifier
                      </button>
                    )}
                    {/* Signaler — non-auteur non-admin */}
                    {!isAuthor && !isAdmin && comment.author && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setReportOpen(true);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Flag size={12} /> Signaler
                      </button>
                    )}
                    {(isAuthor || isAdmin) && (
                      <DeleteConfirmDialog
                        onConfirm={async () => {
                          const result = await deleteOwnCommentAction(comment.id);
                          if (result.success) {
                            setIsLocallyDeleted(true);
                            setShowMenu(false);
                            // Refetch pour aligner le compteur `comments.length`
                            // + retirer les réponses imbriquées éventuelles côté
                            // parent (CommentSection re-render après refresh).
                            router.refresh();
                          }
                        }}
                        title="Supprimer ce commentaire ?"
                        trigger={
                          // Pas de setShowMenu(false) ici : ce onClick ferait
                          // démonter le menu avant que DeleteConfirmDialog puisse
                          // passer son state interne à open=true (les 2 setState
                          // sont batched par React → le composant disparaît avant
                          // de pouvoir afficher le modal). Le menu ferme via
                          // l'overlay du dialog ou à la fin de onConfirm.
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        }
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Modal signalement */}
          <ReportDialog
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            targetType="comment"
            targetId={comment.id}
            targetLabel={comment.author ? `Commentaire de @${comment.author.username}` : "Commentaire"}
          />
        </div>

        {/* Reply form (inline) */}
        {showReply && depth === 0 && (
          <div className="mt-3 ml-10">
            <CommentForm
              postId={postId}
              parentId={comment.id}
              placeholder={`Répondre à ${comment.author?.first_name ?? ""}...`}
              onSuccess={() => setShowReply(false)}
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies?.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
