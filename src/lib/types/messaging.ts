/* ─── Messaging Types ─── */

export type ConversationParticipant = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
  last_seen_at: string | null;
};

export type Conversation = {
  id: string;
  participant: ConversationParticipant; // The OTHER participant
  last_message_at: string | null;
  last_message_preview: string | null; // First ~80 chars of last message
  unread_count: number;
  is_archived: boolean;
};

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  image_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};
