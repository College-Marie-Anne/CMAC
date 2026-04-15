export type MentorshipStatus = "pending" | "accepted" | "declined";
export type MentorshipSessionStatus = "active" | "completed" | "cancelled";

export type MentorshipProfile = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  class: string | null;
  country: string | null;
};

export type MentorshipRequest = {
  id: string;
  mentee_id: string;
  mentor_id: string | null; // null if open request
  message: string;
  study_field: string;
  status: MentorshipStatus;
  created_at: string;
  updated_at: string;
  // Included from join
  mentee?: MentorshipProfile;
  mentor?: MentorshipProfile;
};

export type MentorshipSession = {
  id: string;
  request_id: string;
  mentor_id: string;
  mentee_id: string;
  status: MentorshipSessionStatus;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  // Included from join
  mentee?: MentorshipProfile;
  mentor?: MentorshipProfile;
  request?: MentorshipRequest;
};

export type SuggestedMentor = MentorshipProfile & {
  study_field: string;
  company: string | null;
  profession_title: string | null;
};
