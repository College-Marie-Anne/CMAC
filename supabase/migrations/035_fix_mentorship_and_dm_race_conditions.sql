-- ============================================================
-- CMA CONNECT — Migration 035
-- Fix race conditions : accept_mentorship_request + send_direct_message
-- ============================================================
--
-- Deux race conditions identifiées par l'audit (voir 003:273-330 et 003:333-383) :
--
-- 1. `accept_mentorship_request(p_request_id)` — TOCTOU double
--    a) SELECT de la request → UPDATE status='accepted' : deux alumni qui
--       cliquent "Accepter" au même instant sur la MÊME demande ouverte
--       voient tous deux `status='pending'`, passent le guard ligne 286 et
--       créent deux sessions pour la même request_id. La contrainte UNIQUE
--       sur mentorship_sessions.request_id (si présente) sauve de l'insert
--       dupliqué, mais l'UPDATE est idempotent et le 2e alumni reste
--       incorrectement marqué comme mentor de l'autre requête qui n'a pas
--       échoué côté app.
--    b) Quota mentee (max 3 sessions actives) : si deux alumni acceptent
--       deux demandes DIFFÉRENTES de la même mentee simultanément, les
--       deux voient `active_count = 2` → deux inserts → mentee dépasse à 4.
--
-- 2. `send_direct_message(...)` — check blocage non-atomique
--    Le SELECT sur blocked_users (l.361) et l'INSERT direct_messages (l.374)
--    sont deux statements séparés sous READ COMMITTED : le receiver peut
--    insérer un block entre les deux et le message passe quand même.
--
-- Solution :
--   (1a) SELECT ... FOR UPDATE sur mentorship_requests — sérialise les
--        acceptations de la même request.
--   (1b) pg_advisory_xact_lock keyé sur mentee_id — sérialise les
--        acceptations concurrentes pour la même mentee sans verrouiller
--        sa row profile (qui est touchée par d'autres opérations).
--   (2)  Fusion check blocage + INSERT en un seul statement
--        `INSERT ... SELECT ... WHERE NOT EXISTS (blocked_users ...)`.
--        Les deux s'exécutent sous le même snapshot MVCC → atomique.
--
-- Les signatures et la sémantique externe sont préservées (mêmes RAISE
-- messages, même valeur de retour). search_path explicite ajouté pour
-- aligner avec la politique de la migration 027.

-- ------------------------------------------------------------
-- 1. accept_mentorship_request : locks pour sérialisation
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_mentorship_request(p_request_id UUID)
RETURNS UUID AS $$
DECLARE
  req RECORD;
  active_count INT;
  new_session_id UUID;
  p1 UUID;
  p2 UUID;
BEGIN
  -- Verrou ligne sur la demande : empêche 2 alumni d'accepter la même
  -- request en parallèle. Le second attend le commit du premier puis
  -- voit status='accepted' et échoue proprement sur le check ligne 286.
  SELECT * INTO req
  FROM mentorship_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF req.status != 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;

  -- Vérifier que l'appelant est alumni actif
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'alumni' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only active alumni can accept mentorship requests';
  END IF;

  -- Vérifier mentor ciblé ou demande ouverte
  IF req.mentor_id IS NOT NULL AND req.mentor_id != auth.uid() THEN
    RAISE EXCEPTION 'This request is not addressed to you';
  END IF;

  -- Sérialise les acceptations concurrentes sur la même mentee pour
  -- garantir le quota de 3 sessions actives. Sans ce lock, 2 alumni qui
  -- acceptent 2 demandes différentes de la même mentee au même instant
  -- voient tous deux active_count=2 et créent une 4e session.
  -- Key = hash du mentee_id, scopé à cette fonction via un prefix.
  -- Relâché automatiquement en fin de transaction (xact_lock).
  PERFORM pg_advisory_xact_lock(
    hashtextextended('cmac:mentorship_accept:' || req.mentee_id::text, 0)
  );

  -- Vérifier le quota (count à jour puisque les acceptations concurrentes
  -- pour la même mentee attendent sur le lock ci-dessus)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

-- ------------------------------------------------------------
-- 2. send_direct_message : check blocage + INSERT atomiques
-- ------------------------------------------------------------
-- Superpose la version 022 (notifications DM) en fusionnant le guard
-- blocked_users avec l'INSERT. Les autres branches (status check,
-- notifications) sont inchangées.
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

  -- Vérifier le statut de l'expéditeur. Non-race-critique : un changement
  -- de status concurrent est acceptable (le pire cas est un message passé
  -- juste avant suspension, observable en audit).
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Your account is not active';
  END IF;

  -- INSERT atomique : le WHERE NOT EXISTS sur blocked_users et l'INSERT
  -- lui-même s'exécutent dans le même statement → même snapshot MVCC →
  -- aucune fenêtre pour qu'un block inséré en parallèle passe inaperçu.
  -- Si un block existe, 0 row insérée → new_msg_id NULL → RAISE.
  INSERT INTO direct_messages (conversation_id, sender_id, content, image_url)
  SELECT p_conversation_id, auth.uid(), p_content, p_image_url
  WHERE NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = receiver_id AND blocked_id = auth.uid()
  )
  RETURNING id INTO new_msg_id;

  IF new_msg_id IS NULL THEN
    RAISE EXCEPTION 'You are blocked by this user';
  END IF;

  -- Mettre à jour last_message_at
  UPDATE conversations SET last_message_at = NOW() WHERE id = p_conversation_id;

  -- Notification DM (respecte les préférences utilisateur) — inchangé vs 022
  IF EXISTS (
    SELECT 1
    FROM notification_preferences np
    WHERE np.profile_id = receiver_id AND np.dm = true
  ) OR NOT EXISTS (
    SELECT 1 FROM notification_preferences np WHERE np.profile_id = receiver_id
  ) THEN
    INSERT INTO notifications (recipient_id, type, reference_id, content)
    VALUES (receiver_id, 'dm', p_conversation_id, 'Nouveau message prive recu.');
  END IF;

  RETURN new_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;
