"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Archive, User } from "lucide-react";
import { UserAvatar } from "@/components/feed/user-avatar";
import type { ConversationParticipant } from "@/lib/types/messaging";
import { useState } from "react";
import { archiveConversationAction } from "@/actions/messages";

interface ConversationHeaderProps {
  participant: ConversationParticipant;
  conversationId: string;
  isArchived: boolean;
}

function getOnlineStatus(lastSeenAt: string | null): { online: boolean; label: string } {
  if (!lastSeenAt) return { online: false, label: "Hors ligne" };
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < 5 * 60 * 1000) return { online: true, label: "En ligne" };
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return { online: false, label: `Vue il y a ${minutes} min` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, label: `Vue il y a ${hours}h` };
  const days = Math.floor(hours / 24);
  return { online: false, label: `Vue il y a ${days}j` };
}

export function ConversationHeader({
  participant,
  conversationId,
  isArchived,
}: ConversationHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { online, label } = getOnlineStatus(participant.last_seen_at);

  const handleArchive = async () => {
    setShowMenu(false);
    await archiveConversationAction(conversationId);
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 h-14 flex items-center gap-3 px-3 shrink-0">
      {/* Back button — visible on mobile, hidden on desktop split-view */}
      <Link
        href="/messages"
        className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Retour aux conversations"
      >
        <ArrowLeft size={20} />
      </Link>

      {/* Participant info */}
      <Link
        href={`/profile/${participant.username}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="relative shrink-0">
          <UserAvatar
            firstName={participant.first_name}
            lastName={participant.last_name}
            avatarUrl={participant.avatar_url}
            size="sm"
          />
          {online && (
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cma-vert border-2 border-white"
              aria-label="En ligne"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {participant.first_name} {participant.last_name}
          </p>
          <p className="text-[11px] text-gray-400 truncate">{label}</p>
        </div>
      </Link>

      {/* Menu */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          aria-label="Options"
        >
          <MoreHorizontal size={18} />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 w-48">
              <Link
                href={`/profile/${participant.username}`}
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={14} />
                Voir le profil
              </Link>
              <button
                type="button"
                onClick={handleArchive}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Archive size={14} />
                {isArchived ? "Désarchiver" : "Archiver"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
