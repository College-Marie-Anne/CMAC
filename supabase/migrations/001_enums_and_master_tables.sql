-- ============================================================
-- CMA CONNECT — Migration 001
-- Types ENUM et Tables maîtresses (sans dépendances vers profiles)
-- ============================================================

-- =========================
-- 1. TYPES ENUM
-- =========================

CREATE TYPE profile_role AS ENUM ('alumni', 's4', 'student', 'admin');
CREATE TYPE profile_status AS ENUM ('pending', 'active', 'suspended', 'deactivated');
CREATE TYPE promo_status AS ENUM ('active', 'pending', 'rejected');
CREATE TYPE election_status AS ENUM ('nomination', 'voting', 'completed', 'cancelled');
CREATE TYPE institution_type AS ENUM ('university', 'professional_school', 'other');
CREATE TYPE notification_type AS ENUM (
  'dm', 'forum_reply', 'forum_comment_reply', 'reaction', 'mention',
  'admin', 'account_approved', 'account_suspended', 'account_deactivated',
  'account_reactivated', 'promo_rejected', 'mentorship', 'mentorship_completed',
  'invitation_used', 'election', 'post_pinned', 'new_opportunity', 'support_reply'
);
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');
CREATE TYPE mentorship_request_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE mentorship_session_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE support_ticket_category AS ENUM ('profile_modification', 'promo_issue', 'account_reactivation', 'bug_report', 'other');
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE admin_deactivation_status AS ENUM ('pending', 'approved', 'rejected');

-- =========================
-- 2. TABLES MAÎTRESSES
-- =========================

-- Promotions (créée SANS leader_id FK car profiles n'existe pas encore)
CREATE TABLE promotions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  emblem_url  TEXT,
  leader_id   UUID,  -- FK ajoutée après création de profiles
  status      promo_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activités parascolaires
CREATE TABLE activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags du forum (gérables par admin)
CREATE TABLE forum_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed du tag système obligatoire
INSERT INTO forum_tags (name, color, is_system)
VALUES ('Bourses & Opportunités', '#D4A017', true);
