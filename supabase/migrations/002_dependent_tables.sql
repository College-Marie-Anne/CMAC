-- ============================================================
-- CMA CONNECT — Migration 002
-- Tables dépendantes : Profils, Forum, Messagerie, Mentorat, Admin
-- ============================================================

-- =========================
-- 1. PROFILES (table centrale)
-- =========================

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT NOT NULL UNIQUE,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  date_of_birth       DATE NOT NULL,
  nationality         TEXT[] NOT NULL DEFAULT '{}',
  country             TEXT NOT NULL,
  role                profile_role NOT NULL,
  class               TEXT CHECK (class IN ('S1', 'S2', 'S3')),
  filiere             TEXT CHECK (filiere IN ('SVT', 'SES', 'SMP', 'Section A', 'Section B', 'Section C', 'Section D')),
  enrollment_date     DATE,
  promo_id            UUID REFERENCES promotions(id) ON DELETE RESTRICT,
  promo_start_date    DATE,
  avatar_url          TEXT,
  bio                 TEXT,
  expected_end_date   DATE,
  status              profile_status NOT NULL DEFAULT 'pending',
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  theme_preference    TEXT NOT NULL DEFAULT 'system',
  last_seen_at        TIMESTAMPTZ,
  accepted_terms_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  terms_version       TEXT NOT NULL DEFAULT '1.0',
  search_vector       TSVECTOR,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ajout FK leader_id sur promotions (résolution dépendance circulaire)
ALTER TABLE promotions
  ADD CONSTRAINT fk_promotions_leader
  FOREIGN KEY (leader_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- =========================
-- 2. ÉLECTIONS DE PROMO
-- =========================

CREATE TABLE promo_elections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id        UUID NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  initiated_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status          election_status NOT NULL DEFAULT 'nomination',
  nomination_end  TIMESTAMPTZ NOT NULL,
  voting_end      TIMESTAMPTZ NOT NULL,
  winner_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promo_candidates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES promo_elections(id) ON DELETE CASCADE,
  candidate_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pitch           TEXT,
  vote_count      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, candidate_id)
);

CREATE TABLE promo_votes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id         UUID NOT NULL REFERENCES promo_elections(id) ON DELETE CASCADE,
  voter_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  promo_candidate_id  UUID NOT NULL REFERENCES promo_candidates(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (election_id, voter_id)
);

-- =========================
-- 3. PARCOURS & ACTIVITÉS
-- =========================

CREATE TABLE user_education (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_type  institution_type NOT NULL,
  institution_name  TEXT NOT NULL,
  study_field       TEXT NOT NULL,
  degree_level      TEXT,
  start_year        INT,
  end_year          INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_professions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  company     TEXT,
  is_current  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profile_activities (
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, activity_id)
);

CREATE TABLE desired_study_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  field_name  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 4. FORUM
-- =========================

CREATE TABLE forum_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  tag_id          UUID NOT NULL REFERENCES forum_tags(id) ON DELETE RESTRICT,
  image_url       TEXT,
  promo_id        UUID REFERENCES promotions(id) ON DELETE RESTRICT,
  reaction_count  INT NOT NULL DEFAULT 0,
  is_pinned       BOOLEAN NOT NULL DEFAULT false,
  is_edited       BOOLEAN NOT NULL DEFAULT false,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  search_vector   TSVECTOR,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE forum_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id       UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  reaction_count  INT NOT NULL DEFAULT 0,
  is_edited       BOOLEAN NOT NULL DEFAULT false,
  is_deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE forum_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  comment_id  UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  emoji       TEXT NOT NULL CHECK (emoji IN ('like', 'heart', 'clap')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactement un des deux doit être renseigné
  CONSTRAINT chk_reaction_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Index uniques partiels pour les réactions
CREATE UNIQUE INDEX uq_reaction_post
  ON forum_reactions (post_id, user_id, emoji)
  WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX uq_reaction_comment
  ON forum_reactions (comment_id, user_id, emoji)
  WHERE comment_id IS NOT NULL;

-- =========================
-- 5. MESSAGERIE
-- =========================

CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  participant_2   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  last_message_at TIMESTAMPTZ,
  archived_by_1   BOOLEAN NOT NULL DEFAULT false,
  archived_by_2   BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (participant_1, participant_2),
  CONSTRAINT chk_participants_ordered CHECK (participant_1 < participant_2)
);

CREATE TABLE direct_messages (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id         UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id               UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content                 TEXT NOT NULL,
  image_url               TEXT,
  is_read                 BOOLEAN NOT NULL DEFAULT false,
  read_at                 TIMESTAMPTZ,
  is_deleted_by_sender    BOOLEAN NOT NULL DEFAULT false,
  is_deleted_by_receiver  BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 6. NOTIFICATIONS & PRÉFÉRENCES
-- =========================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type          notification_type NOT NULL,
  reference_id  UUID,
  content       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  dm                    BOOLEAN NOT NULL DEFAULT true,
  forum_reply           BOOLEAN NOT NULL DEFAULT true,
  forum_comment_reply   BOOLEAN NOT NULL DEFAULT true,
  reaction              BOOLEAN NOT NULL DEFAULT true,
  mention               BOOLEAN NOT NULL DEFAULT true,
  mentorship            BOOLEAN NOT NULL DEFAULT true,
  mentorship_completed  BOOLEAN NOT NULL DEFAULT true,
  election              BOOLEAN NOT NULL DEFAULT true,
  new_opportunity       BOOLEAN NOT NULL DEFAULT true,
  push_enabled          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 7. SIGNALEMENTS & BLOCAGE
-- =========================

CREATE TABLE reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_post_id      UUID REFERENCES forum_posts(id) ON DELETE SET NULL,
  reported_comment_id   UUID REFERENCES forum_comments(id) ON DELETE SET NULL,
  reported_message_id   UUID REFERENCES direct_messages(id) ON DELETE SET NULL,
  reason                TEXT NOT NULL,
  status                report_status NOT NULL DEFAULT 'pending',
  reviewed_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at           TIMESTAMPTZ,
  admin_note            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blocked_users (
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- =========================
-- 8. INVITATIONS
-- =========================

CREATE TABLE invitation_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  token       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  used_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_used     BOOLEAN NOT NULL DEFAULT false,
  is_revoked  BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 9. SUPPORT
-- =========================

CREATE TABLE support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  category        support_ticket_category NOT NULL,
  subject         TEXT NOT NULL,
  message         TEXT NOT NULL,
  status          support_ticket_status NOT NULL DEFAULT 'open',
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_response  TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 10. ADMIN — DÉSACTIVATION & AUDIT
-- =========================

CREATE TABLE admin_deactivation_votes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_admin_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  initiated_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status            admin_deactivation_status NOT NULL DEFAULT 'pending',
  required_votes    INT NOT NULL DEFAULT 3,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_deactivation_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_id     UUID NOT NULL REFERENCES admin_deactivation_votes(id) ON DELETE CASCADE,
  admin_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved    BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_id, admin_id)
);

CREATE TABLE admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 11. MENTORAT
-- =========================

CREATE TABLE mentorship_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mentor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  message     TEXT NOT NULL,
  study_field TEXT NOT NULL,
  status      mentorship_request_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mentorship_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES mentorship_requests(id) ON DELETE RESTRICT,
  mentor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  mentee_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status      mentorship_session_status NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
