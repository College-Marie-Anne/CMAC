-- ============================================================
-- CMA CONNECT — Migration 015
-- Index manquants pour performance des queries courantes
-- ============================================================

-- ─── mentorship_sessions ───
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_request_id
  ON mentorship_sessions (request_id);

-- ─── promo_votes ───
CREATE INDEX IF NOT EXISTS idx_promo_votes_voter_id
  ON promo_votes (voter_id);

CREATE INDEX IF NOT EXISTS idx_promo_votes_candidate_id
  ON promo_votes (promo_candidate_id);

-- ─── reports ───
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id
  ON reports (reporter_id);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id
  ON reports (reported_user_id);

CREATE INDEX IF NOT EXISTS idx_reports_reported_post_id
  ON reports (reported_post_id);

CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by
  ON reports (reviewed_by);

-- ─── forum_reactions ───
CREATE INDEX IF NOT EXISTS idx_forum_reactions_user_id
  ON forum_reactions (user_id);
