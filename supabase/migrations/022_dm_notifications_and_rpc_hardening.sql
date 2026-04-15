-- ============================================================
-- CMA CONNECT — Migration 022
-- DM: notification on send + preference-aware delivery
-- ============================================================

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

  -- Notification DM (respecte les préférences utilisateur)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
