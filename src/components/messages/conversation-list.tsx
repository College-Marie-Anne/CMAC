"use client";

import { useState, useEffect, useTransition, useId } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Archive, Loader2, MessageSquarePlus } from "lucide-react";
import { UserAvatar } from "@/components/feed/user-avatar";
import { MessagesEmptyState } from "./messages-empty-state";
import { NewConversationDialog } from "./new-conversation-dialog";
import { timeAgo } from "@/lib/time-ago";
import { createClient } from "@/utils/supabase/client";
import type { Conversation } from "@/lib/types/messaging";

interface ConversationListProps {
  initialConversations: Conversation[];
  initialHasMore: boolean;
  currentUserId: string;
}

export function ConversationList({
  initialConversations,
  initialHasMore,
  currentUserId,
}: ConversationListProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [showArchived, setShowArchived] = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [isLoadingMore, startLoadMore] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const instanceId = useId();

  // Determine which conversation is active from URL
  const activeConvId = pathname.startsWith("/messages/")
    ? pathname.split("/messages/")[1]?.split("/")[0] ?? null
    : null;

  // Realtime: listen for new messages to update preview + unread count.
  // Channel name unique par instance pour éviter le bug Supabase JS où
  // 2 hooks avec même nom partagent l'instance et la 2ème échoue à .on().
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`dm-list:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
          };

          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.id !== newMsg.conversation_id) return conv;
              return {
                ...conv,
                last_message_at: newMsg.created_at,
                last_message_preview:
                  newMsg.content.length > 80
                    ? newMsg.content.slice(0, 80) + "…"
                    : newMsg.content,
                unread_count:
                  newMsg.sender_id !== currentUserId
                    ? conv.unread_count + 1
                    : conv.unread_count,
              };
            });

            // Sort by last_message_at DESC
            return updated.sort((a, b) => {
              const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return bTime - aTime;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, instanceId]);

  // Filter by archive state
  const filtered = conversations.filter((c) =>
    showArchived ? c.is_archived : !c.is_archived
  );

  // Load more conversations
  const loadMore = () => {
    if (!hasMore || isLoadingMore) return;
    if (conversations.length === 0) return;

    startLoadMore(async () => {
      const supabase = createClient();
      const from = conversations.length;
      const to = from + 19;
      const { data: convs } = await supabase
        .from("conversations")
        .select(`
          id, participant_1, participant_2, last_message_at,
          archived_by_1, archived_by_2
        `)
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (!convs || convs.length === 0) {
        setHasMore(false);
        return;
      }

      // Enrich with participant profiles + unread counts
      const enriched = await enrichConversations(supabase, convs, currentUserId);
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const deduped = enriched.filter((c) => !seen.has(c.id));
        return [...prev, ...deduped];
      });
      setHasMore(convs.length === 20);
    });
  };

  // When clicking on a conversation, reset its unread count locally
  const handleConvClick = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  };

  const archivedCount = conversations.filter((c) => c.is_archived).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-gray-900">Messages</h1>
          <button
            type="button"
            onClick={() => setNewConvOpen(true)}
            className="p-2 rounded-xl bg-cma-bordeaux text-white hover:bg-cma-bordeaux-dark transition-colors"
            aria-label="Nouvelle conversation"
          >
            <MessageSquarePlus size={18} />
          </button>
        </div>

        {/* Archive toggle */}
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
              showArchived
                ? "bg-cma-bordeaux/10 text-cma-bordeaux"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Archive size={12} />
            {showArchived ? "Conversations actives" : `Archivées (${archivedCount})`}
          </button>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          showArchived ? (
            <div className="text-center py-16 text-sm text-gray-400">
              Aucune conversation archivée
            </div>
          ) : (
            <MessagesEmptyState onNewConversation={() => setNewConvOpen(true)} />
          )
        ) : (
          <div>
            {filtered.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  handleConvClick(conv.id);
                  router.push(`/messages/${conv.id}`);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                  activeConvId === conv.id ? "bg-cma-bordeaux/5" : ""
                }`}
              >
                {/* Avatar with online indicator */}
                <div className="relative shrink-0">
                  <UserAvatar
                    firstName={conv.participant.first_name}
                    lastName={conv.participant.last_name}
                    avatarUrl={conv.participant.avatar_url}
                  />
                  {isOnline(conv.participant.last_seen_at) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-cma-vert border-2 border-white" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-sm truncate ${
                        conv.unread_count > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                      }`}
                    >
                      {conv.participant.first_name} {conv.participant.last_name}
                    </p>
                    {conv.last_message_at && (
                      <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {timeAgo(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        conv.unread_count > 0 ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      {conv.last_message_preview ?? "Nouvelle conversation"}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-cma-bordeaux text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count > 9 ? "9+" : conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 mx-auto"
                >
                  {isLoadingMore && <Loader2 size={12} className="animate-spin" />}
                  Charger plus
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New conversation dialog */}
      <NewConversationDialog
        open={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

/* ─── helpers ─── */

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000; // 5 min
}

/* Enrich raw conversation rows with participant profile + unread count */
async function enrichConversations(
  supabase: ReturnType<typeof createClient>,
  convs: {
    id: string;
    participant_1: string;
    participant_2: string;
    last_message_at: string | null;
    archived_by_1: boolean;
    archived_by_2: boolean;
  }[],
  currentUserId: string
): Promise<Conversation[]> {
  // Get all other participant IDs
  const otherIds = convs.map((c) =>
    c.participant_1 === currentUserId ? c.participant_2 : c.participant_1
  );

  // Fetch participant profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, avatar_url, last_seen_at")
    .in("id", otherIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  // Fetch last message for each conversation for preview
  const convIds = convs.map((c) => c.id);
  const { data: lastMessages } = await supabase
    .from("direct_messages")
    .select("conversation_id, content, created_at, sender_id, is_deleted_by_sender, is_deleted_by_receiver")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false });

  const lastMsgMap = new Map<string, { content: string }>();
  for (const msg of lastMessages ?? []) {
    const hiddenForCurrentUser =
      (msg.sender_id === currentUserId && msg.is_deleted_by_sender) ||
      (msg.sender_id !== currentUserId && msg.is_deleted_by_receiver);
    if (hiddenForCurrentUser) continue;
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, { content: msg.content });
    }
  }

  // Fetch unread counts
  const { data: unreadRows } = await supabase
    .from("direct_messages")
    .select("conversation_id")
    .in("conversation_id", convIds)
    .neq("sender_id", currentUserId)
    .eq("is_deleted_by_receiver", false)
    .eq("is_read", false);

  const unreadMap = new Map<string, number>();
  for (const r of unreadRows ?? []) {
    unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) ?? 0) + 1);
  }

  return convs.map((c) => {
    const otherId = c.participant_1 === currentUserId ? c.participant_2 : c.participant_1;
    const isP1 = c.participant_1 === currentUserId;
    const profile = profileMap.get(otherId);
    const lastMsg = lastMsgMap.get(c.id);

    return {
      id: c.id,
      participant: {
        id: otherId,
        first_name: profile?.first_name ?? "Utilisatrice",
        last_name: profile?.last_name ?? "supprimée",
        username: profile?.username ?? "unknown",
        avatar_url: profile?.avatar_url ?? null,
        last_seen_at: profile?.last_seen_at ?? null,
      },
      last_message_at: c.last_message_at,
      last_message_preview: lastMsg
        ? lastMsg.content.length > 80
          ? lastMsg.content.slice(0, 80) + "…"
          : lastMsg.content
        : null,
      unread_count: unreadMap.get(c.id) ?? 0,
      is_archived: isP1 ? c.archived_by_1 : c.archived_by_2,
    };
  });
}
