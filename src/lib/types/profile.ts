export type ProfileEducation = {
  id: string;
  institution_type: string;
  institution_name: string;
  study_field: string;
  degree_level: string | null;
  start_year: number | null;
  end_year: number | null;
};

export type ProfileProfession = {
  id: string;
  title: string;
  company: string | null;
  is_current: boolean;
};

export type ProfileActivity = {
  activity_id: string;
  name: string;
};

export type ProfileDesiredField = {
  id: string;
  field_name: string;
};

export type ProfilePublic = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  status: string;
  class: string | null;
  filiere: string | null;
  promo_id: string | null;
  promo_name: string | null;
  promo_start_date: number | null;
  enrollment_date: number | null;
  expected_end_date: number | null;
  nationality: string[] | null;
  country: string | null;
  is_super_admin: boolean;
  theme_preference: string;
  created_at: string;
  last_seen_at: string | null;
};

export type ProfileFull = ProfilePublic & {
  education: ProfileEducation[];
  professions: ProfileProfession[];
  activities: ProfileActivity[];
  desired_fields: ProfileDesiredField[];
  post_count: number;
  comment_count: number;
};

export type NotificationPrefs = {
  dm: boolean;
  forum_reply: boolean;
  forum_comment_reply: boolean;
  reaction: boolean;
  mention: boolean;
  mentorship: boolean;
  mentorship_completed: boolean;
  election: boolean;
  new_opportunity: boolean;
  push_enabled: boolean;
};
