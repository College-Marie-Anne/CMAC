"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pin, MoreHorizontal, Pencil, Trash2, MessageSquare, Flag } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { TagBadge } from "./tag-badge";
import { ReactionBar } from "./reaction-bar";
import { EditPostDialog } from "./edit-post-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { renderContentWithMentions } from "@/lib/mentions";
import { timeAgo } from "@/lib/time-ago";
import { deleteOwnPostAction, pinPostAction } from "@/actions/forum";
import { deletePostAction as deletePostAsAdminAction } from "@/actions/admin";
import type { ForumPost } from "@/lib/types/forum";

interface PostCardProps {
  post: ForumPost;
  currentUserId: string;
  isAdmin: boolean;
  canPin?: boolean;
}

export function PostCard({ post, currentUserId, isAdmin, canPin }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // isLocallyDeleted : masque le post IMMÉDIATEMENT après suppression, sans
  // attendre le re-fetch serveur ni le subscribe Realtime. Sans ça, le post
  // pouvait rester visible pendant plusieurs secondes après un delete.
  const [isLocallyDeleted, setIsLocallyDeleted] = useState(false);
  const router = useRouter();
  const isAuthor = post.author?.id === currentUserId;
  // Le menu s'affiche pour tout le monde (signalement dispo pour non-auteurs non-admin)
  // SAUF si le post n'a pas d'auteur visible (utilisatrice supprimée)
  const canShowMenu = isAuthor || isAdmin || (!!post.author && !!currentUserId);

  if (isLocallyDeleted) return null;

  return (
    <article className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar
            firstName={post.author?.first_name ?? null}
            lastName={post.author?.last_name ?? null}
            avatarUrl={post.author?.avatar_url}
          />
          <div>
            <div className="flex items-center gap-2">
              {post.author ? (
                <Link href={`/profile/${post.author.username}`} className="text-sm font-medium text-gray-900 hover:underline">
                  {post.author.first_name} {post.author.last_name}
                </Link>
              ) : (
                <p className="text-sm font-medium text-gray-400">Utilisatrice supprimée</p>
              )}
              {post.is_pinned && (
                <Pin size={12} className="text-cma-or" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {post.author && <span>@{post.author.username}</span>}
              <span>&middot;</span>
              <span>{timeAgo(post.created_at)}</span>
              {post.is_edited && (
                <>
                  <span>&middot;</span>
                  <span className="italic">modifié</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions menu */}
        {canShowMenu && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
              aria-label="Actions"
            >
              <MoreHorizontal size={16} />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-40">
                  {isAuthor && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setEditOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil size={14} /> Modifier
                    </button>
                  )}
                  {(isAdmin || canPin) && (
                    <button
                      type="button"
                      onClick={async () => { setShowMenu(false); await pinPostAction(post.id); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pin size={14} /> {post.is_pinned ? "Désépingler" : "Épingler"}
                    </button>
                  )}
                  {/* Signaler : disponible pour non-auteur non-admin */}
                  {!isAuthor && !isAdmin && post.author && (
                    <button
                      type="button"
                      onClick={() => { setShowMenu(false); setReportOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Flag size={14} /> Signaler
                    </button>
                  )}
                  {(isAuthor || isAdmin) && (
                    <DeleteConfirmDialog
                      onConfirm={async () => {
                        // Route vers la bonne action selon le rôle — sans ça,
                        // un admin qui supprime le post d'un autre échoue
                        // silencieusement (deleteOwnPostAction filtre
                        // author_id=user.id → 0 rows updated, success:true
                        // trompeur). Même bug que celui des commentaires.
                        const result = isAuthor
                          ? await deleteOwnPostAction(post.id)
                          : await deletePostAsAdminAction(post.id);
                        if (result.success) {
                          setIsLocallyDeleted(true);
                          setShowMenu(false);
                          router.refresh();
                        }
                      }}
                      trigger={
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} /> Supprimer
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
          targetType="post"
          targetId={post.id}
          targetLabel={post.author ? `Post de @${post.author.username}` : "Post"}
        />
      </div>

      {/* Tag */}
      <div className="px-4 pb-2">
        <TagBadge name={post.tag.name} color={post.tag.color} />
      </div>

      {/* Content */}
      <div className="px-4 pb-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {renderContentWithMentions(post.content)}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="px-4 pb-3">
          <Image
            src={post.image_url}
            alt="Image du post"
            width={600}
            height={400}
            className="w-full max-h-80 object-cover rounded-xl"
          />
        </div>
      )}

      {/* Footer: reactions + comments */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <ReactionBar
          targetId={post.id}
          targetType="post"
          reactionCount={post.reaction_count}
          userReactions={post.user_reactions}
          currentUserId={currentUserId}
        />
        <Link
          href={`/feed/${post.id}`}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MessageSquare size={14} />
          {post.comment_count > 0 ? `${post.comment_count} commentaire${post.comment_count > 1 ? "s" : ""}` : "Commenter"}
        </Link>
      </div>

      {/* Edit dialog */}
      <EditPostDialog
        postId={post.id}
        initialContent={post.content}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </article>
  );
}
