export type ReactionEmoji = "like" | "heart" | "clap";

export type ForumTag = {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
};

export type PostAuthor = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
};

export type PostTag = {
  id: string;
  name: string;
  color: string;
};

export type ForumPost = {
  id: string;
  author: PostAuthor | null;
  content: string;
  tag: PostTag;
  image_url: string | null;
  promo_id: string | null;
  reaction_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user_reactions: ReactionEmoji[];
};

export type ForumComment = {
  id: string;
  post_id: string;
  author: PostAuthor | null;
  parent_id: string | null;
  content: string;
  reaction_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user_reactions: ReactionEmoji[];
  replies: ForumComment[];
};
