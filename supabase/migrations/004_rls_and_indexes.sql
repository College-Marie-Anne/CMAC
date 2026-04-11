-- ============================================================
-- CMA CONNECT — Migration 004
-- Politiques RLS et Index
-- ============================================================

-- =========================
-- 1. ACTIVER RLS SUR TOUTES LES TABLES
-- =========================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE desired_study_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_deactivation_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_deactivation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;

-- =========================
-- 2. RLS — PROFILES
-- =========================

CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note : le contrôle par champ (avatar/bio/theme vs champs protégés) est géré par la fonction RPC côté applicatif

CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin());

-- DELETE interdit (pas de policy = pas de DELETE possible)

-- =========================
-- 3. RLS — PROMOTIONS
-- =========================

CREATE POLICY promotions_select ON promotions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY promotions_insert_admin ON promotions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR is_active());
  -- Les utilisatrices actives peuvent créer des promos pending à l'onboarding

CREATE POLICY promotions_update_admin ON promotions
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY promotions_delete_admin ON promotions
  FOR DELETE TO authenticated
  USING (is_admin());

-- =========================
-- 4. RLS — PROMO ELECTIONS
-- =========================

CREATE POLICY promo_elections_select ON promo_elections
  FOR SELECT TO authenticated
  USING (
    is_active() AND (
      promo_id = get_my_promo_id() OR is_admin()
    )
  );

CREATE POLICY promo_elections_insert ON promo_elections
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND promo_id = get_my_promo_id()
    AND NOT EXISTS (
      SELECT 1 FROM promo_elections
      WHERE promo_id = get_my_promo_id() AND status IN ('nomination', 'voting')
    )
  );

-- UPDATE via fonction serveur uniquement (pas de policy directe)

-- =========================
-- 5. RLS — PROMO CANDIDATES
-- =========================

CREATE POLICY promo_candidates_select ON promo_candidates
  FOR SELECT TO authenticated
  USING (
    is_active() AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = promo_candidates.election_id AND pe.promo_id = get_my_promo_id()
    )
  );

CREATE POLICY promo_candidates_insert ON promo_candidates
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND candidate_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = election_id AND pe.promo_id = get_my_promo_id() AND pe.status = 'nomination'
    )
  );

CREATE POLICY promo_candidates_update_pitch ON promo_candidates
  FOR UPDATE TO authenticated
  USING (
    candidate_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = election_id AND pe.status = 'nomination'
    )
  );

CREATE POLICY promo_candidates_delete ON promo_candidates
  FOR DELETE TO authenticated
  USING (
    candidate_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = election_id AND pe.status = 'nomination'
    )
  );

-- =========================
-- 6. RLS — PROMO VOTES (anonyme)
-- =========================

-- SELECT interdit (votes anonymes) — pas de policy SELECT

CREATE POLICY promo_votes_insert ON promo_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = election_id AND pe.promo_id = get_my_promo_id() AND pe.status = 'voting'
    )
  );

CREATE POLICY promo_votes_delete ON promo_votes
  FOR DELETE TO authenticated
  USING (
    voter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM promo_elections pe
      WHERE pe.id = election_id AND pe.status = 'voting'
    )
  );

-- =========================
-- 7. RLS — USER EDUCATION
-- =========================

CREATE POLICY user_education_select ON user_education
  FOR SELECT TO authenticated USING (is_active());

CREATE POLICY user_education_insert ON user_education
  FOR INSERT TO authenticated
  WITH CHECK (is_active() AND profile_id = auth.uid());

CREATE POLICY user_education_update_admin ON user_education
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY user_education_delete ON user_education
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR is_admin());

-- =========================
-- 8. RLS — USER PROFESSIONS
-- =========================

CREATE POLICY user_professions_select ON user_professions
  FOR SELECT TO authenticated USING (is_active());

CREATE POLICY user_professions_insert ON user_professions
  FOR INSERT TO authenticated
  WITH CHECK (is_active() AND profile_id = auth.uid());

CREATE POLICY user_professions_update_admin ON user_professions
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY user_professions_delete ON user_professions
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid() OR is_admin());

-- =========================
-- 9. RLS — ACTIVITIES
-- =========================

CREATE POLICY activities_select ON activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY activities_insert_admin ON activities
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY activities_update_admin ON activities
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY activities_delete_admin ON activities
  FOR DELETE TO authenticated USING (is_admin());

-- =========================
-- 10. RLS — PROFILE ACTIVITIES
-- =========================

CREATE POLICY profile_activities_select ON profile_activities
  FOR SELECT TO authenticated USING (is_active());

CREATE POLICY profile_activities_insert ON profile_activities
  FOR INSERT TO authenticated
  WITH CHECK (is_active() AND profile_id = auth.uid());

