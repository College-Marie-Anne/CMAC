"use client";

import { usePathname } from "next/navigation";
import { ConversationList } from "./conversation-list";
import type { Conversation } from "@/lib/types/messaging";

/**
 * Coquille responsive pour la messagerie.
 *
 * Problème résolu : avant, ConversationList était monté DEUX fois (une fois
 * dans layout.tsx pour desktop, une fois dans page.tsx pour mobile). Les deux
 * créaient un canal Supabase Realtime identique (`dm-list`) et une
 * subscription — cause probable du crash client "Application error".
 *
 * Maintenant, un seul ConversationList est monté, et la visibilité est gérée
 * via des classes Tailwind qui dépendent du pathname :
 *  - /messages (exactement)     → aside pleine largeur sur mobile, sidebar sur desktop
 *  - /messages/[conversationId] → aside cachée sur mobile, sidebar sur desktop
 *
 * Le `<main>` enfant gère symétriquement : visible sur mobile uniquement si on
 * est dans une conversation, toujours visible sur desktop.
 */
export function MessagesShell({
  conversations,
  initialHasMore,
  currentUserId,
  children,
}: {
  conversations: Conversation[];
  initialHasMore: boolean;
  currentUserId: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isOnList = pathname === "/messages";

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — conversation list.
            Mobile : visible uniquement sur /messages (pleine largeur).
            Desktop : toujours visible (sidebar). */}
        <aside
          className={
            (isOnList ? "flex w-full" : "hidden") +
            " lg:!flex lg:w-80 xl:w-96 lg:shrink-0 lg:border-r lg:border-gray-100 lg:flex-col flex-col"
          }
        >
          <ConversationList
            initialConversations={conversations}
            initialHasMore={initialHasMore}
            currentUserId={currentUserId}
          />
        </aside>

        {/* Main content — conversation thread ou empty state.
            Mobile : caché sur /messages (list pleine largeur), visible sur /messages/[id].
            Desktop : toujours visible. */}
        <main
          className={
            (isOnList ? "hidden" : "flex") +
            " lg:!flex flex-1 flex-col min-w-0"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
