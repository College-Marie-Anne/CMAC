import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/lib/types/messaging";

/**
 * /messages — conversation list page.
 *
 * On mobile: this is the full-screen conversation list.
 * On desktop: the layout already shows the sidebar; this page shows an
 *             empty state in the main content area prompting to select a conversation.
 */
export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // For mobile: we need to show the conversation list here as well
  // (the layout sidebar is hidden on mobile)
  const { data: rawConvs } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, last_message_at, archived_by_1, archived_by_2")
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20);

  let conversations: Conversation[] = [];

  if (rawConvs && rawConvs.length > 0) {
    const otherIds = rawConvs.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, avatar_url, last_seen_at")
      .in("id", otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    const convIds = rawConvs.map((c) => c.id);
    const { data: lastMessages } = await supabase
      .from("direct_messages")
      .select("conversation_id, content, sender_id, is_deleted_by_sender, is_deleted_by_receiver")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, string>();
    for (const msg of lastMessages ?? []) {
      const hiddenForCurrentUser =
        (msg.sender_id === user.id && msg.is_deleted_by_sender) ||
        (msg.sender_id !== user.id && msg.is_deleted_by_receiver);
      if (hiddenForCurrentUser) continue;
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg.content);
      }
    }

    const { data: unreadRows } = await supabase
      .from("direct_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
      .eq("is_deleted_by_receiver", false)
      .eq("is_read", false);

    const unreadMap = new Map<string, number>();
    for (const r of unreadRows ?? []) {
      unreadMap.set(r.conversation_id, (unreadMap.get(r.conversation_id) ?? 0) + 1);
    }

    conversations = rawConvs.map((c) => {
      const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
      const isP1 = c.participant_1 === user.id;
      const p = profileMap.get(otherId);
      const lastContent = lastMsgMap.get(c.id);

      return {
        id: c.id,
        participant: {
          id: otherId,
          first_name: p?.first_name ?? "Utilisatrice",
          last_name: p?.last_name ?? "supprimée",
          username: p?.username ?? "unknown",
          avatar_url: p?.avatar_url ?? null,
          last_seen_at: p?.last_seen_at ?? null,
        },
        last_message_at: c.last_message_at,
        last_message_preview: lastContent
          ? lastContent.length > 80
            ? lastContent.slice(0, 80) + "…"
            : lastContent
          : null,
        unread_count: unreadMap.get(c.id) ?? 0,
        is_archived: isP1 ? c.archived_by_1 : c.archived_by_2,
      };
    });
  }

  return (
    <>
      {/* Mobile: show conversation list (layout sidebar is hidden on mobile) */}
      <div className="lg:hidden flex-1">
        <ConversationList
          initialConversations={conversations}
          initialHasMore={(rawConvs?.length ?? 0) === 20}
          currentUserId={user.id}
        />
      </div>

      {/* Desktop: show empty state in main panel (list is in layout sidebar) */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-cma-bordeaux/5 flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-cma-bordeaux/30" />
          </div>
          <p className="text-sm text-gray-500 font-medium">
            Sélectionnez une conversation
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Ou commencez-en une nouvelle
          </p>
        </div>
      </div>
    </>
  );
}
