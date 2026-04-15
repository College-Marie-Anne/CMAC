"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendMessageSchema,
  type SendMessageData,
} from "@/lib/validations/messaging";
import {
  sendMessageLimiter,
  createConversationLimiter,
  checkRateLimit,
} from "@/lib/rate-limit";

export type MessagingActionResult = {
  success: boolean;
  error?: string;
  conversationId?: string;
  messageId?: string;
};

/* ─── helper: require authenticated active user ─── */

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile || profile.status !== "active")
    throw new Error("Compte inactif");

  // Admins are explicitly excluded from messaging (per RLS spec)
  if (profile.role === "admin")
    throw new Error("Les admins n'ont pas accès à la messagerie");

  return { supabase, user, profile };
}

/* ─── conversations ─── */

export async function createConversationAction(
  otherUserId: string
): Promise<MessagingActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(
      createConversationLimiter,
      user.id
    );
    if (!allowed) {
      const min = Math.ceil((resetAt - Date.now()) / 60000);
      return { success: false, error: `Trop de conversations. Réessayez dans ${min} min` };
    }

    const { data, error } = await supabase.rpc("create_conversation", {
      p_other_user_id: otherUserId,
    });

    if (error) {
      // Map RPC errors to user-friendly messages
      if (error.message.includes("blocked"))
        return { success: false, error: "Impossible de contacter cette utilisatrice" };
      if (error.message.includes("yourself"))
        return { success: false, error: "Vous ne pouvez pas vous envoyer un message" };
      return { success: false, error: error.message };
    }

    revalidatePath("/messages");
    return { success: true, conversationId: data as string };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─── messages ─── */

export async function sendMessageAction(
  conversationId: string,
  data: SendMessageData
): Promise<MessagingActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    const { allowed, resetAt } = await checkRateLimit(
      sendMessageLimiter,
      user.id
    );
    if (!allowed) {
      const sec = Math.ceil((resetAt - Date.now()) / 1000);
      return { success: false, error: `Trop de messages. Réessayez dans ${sec}s` };
    }

    const parsed = sendMessageSchema.safeParse(data);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    const { data: msgId, error } = await supabase.rpc("send_direct_message", {
      p_conversation_id: conversationId,
      p_content: parsed.data.content,
      p_image_url: parsed.data.image_url ?? null,
    });

    if (error) {
      if (error.message.includes("blocked"))
        return { success: false, error: "Vous avez été bloquée par cette utilisatrice" };
      if (error.message.includes("not active"))
        return { success: false, error: "Votre compte n'est pas actif" };
      if (error.message.includes("Not a participant"))
        return { success: false, error: "Vous ne participez pas à cette conversation" };
      return { success: false, error: error.message };
    }

    return { success: true, messageId: msgId as string };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function markMessagesAsReadAction(
  conversationId: string
): Promise<MessagingActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Get the conversation to determine if user is participant_1 or participant_2
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", conversationId)
      .single();

    if (convErr || !conv) return { success: false, error: "Conversation introuvable" };

    const isParticipant = conv.participant_1 === user.id || conv.participant_2 === user.id;
    if (!isParticipant) return { success: false, error: "Accès interdit" };

    // Mark all unread messages FROM the other participant as read
    const otherUserId = conv.participant_1 === user.id
      ? conv.participant_2
      : conv.participant_1;

    const { error } = await supabase
      .from("direct_messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("sender_id", otherUserId)
      .eq("is_read", false);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteMessageAction(
  messageId: string
): Promise<MessagingActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Get the message to determine sender/receiver relationship
    const { data: msg, error: fetchErr } = await supabase
      .from("direct_messages")
      .select("id, sender_id, conversation_id")
      .eq("id", messageId)
      .single();

    if (fetchErr || !msg) return { success: false, error: "Message introuvable" };

    // Determine which flag to set
    const isSender = msg.sender_id === user.id;

    // Verify user is a participant of the conversation
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", msg.conversation_id)
      .single();

    if (convErr || !conv) return { success: false, error: "Conversation introuvable" };

    const isParticipant = conv.participant_1 === user.id || conv.participant_2 === user.id;
    if (!isParticipant) return { success: false, error: "Accès interdit" };

    const updateField = isSender ? "is_deleted_by_sender" : "is_deleted_by_receiver";

    const { error } = await supabase
      .from("direct_messages")
      .update({ [updateField]: true })
      .eq("id", messageId);

    if (error) return { success: false, error: error.message };

    // The DB trigger purge_deleted_dm will auto-delete if both sides deleted
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function archiveConversationAction(
  conversationId: string
): Promise<MessagingActionResult> {
  try {
    const { supabase, user } = await requireAuth();

    // Determine which participant the user is
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("participant_1, participant_2, archived_by_1, archived_by_2")
      .eq("id", conversationId)
      .single();

    if (convErr || !conv) return { success: false, error: "Conversation introuvable" };

    const isP1 = conv.participant_1 === user.id;
    const isP2 = conv.participant_2 === user.id;
    if (!isP1 && !isP2) return { success: false, error: "Accès interdit" };

    const archiveField = isP1 ? "archived_by_1" : "archived_by_2";
    const currentValue = isP1 ? conv.archived_by_1 : conv.archived_by_2;

    const { error } = await supabase
      .from("conversations")
      .update({ [archiveField]: !currentValue })
      .eq("id", conversationId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/messages");
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
