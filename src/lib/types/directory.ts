/* ─── Directory Types ─── */

export type DirectoryMember = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
  filiere: string | null;
  country: string | null;
  promo_name: string | null;
  promo_start_date: number | null;
  class: string | null;
  last_seen_at: string | null;
  current_profession: string | null;
  current_company: string | null;
};

export type DirectoryFilters = {
  q: string;         // Full-text search query
  role: string;      // "all" | "alumni" | "s4" | "student"
  filiere: string;   // "all" | specific filiere
  country: string;   // "all" | specific country
  promo: string;     // "all" | specific promo name
};
