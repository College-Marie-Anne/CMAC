-- ============================================================
-- CMA CONNECT — Migration 003
-- Triggers, Fonctions RPC et Full-Text Search
-- ============================================================

-- =========================
-- 1. TRIGGER GÉNÉRIQUE : updated_at
-- =========================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer à toutes les tables avec updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'promotions', 'promo_elections', 'user_education',
      'user_professions', 'activities', 'forum_tags', 'forum_posts',
      'forum_comments', 'notification_preferences', 'reports',
      'support_tickets', 'admin_deactivation_votes', 'mentorship_requests'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- =========================
-- 2. FULL-TEXT SEARCH : profiles
-- =========================

CREATE OR REPLACE FUNCTION profiles_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french', COALESCE(NEW.first_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.last_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(NEW.username, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(array_to_string(NEW.nationality, ' '), '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(NEW.country, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(NEW.filiere, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_search_vector
  BEFORE INSERT OR UPDATE OF first_name, last_name, username, nationality, country, filiere
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_search_vector_update();

-- =========================
-- 3. FULL-TEXT SEARCH : forum_posts
-- =========================

CREATE OR REPLACE FUNCTION forum_posts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('french', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forum_posts_search_vector
  BEFORE INSERT OR UPDATE OF content
  ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION forum_posts_search_vector_update();

-- =========================
-- 4. REACTION COUNT : forum_posts
-- =========================

CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE forum_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE forum_posts SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_reaction_count
  AFTER INSERT OR DELETE ON forum_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_post_reaction_count();

-- =========================
-- 5. REACTION COUNT : forum_comments
-- =========================

CREATE OR REPLACE FUNCTION update_comment_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE forum_comments SET reaction_count = reaction_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
    UPDATE forum_comments SET reaction_count = GREATEST(reaction_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_comment_reaction_count
  AFTER INSERT OR DELETE ON forum_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_reaction_count();

-- =========================
-- 6. VOTE COUNT : promo_candidates
-- =========================

CREATE OR REPLACE FUNCTION update_candidate_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE promo_candidates SET vote_count = vote_count + 1 WHERE id = NEW.promo_candidate_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE promo_candidates SET vote_count = GREATEST(vote_count - 1, 0) WHERE id = OLD.promo_candidate_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_vote_count
  AFTER INSERT OR DELETE ON promo_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_candidate_vote_count();

-- =========================
-- 7. PURGE DMs (suppression automatique quand les deux parties ont supprimé)
-- =========================

CREATE OR REPLACE FUNCTION purge_deleted_dm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted_by_sender = true AND NEW.is_deleted_by_receiver = true THEN
    -- Supprimer l'image du bucket se fait côté application (Supabase Storage API)
    DELETE FROM direct_messages WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purge_deleted_dm
  AFTER UPDATE OF is_deleted_by_sender, is_deleted_by_receiver
  ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION purge_deleted_dm();

-- =========================
-- 8. CONVERSATIONS : ordonnancement participants (BEFORE INSERT)
-- =========================

CREATE OR REPLACE FUNCTION order_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.participant_1 = NEW.participant_2 THEN
    RAISE EXCEPTION 'Cannot create a conversation with yourself';
  END IF;
  IF NEW.participant_1 > NEW.participant_2 THEN
    DECLARE
      tmp UUID := NEW.participant_1;
    BEGIN
      NEW.participant_1 := NEW.participant_2;
      NEW.participant_2 := tmp;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_conversation_participants
  BEFORE INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION order_conversation_participants();

-- =========================
-- 9. NOTIFICATION PREFERENCES : création automatique à l'inscription
-- =========================

CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (profile_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- =========================
-- 10. ADMIN DEACTIVATION : suspension auto quand 3 approbations
-- =========================

CREATE OR REPLACE FUNCTION check_admin_deactivation_threshold()
RETURNS TRIGGER AS $$
DECLARE
  approval_count INT;
  vote_record RECORD;
BEGIN
  IF NEW.approved = true THEN
    SELECT COUNT(*) INTO approval_count
    FROM admin_deactivation_approvals
    WHERE vote_id = NEW.vote_id AND approved = true;

    -- +1 car le trigger se déclenche AFTER INSERT (la nouvelle ligne est déjà comptée)
    SELECT * INTO vote_record FROM admin_deactivation_votes WHERE id = NEW.vote_id;

    IF approval_count >= vote_record.required_votes THEN
      -- Suspendre l'admin ciblé
      UPDATE profiles SET status = 'suspended' WHERE id = vote_record.target_admin_id;
      -- Marquer le vote comme approuvé
      UPDATE admin_deactivation_votes SET status = 'approved' WHERE id = NEW.vote_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_admin_deactivation
  AFTER INSERT ON admin_deactivation_approvals
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_deactivation_threshold();

-- =========================
-- 11. FONCTIONS RPC
-- =========================

-- 11a. Insérer un domaine d'études désiré (plafond de 3)
CREATE OR REPLACE FUNCTION insert_desired_study_field(p_field_name TEXT)
RETURNS UUID AS $$
DECLARE
  current_count INT;
  new_id UUID;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM desired_study_fields
  WHERE profile_id = auth.uid();

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 desired study fields allowed';
  END IF;

  INSERT INTO desired_study_fields (profile_id, field_name)
  VALUES (auth.uid(), p_field_name)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11b. Créer une session de mentorat (plafond de 3 pour la mentee)
CREATE OR REPLACE FUNCTION accept_mentorship_request(p_request_id UUID)
RETURNS UUID AS $$
DECLARE
  req RECORD;
  active_count INT;
  new_session_id UUID;
  conv_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Récupérer la demande
  SELECT * INTO req FROM mentorship_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status != 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  -- Vérifier que l'appelant est alumni
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'alumni' AND status = 'active') THEN
    RAISE EXCEPTION 'Only active alumni can accept mentorship requests';
  END IF;

  -- Vérifier mentor ciblé ou demande ouverte
  IF req.mentor_id IS NOT NULL AND req.mentor_id != auth.uid() THEN
    RAISE EXCEPTION 'This request is not addressed to you';
  END IF;

  -- Vérifier le quota de la mentee
  SELECT COUNT(*) INTO active_count
  FROM mentorship_sessions
  WHERE mentee_id = req.mentee_id AND status = 'active';

  IF active_count >= 3 THEN
    RAISE EXCEPTION 'Mentee already has 3 active mentorship sessions';
  END IF;

  -- Mettre à jour la demande
  UPDATE mentorship_requests
  SET status = 'accepted', mentor_id = auth.uid()
  WHERE id = p_request_id;

  -- Créer la session
  INSERT INTO mentorship_sessions (request_id, mentor_id, mentee_id)
  VALUES (p_request_id, auth.uid(), req.mentee_id)
  RETURNING id INTO new_session_id;

  -- Créer la conversation DM automatiquement (si elle n'existe pas)
  IF auth.uid() < req.mentee_id THEN
    p1 := auth.uid(); p2 := req.mentee_id;
  ELSE
    p1 := req.mentee_id; p2 := auth.uid();
  END IF;

  INSERT INTO conversations (participant_1, participant_2)
  VALUES (p1, p2)
  ON CONFLICT (participant_1, participant_2) DO NOTHING;

  RETURN new_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11c. Envoyer un DM (avec vérification de blocage)
CREATE OR REPLACE FUNCTION send_direct_message(
  p_conversation_id UUID,
  p_content TEXT,
  p_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  conv RECORD;
  receiver_id UUID;
  new_msg_id UUID;
BEGIN
  -- Récupérer la conversation
  SELECT * INTO conv FROM conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation not found'; END IF;

  -- Vérifier que l'expéditeur est participant
  IF auth.uid() != conv.participant_1 AND auth.uid() != conv.participant_2 THEN
    RAISE EXCEPTION 'Not a participant of this conversation';
  END IF;

  -- Déterminer le receiver
  IF auth.uid() = conv.participant_1 THEN
    receiver_id := conv.participant_2;
  ELSE
    receiver_id := conv.participant_1;
  END IF;

  -- Vérifier le blocage
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = receiver_id AND blocked_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are blocked by this user';
  END IF;

  -- Vérifier le statut de l'expéditeur
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Your account is not active';
  END IF;

  -- Insérer le message
  INSERT INTO direct_messages (conversation_id, sender_id, content, image_url)
  VALUES (p_conversation_id, auth.uid(), p_content, p_image_url)
  RETURNING id INTO new_msg_id;

  -- Mettre à jour last_message_at
  UPDATE conversations SET last_message_at = NOW() WHERE id = p_conversation_id;

  RETURN new_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11d. Créer une conversation (avec vérification blocage + self)
CREATE OR REPLACE FUNCTION create_conversation(p_other_user_id UUID)
RETURNS UUID AS $$
DECLARE
  p1 UUID;
  p2 UUID;
  conv_id UUID;
BEGIN
  -- Vérifier pas soi-même
  IF auth.uid() = p_other_user_id THEN
    RAISE EXCEPTION 'Cannot create a conversation with yourself';
  END IF;

  -- Vérifier le blocage bidirectionnel
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Cannot create conversation: user is blocked';
  END IF;

  -- Ordonner les IDs
  IF auth.uid() < p_other_user_id THEN
    p1 := auth.uid(); p2 := p_other_user_id;
  ELSE
    p1 := p_other_user_id; p2 := auth.uid();
  END IF;

  -- Créer ou récupérer
  INSERT INTO conversations (participant_1, participant_2)
  VALUES (p1, p2)
  ON CONFLICT (participant_1, participant_2) DO UPDATE SET created_at = conversations.created_at
  RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11e. Bloquer une utilisatrice (annule mentorat actif)
CREATE OR REPLACE FUNCTION block_user(p_blocked_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Annuler les mentorats actifs entre les deux
  UPDATE mentorship_sessions
  SET status = 'cancelled', ended_at = NOW()
  WHERE status = 'active'
    AND (
      (mentor_id = auth.uid() AND mentee_id = p_blocked_id) OR
      (mentor_id = p_blocked_id AND mentee_id = auth.uid())
    );

  -- Créer le blocage
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), p_blocked_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11f. Helper : journaliser une action admin
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11g. Helper : vérifier si l'utilisatrice est admin actif
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 11h. Helper : vérifier si le profil est actif
CREATE OR REPLACE FUNCTION is_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 11i. Helper : récupérer le promo_id de l'utilisatrice courante
CREATE OR REPLACE FUNCTION get_my_promo_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT promo_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
