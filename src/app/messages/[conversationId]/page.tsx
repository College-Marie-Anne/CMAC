import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ConversationThread } from "@/components/messages/conversation-thread";
import type { DirectMessage, ConversationParticipant } from "@/lib/types/messaging";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}): Promise<Metadata> {
  const { conversationId } = await params;
  return {
    title: `Conversation — CMA Connect`,
    description: `Conversation ${conversationId}`,
  };
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify the conversation exists and user is a participant
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, participant_1, participant_2, archived_by_1, archived_by_2")
    .eq("id", conversationId)
    .single();

  if (convErr || !conv) notFound();

  const isP1 = conv.participant_1 === user.id;
  const isP2 = conv.participant_2 === user.id;
  if (!isP1 && !isP2) notFound();

  // Get the other participant's profile
  const otherId = isP1 ? conv.participant_2 : conv.participant_1;
  const { data: participantProfile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, username, avatar_url, last_seen_at")
    .eq("id", otherId)
    .single();

  const participant: ConversationParticipant = {
    id: otherId,
    first_name: participantProfile?.first_name ?? "Utilisatrice",
    last_name: participantProfile?.last_name ?? "supprimée",
    username: participantProfile?.username ?? "unknown",
    avatar_url: participantProfile?.avatar_url ?? null,
    last_seen_at: participantProfile?.last_seen_at ?? null,
  };

  // Fetch the 20 most recent messages (excluding ones deleted by this user)
  const { data: rawMessages } = await supabase
    .from("direct_messages")
    .select("id, conversation_id, sender_id, content, image_url, is_read, read_at, created_at, is_deleted_by_sender, is_deleted_by_receiver")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Filter out messages deleted by the current user
  const filteredMessages = (rawMessages ?? []).filter((m) => {
    if (m.sender_id === user.id && m.is_deleted_by_sender) return false;
    if (m.sender_id !== user.id && m.is_deleted_by_receiver) return false;
    return true;
  });

  // Reverse to chronological order (oldest first)
  // Generate signed URLs for images in private dm-images bucket
  const messages: DirectMessage[] = [];
  for (const m of filteredMessages.reverse()) {
    let resolvedImageUrl: string | null = m.image_url;

    if (m.image_url) {
      // image_url stores the storage path (e.g. "userId/uuid.jpg")
      const { data: signed } = await supabase.storage
        .from("dm-images")
        .createSignedUrl(m.image_url, 3600); // 1 hour
      resolvedImageUrl = signed?.signedUrl ?? null;
    }

    messages.push({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      content: m.content,
      image_url: resolvedImageUrl,
      is_read: m.is_read,
      read_at: m.read_at,
      created_at: m.created_at,
    });
  }

  // Mark unread messages from the other participant as read (server-side)
  const unreadIds = messages
    .filter((m) => m.sender_id === otherId && !m.is_read)
    .map((m) => m.id);

  if (unreadIds.length > 0) {
    await supabase
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  const isArchived = isP1 ? conv.archived_by_1 : conv.archived_by_2;

  return (
    <ConversationThread
      conversationId={conversationId}
      currentUserId={user.id}
      participant={participant}
      initialMessages={messages}
      initialHasMore={(rawMessages?.length ?? 0) === 20}
      isArchived={isArchived}
    />
  );
}