CREATE POLICY profile_activities_delete ON profile_activities
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- =========================
-- 11. RLS — DESIRED STUDY FIELDS
-- =========================

CREATE POLICY desired_study_fields_select ON desired_study_fields
  FOR SELECT TO authenticated USING (is_active());

-- INSERT via RPC insert_desired_study_field() (SECURITY DEFINER)
-- UPDATE interdit (pas de policy = pas de UPDATE possible)

CREATE POLICY desired_study_fields_delete ON desired_study_fields
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- =========================
-- 12. RLS — FORUM TAGS
-- =========================

CREATE POLICY forum_tags_select ON forum_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY forum_tags_insert_admin ON forum_tags
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY forum_tags_update_admin ON forum_tags
  FOR UPDATE TO authenticated USING (is_admin());

CREATE POLICY forum_tags_delete_admin ON forum_tags
  FOR DELETE TO authenticated
  USING (is_admin() AND is_system = false);

-- =========================
-- 13. RLS — FORUM POSTS
-- =========================

-- SELECT : global (promo_id IS NULL) + coin promo (matching) + admin (tout)
CREATE POLICY forum_posts_select_global ON forum_posts
  FOR SELECT TO authenticated
  USING (
    is_active() AND is_deleted = false
    AND (promo_id IS NULL OR promo_id = get_my_promo_id())
  );

CREATE POLICY forum_posts_select_admin ON forum_posts
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY forum_posts_insert ON forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND author_id = auth.uid()
    AND (promo_id IS NULL OR promo_id = get_my_promo_id())
  );

CREATE POLICY forum_posts_update_author ON forum_posts
  FOR UPDATE TO authenticated
  USING (is_active() AND author_id = auth.uid());

CREATE POLICY forum_posts_update_admin ON forum_posts
  FOR UPDATE TO authenticated
  USING (is_admin());

-- DELETE : soft delete via UPDATE is_deleted (pas de hard DELETE par policy directe)

-- =========================
-- 14. RLS — FORUM COMMENTS
-- =========================

CREATE POLICY forum_comments_select ON forum_comments
  FOR SELECT TO authenticated
  USING (
    is_active() AND is_deleted = false
    AND EXISTS (
      SELECT 1 FROM forum_posts fp
      WHERE fp.id = forum_comments.post_id
        AND fp.is_deleted = false
        AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
    )
  );

CREATE POLICY forum_comments_select_admin ON forum_comments
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY forum_comments_insert ON forum_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM forum_posts fp
      WHERE fp.id = post_id AND fp.is_deleted = false
        AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
    )
  );

CREATE POLICY forum_comments_update_author ON forum_comments
  FOR UPDATE TO authenticated
  USING (is_active() AND author_id = auth.uid());

CREATE POLICY forum_comments_update_admin ON forum_comments
  FOR UPDATE TO authenticated
  USING (is_admin());

-- =========================
-- 15. RLS — FORUM REACTIONS
-- =========================

CREATE POLICY forum_reactions_select ON forum_reactions
  FOR SELECT TO authenticated
  USING (
    is_active() AND (
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM forum_posts fp
        WHERE fp.id = forum_reactions.post_id AND fp.is_deleted = false
          AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
      ))
      OR
      (comment_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM forum_comments fc
        JOIN forum_posts fp ON fp.id = fc.post_id
        WHERE fc.id = forum_reactions.comment_id AND fc.is_deleted = false
          AND fp.is_deleted = false
          AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
      ))
    )
  );

CREATE POLICY forum_reactions_insert ON forum_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND user_id = auth.uid()
    AND (
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM forum_posts fp
        WHERE fp.id = post_id AND fp.is_deleted = false
          AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
      ))
      OR
      (comment_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM forum_comments fc
        JOIN forum_posts fp ON fp.id = fc.post_id
        WHERE fc.id = comment_id AND fc.is_deleted = false AND fp.is_deleted = false
          AND (fp.promo_id IS NULL OR fp.promo_id = get_my_promo_id())
      ))
    )
  );

CREATE POLICY forum_reactions_delete ON forum_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================
-- 16. RLS — CONVERSATIONS (admin EXCLUS)
-- =========================

CREATE POLICY conversations_select ON conversations
  FOR SELECT TO authenticated
  USING (
    is_active()
    AND (auth.uid() = participant_1 OR auth.uid() = participant_2)
    AND NOT is_admin()
  );

-- INSERT/DELETE via RPC (SECURITY DEFINER) — pas de policy directe

CREATE POLICY conversations_update ON conversations
  FOR UPDATE TO authenticated
  USING (
    is_active()
    AND (auth.uid() = participant_1 OR auth.uid() = participant_2)
  );

