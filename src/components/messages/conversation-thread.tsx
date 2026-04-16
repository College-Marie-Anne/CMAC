"use client";

import { useState, useEffect, useRef, useCallback, useTransition, useId } from "react";
import { Loader2 } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { ConversationHeader } from "./conversation-header";
import { markMessagesAsReadAction } from "@/actions/messages";
import { createClient } from "@/utils/supabase/client";
import type { DirectMessage, ConversationParticipant } from "@/lib/types/messaging";

interface ConversationThreadProps {
  conversationId: string;
  currentUserId: string;
  participant: ConversationParticipant;
  initialMessages: DirectMessage[];
  initialHasMore: boolean;
  isArchived: boolean;
}

export function ConversationThread({
  conversationId,
  currentUserId,
  participant,
  initialMessages,
  initialHasMore,
  isArchived,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, startLoadMore] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const instanceId = useId();

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!initialScrollDone.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "instant" });
      initialScrollDone.current = true;
    }
  }, []);

  // Mark messages as read on mount
  useEffect(() => {
    markMessagesAsReadAction(conversationId);
  }, [conversationId]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    // Channel name unique par instance (évite conflit Supabase JS si la même
    // conversation est ouverte dans 2 contextes simultanés).
    const channel = supabase
      .channel(`dm:${conversationId}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const raw = payload.new as DirectMessage & {
            is_deleted_by_sender?: boolean;
            is_deleted_by_receiver?: boolean;
          };

          // Skip messages deleted by this user
          if (raw.sender_id === currentUserId && raw.is_deleted_by_sender) return;
          if (raw.sender_id !== currentUserId && raw.is_deleted_by_receiver) return;

          // Resolve signed URL for images in private bucket
          let resolvedMsg = { ...raw } as DirectMessage;
          if (raw.image_url) {
            const { data: signed } = await supabase.storage
              .from("dm-images")
              .createSignedUrl(raw.image_url, 3600);
            resolvedMsg = { ...resolvedMsg, image_url: signed?.signedUrl ?? null };
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === resolvedMsg.id)) return prev;
            return [...prev, resolvedMsg];
          });

          // Auto-scroll to bottom if near bottom
          requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (el) {
              const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
              if (isNearBottom || resolvedMsg.sender_id === currentUserId) {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
              }
            }
          });

          // Mark as read if the message is from the other participant
          if (resolvedMsg.sender_id !== currentUserId) {
            markMessagesAsReadAction(conversationId);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as DirectMessage & {
            is_deleted_by_sender?: boolean;
            is_deleted_by_receiver?: boolean;
          };
          const hiddenForCurrentUser =
            (updated.sender_id === currentUserId && updated.is_deleted_by_sender) ||
            (updated.sender_id !== currentUserId && updated.is_deleted_by_receiver);

          setMessages((prev) => {
            if (hiddenForCurrentUser) {
              return prev.filter((m) => m.id !== updated.id);
            }
            return prev.map((m) =>
              m.id === updated.id ? { ...m, is_read: updated.is_read, read_at: updated.read_at } : m
            );
          });
        }
      )
      .subscribe((status, err) => {
        // Status callback — utile pour diagnostiquer les échecs silencieux
        // (TIMED_OUT, CHANNEL_ERROR) qui laissaient la conversation "figée"
        // sans aucun log. On se limite au warn pour éviter le bruit en dev.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(`[realtime:dm-thread] ${status}`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, instanceId]);

  // Load older messages
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const oldestMsg = messages[0];
    if (!oldestMsg) return;

    startLoadMore(async () => {
      const supabase = createClient();
      const { data: older } = await supabase
        .from("direct_messages")
        .select("id, conversation_id, sender_id, content, image_url, is_read, read_at, created_at, is_deleted_by_sender, is_deleted_by_receiver")
        .eq("conversation_id", conversationId)
        .lt("created_at", oldestMsg.created_at)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!older || older.length === 0) {
        setHasMore(false);
        return;
      }

      // Filter deleted messages
      const filtered = older.filter((m) => {
        if (m.sender_id === currentUserId && m.is_deleted_by_sender) return false;
        if (m.sender_id !== currentUserId && m.is_deleted_by_receiver) return false;
        return true;
      });

      // Resolve signed URLs for images
      const resolved: DirectMessage[] = [];
      for (const m of filtered) {
        let imageUrl = m.image_url;
        if (m.image_url) {
          const { data: signed } = await supabase.storage
            .from("dm-images")
            .createSignedUrl(m.image_url, 3600);
          imageUrl = signed?.signedUrl ?? null;
        }
        resolved.push({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          content: m.content,
          image_url: imageUrl,
          is_read: m.is_read,
          read_at: m.read_at,
          created_at: m.created_at,
        });
      }

      const reversed = resolved.reverse();

      // Preserve scroll position
      const el = scrollRef.current;
      const prevScrollHeight = el?.scrollHeight ?? 0;

      setMessages((prev) => [...reversed, ...prev]);
      setHasMore(older.length === 20);

      // Restore scroll position after prepend
      requestAnimationFrame(() => {
        if (el) {
          const newScrollHeight = el.scrollHeight;
          el.scrollTop = newScrollHeight - prevScrollHeight;
        }
      });
    });
  }, [hasMore, isLoadingMore, messages, conversationId, currentUserId]);

  // Handle scroll to top for loading more
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el && el.scrollTop < 100 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Scroll to bottom when user sends a new message
  const handleMessageSent = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  // Group messages by date for visual separators
  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <ConversationHeader
        participant={participant}
        conversationId={conversationId}
        isArchived={isArchived}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
      >
        {/* Load more indicator */}
        {hasMore && (
          <div className="text-center py-3">
            {isLoadingMore ? (
              <Loader2 size={18} className="animate-spin text-gray-400 mx-auto" />
            ) : (
              <button
                type="button"
                onClick={loadMore}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Charger les messages précédents
              </button>
            )}
          </div>
        )}

        {/* Grouped messages */}
        {messageGroups.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide shrink-0">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Messages in this date group */}
            {group.messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
              const isSameSender = prevMsg?.sender_id === msg.sender_id;
              const timeDiff = prevMsg
                ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
                : Infinity;
              const showTimestamp = !isSameSender || timeDiff > 5 * 60 * 1000; // 5 min gap

              return (
                <div key={msg.id} className={!isSameSender ? "mt-3" : ""}>
                  <MessageBubble
                    message={msg}
                    isMine={msg.sender_id === currentUserId}
                    showTimestamp={showTimestamp}
                  />
                </div>
              );
            })}
          </div>
        ))}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        userId={currentUserId}
        onMessageSent={handleMessageSent}
      />
    </div>
  );
}

/* ─── helper: group messages by date ─── */

function groupMessagesByDate(
  messages: DirectMessage[]
): { date: string; label: string; messages: DirectMessage[] }[] {
  const groups: Map<string, DirectMessage[]> = new Map();

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const monthNames = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];

  return Array.from(groups.entries()).map(([date, msgs]) => {
    let label: string;
    if (date === todayStr) {
      label = "aujourd'hui";
    } else if (date === yesterdayStr) {
      label = "hier";
    } else {
      const d = new Date(date + "T00:00:00");
      label = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    }
    return { date, label, messages: msgs };
  });
}
