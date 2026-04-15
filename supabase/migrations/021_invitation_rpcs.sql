-- ============================================================
-- CMA CONNECT — Migration 021
-- RPCs pour le flow d'inscription via lien d'invitation alumni
-- (spec §130-142, §429)
--
-- RLS sur invitation_links (004:538-554) :
--   SELECT : inviter uniquement OU admin
--   → impossible pour un anon d'interroger la table depuis la page
--     /register/invite/[token]. On ajoute donc 2 RPCs SECURITY DEFINER.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- validate_invitation_token
--
-- Appelée par la page publique /register/invite/[token] pour
-- savoir si le token est utilisable + afficher qui a invité.
-- Ne modifie rien. Ne retourne JAMAIS l'ID de l'inviteur ni
-- d'autres infos sensibles — uniquement prénom/nom/username
-- pour l'affichage "Invitée par …".
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION validate_invitation_token(p_token UUID)
RETURNS TABLE(
  valid BOOLEAN,
  reason TEXT,
  inviter_first_name TEXT,
  inviter_last_name TEXT,
  inviter_username TEXT
) AS $$
DECLARE
  link RECORD;
BEGIN
  SELECT * INTO link FROM invitation_links WHERE token = p_token LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF link.is_revoked THEN
    RETURN QUERY SELECT false, 'revoked'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF link.is_used THEN
    RETURN QUERY SELECT false, 'used'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF link.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Valide — récupérer l'inviteur (l'inviter_id peut être NULL si profil purgé,
  -- mais en pratique les profils ne sont jamais hard-deleted → toujours présent)
  RETURN QUERY
    SELECT true, 'ok'::TEXT, p.first_name, p.last_name, p.username
    FROM profiles p WHERE p.id = link.inviter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Accessible en anon (nécessaire pour la page d'invitation publique)
REVOKE ALL ON FUNCTION validate_invitation_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- consume_invitation_token
--
-- Appelée après création du profil dans registerAction.
-- Opérations atomiques (FOR UPDATE lock) :
--   1. Re-valide le token (évite race condition entre validate et consume)
--   2. Marque is_used = true, used_by = p_user_id
--   3. Insère une notification 'invitation_used' pour l'inviteur
-- Retourne TRUE si consommé, FALSE si invalide (caller doit rollback).
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION consume_invitation_token(p_token UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  link_id UUID;
  link_inviter UUID;
BEGIN
  -- Lock la row pour éviter que 2 inscriptions consomment le même token
  SELECT id, inviter_id INTO link_id, link_inviter
  FROM invitation_links
  WHERE token = p_token
    AND is_used = false
    AND is_revoked = false
    AND expires_at >= NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE invitation_links
  SET is_used = true, used_by = p_user_id
  WHERE id = link_id;

  -- Notifier l'inviteur (spec §1253)
  IF link_inviter IS NOT NULL THEN
    INSERT INTO notifications (recipient_id, type, reference_id, content)
    VALUES (
      link_inviter,
      'invitation_used',
      p_user_id,
      'Une utilisatrice s''est inscrite avec votre lien d''invitation'
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION consume_invitation_token(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_invitation_token(UUID, UUID) TO authenticated;
