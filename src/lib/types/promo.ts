export type ElectionStatus = "nomination" | "voting" | "completed" | "cancelled";

export type PromotionData = {
  id: string;
  start_date: number;
  end_date: number | null;
  leader_id: string | null;
  created_at: string;
  leader?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    username?: string;
  };
};

export type PromoElection = {
  id: string;
  promo_id: string;
  initiated_by: string | null;
  status: ElectionStatus;
  nomination_end: string;
  voting_end: string;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  winner?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
};

export type PromoCandidate = {
  id: string;
  election_id: string;
  candidate_id: string;
  pitch: string | null;
  vote_count: number;
  created_at: string;
  candidate?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    username: string;
  };
};

export type PromoVote = {
  id: string;
  election_id: string;
  voter_id: string;
  promo_candidate_id: string;
  created_at: string;
};