-- =========================
-- 17. RLS — DIRECT MESSAGES (admin EXCLUS)
-- =========================

CREATE POLICY direct_messages_select ON direct_messages
  FOR SELECT TO authenticated
  USING (
    is_active()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = direct_messages.conversation_id
        AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
    )
    AND CASE
      WHEN sender_id = auth.uid() THEN is_deleted_by_sender = false
      ELSE is_deleted_by_receiver = false
    END
    AND NOT is_admin()
  );

-- INSERT via RPC send_direct_message() (SECURITY DEFINER)

CREATE POLICY direct_messages_update ON direct_messages
  FOR UPDATE TO authenticated
  USING (
    is_active()
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
    )
  );

-- DELETE géré par trigger purge, pas par policy directe

-- =========================
-- 18. RLS — NOTIFICATIONS
-- =========================

CREATE POLICY notifications_select ON notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- INSERT via triggers/fonctions serveur (SECURITY DEFINER)

CREATE POLICY notifications_update ON notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY notifications_delete ON notifications
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

-- =========================
-- 19. RLS — NOTIFICATION PREFERENCES
-- =========================

CREATE POLICY notification_preferences_select ON notification_preferences
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

-- INSERT via trigger (auto-création)

CREATE POLICY notification_preferences_update ON notification_preferences
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

-- DELETE interdit

-- =========================
-- 20. RLS — PUSH SUBSCRIPTIONS
-- =========================

CREATE POLICY push_subscriptions_select ON push_subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY push_subscriptions_insert ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY push_subscriptions_delete ON push_subscriptions
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- =========================
-- 21. RLS — REPORTS
-- =========================

CREATE POLICY reports_select_admin ON reports
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY reports_insert ON reports
  FOR INSERT TO authenticated
  WITH CHECK (is_active() AND reporter_id = auth.uid());

CREATE POLICY reports_update_admin ON reports
  FOR UPDATE TO authenticated
  USING (is_admin());

-- DELETE interdit

-- =========================
-- 22. RLS — BLOCKED USERS
-- =========================

CREATE POLICY blocked_users_select ON blocked_users
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- INSERT via RPC block_user() (SECURITY DEFINER)

CREATE POLICY blocked_users_delete ON blocked_users
  FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- =========================
-- 23. RLS — INVITATION LINKS
-- =========================

CREATE POLICY invitation_links_select ON invitation_links
  FOR SELECT TO authenticated
  USING (inviter_id = auth.uid() OR is_admin());

CREATE POLICY invitation_links_insert ON invitation_links
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'alumni' AND status = 'active'
    )
  );

CREATE POLICY invitation_links_update_admin ON invitation_links
  FOR UPDATE TO authenticated
  USING (is_admin());

-- DELETE interdit

-- =========================
-- 24. RLS — SUPPORT TICKETS
-- =========================

CREATE POLICY support_tickets_select ON support_tickets
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR is_admin());

CREATE POLICY support_tickets_insert ON support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (is_active() AND author_id = auth.uid());

CREATE POLICY support_tickets_update_admin ON support_tickets
  FOR UPDATE TO authenticated
  USING (is_admin());

-- DELETE interdit

-- =========================
-- 25. RLS — ADMIN DEACTIVATION VOTES
-- =========================

CREATE POLICY admin_deactivation_votes_select ON admin_deactivation_votes
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY admin_deactivation_votes_insert ON admin_deactivation_votes
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- UPDATE via trigger (auto-approve)
-- DELETE interdit

-- =========================
-- 26. RLS — ADMIN DEACTIVATION APPROVALS
-- =========================

CREATE POLICY admin_deactivation_approvals_select ON admin_deactivation_approvals
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY admin_deactivation_approvals_insert ON admin_deactivation_approvals
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

-- UPDATE/DELETE interdit

-- =========================
-- 27. RLS — ADMIN AUDIT LOG
-- =========================

CREATE POLICY admin_audit_log_select ON admin_audit_log
  FOR SELECT TO authenticated
  USING (is_admin());

-- INSERT via fonctions SECURITY DEFINER (log_admin_action)
-- UPDATE/DELETE interdit

-- =========================
-- 28. RLS — MENTORSHIP REQUESTS
-- =========================

CREATE POLICY mentorship_requests_select ON mentorship_requests
  FOR SELECT TO authenticated
  USING (
    is_active() AND (
      mentee_id = auth.uid()
      OR mentor_id = auth.uid()
      OR (mentor_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'alumni'))
      OR is_admin()
    )
  );

CREATE POLICY mentorship_requests_insert ON mentorship_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    is_active() AND mentee_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('s4', 'student'))
  );

