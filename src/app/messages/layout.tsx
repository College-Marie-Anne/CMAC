import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ConversationList } from "@/components/messages/conversation-list";
import type { Conversation } from "@/lib/types/messaging";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages — CMA Connect",
  description: "Messagerie privée de la communauté CMA Connect",
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  // Admins are excluded from messaging per RLS spec
  if (profile.role === "admin") {
    redirect("/feed");
  }

  // Update last_seen_at
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  // Fetch conversations
  const { data: rawConvs } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, last_message_at, archived_by_1, archived_by_2")
    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(20);

  let conversations: Conversation[] = [];

  if (rawConvs && rawConvs.length > 0) {
    // Get other participant IDs
    const otherIds = rawConvs.map((c) =>
      c.participant_1 === user.id ? c.participant_2 : c.participant_1
    );

    // Fetch participant profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, avatar_url, last_seen_at")
      .in("id", otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    // Fetch last message for each conversation (for preview)
    const convIds = rawConvs.map((c) => c.id);
    const { data: lastMessages } = await supabase
      .from("direct_messages")
      .select("conversation_id, content")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMsgMap = new Map<string, string>();
    for (const msg of lastMessages ?? []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg.content);
      }
    }

    // Fetch unread counts
    const { data: unreadRows } = await supabase
      .from("direct_messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_id", user.id)
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
    <div className="h-screen flex flex-col bg-white">
      {/* Desktop split-view / Mobile full-screen */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — conversation list */}
        {/* On desktop: always visible as a sidebar */}
        {/* On mobile: visible only on /messages (hidden when a conversation is open) */}
        <aside className="w-full lg:w-80 xl:w-96 lg:shrink-0 lg:border-r lg:border-gray-100 lg:flex lg:flex-col hidden lg:!flex">
          <ConversationList
            initialConversations={conversations}
            initialHasMore={(rawConvs?.length ?? 0) === 20}
            currentUserId={user.id}
          />
        </aside>

        {/* Main content area */}
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