CREATE POLICY mentorship_requests_update ON mentorship_requests
  FOR UPDATE TO authenticated
  USING (
    is_active() AND (
      (mentor_id = auth.uid())
      OR (mentor_id IS NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'alumni'))
    )
  );

CREATE POLICY mentorship_requests_delete ON mentorship_requests
  FOR DELETE TO authenticated
  USING (mentee_id = auth.uid() AND status = 'pending');

-- =========================
-- 29. RLS — MENTORSHIP SESSIONS
-- =========================

CREATE POLICY mentorship_sessions_select ON mentorship_sessions
  FOR SELECT TO authenticated
  USING (
    is_active() AND (
      mentor_id = auth.uid() OR mentee_id = auth.uid() OR is_admin()
    )
  );

-- INSERT via RPC accept_mentorship_request() (SECURITY DEFINER)

CREATE POLICY mentorship_sessions_update ON mentorship_sessions
  FOR UPDATE TO authenticated
  USING (
    is_active() AND (mentor_id = auth.uid() OR mentee_id = auth.uid())
  );

-- DELETE interdit

-- ============================================================
-- INDEX
-- ============================================================

-- =========================
-- INDEX GIN (Full-Text Search)
-- =========================

CREATE INDEX idx_profiles_search_vector ON profiles USING GIN (search_vector);
CREATE INDEX idx_forum_posts_search_vector ON forum_posts USING GIN (search_vector);

-- =========================
-- INDEX BTREE — Clés étrangères à fort trafic
-- =========================

CREATE INDEX idx_forum_posts_promo_id ON forum_posts (promo_id);
CREATE INDEX idx_forum_posts_tag_id ON forum_posts (tag_id);
CREATE INDEX idx_forum_posts_author_id ON forum_posts (author_id);
CREATE INDEX idx_forum_comments_post_id ON forum_comments (post_id);
CREATE INDEX idx_forum_comments_author_id ON forum_comments (author_id);
CREATE INDEX idx_forum_reactions_post_id ON forum_reactions (post_id);
CREATE INDEX idx_forum_reactions_comment_id ON forum_reactions (comment_id);
CREATE INDEX idx_direct_messages_conversation_id ON direct_messages (conversation_id);
CREATE INDEX idx_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX idx_mentorship_requests_mentee_id ON mentorship_requests (mentee_id);
CREATE INDEX idx_mentorship_requests_mentor_id ON mentorship_requests (mentor_id);
CREATE INDEX idx_mentorship_sessions_mentee_id ON mentorship_sessions (mentee_id);
CREATE INDEX idx_user_education_profile_id ON user_education (profile_id);
CREATE INDEX idx_user_professions_profile_id ON user_professions (profile_id);
CREATE INDEX idx_desired_study_fields_profile_id ON desired_study_fields (profile_id);
CREATE INDEX idx_profile_activities_profile_id ON profile_activities (profile_id);
CREATE INDEX idx_invitation_links_inviter_id ON invitation_links (inviter_id);
CREATE INDEX idx_admin_audit_log_admin_id ON admin_audit_log (admin_id);
CREATE INDEX idx_promo_candidates_election_id ON promo_candidates (election_id);
CREATE INDEX idx_promo_elections_promo_id ON promo_elections (promo_id);
CREATE INDEX idx_support_tickets_author_id ON support_tickets (author_id);
CREATE INDEX idx_support_tickets_status ON support_tickets (status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets (assigned_to);

-- =========================
-- INDEX COMPOSITES — Pagination cursor-based
-- =========================

CREATE INDEX idx_forum_posts_cursor ON forum_posts (created_at DESC, id);
CREATE INDEX idx_forum_posts_promo_cursor ON forum_posts (promo_id, created_at DESC, id);
CREATE INDEX idx_forum_comments_cursor ON forum_comments (post_id, created_at ASC, id);
CREATE INDEX idx_direct_messages_cursor ON direct_messages (conversation_id, created_at DESC, id);
CREATE INDEX idx_notifications_cursor ON notifications (recipient_id, created_at DESC, id);
CREATE INDEX idx_admin_audit_log_cursor ON admin_audit_log (created_at DESC, id);
CREATE INDEX idx_conversations_cursor ON conversations (last_message_at DESC NULLS LAST, id);

-- =========================
-- INDEX DE FILTRE COURANT
-- =========================

CREATE INDEX idx_profiles_status ON profiles (status);
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_fullname ON profiles (first_name, last_name);
CREATE INDEX idx_profiles_last_seen ON profiles (last_seen_at);
CREATE INDEX idx_forum_posts_is_deleted ON forum_posts (is_deleted);
CREATE INDEX idx_forum_comments_is_deleted ON forum_comments (is_deleted);
CREATE INDEX idx_mentorship_sessions_quota ON mentorship_sessions (mentee_id, status);
