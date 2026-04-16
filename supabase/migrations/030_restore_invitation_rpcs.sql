-- ============================================================
-- CMA CONNECT — Migration 030
-- Répare les RPCs d'invitation (migration 021 présente dans
-- schema_migrations mais FONCTIONS ABSENTES de la base).
-- ============================================================
--
-- Contexte : la migration 021 (invitation_rpcs) est marquée comme
-- appliquée dans supabase_migrations.schema_migrations mais un pg_proc
-- `WHERE proname ILIKE '%invitation%'` retourne 0 row. Symptôme observé
-- côté app :
--   1. Alumni génère un lien d'invitation (/profile/edit → OK)
--   2. Invitée ouvre /register/invite/[token] (validate_invitation_token
--      échoue silencieusement → page affiche probablement /register simple)
--   3. Elle finit l'inscription → registerAction voit error côté RPC,
--      inviteValid reste false, profil créé avec status='pending'
--   4. Redirect vers /pending au lieu de /login?invited=1
--
-- Cause probable : reset DB partiel ou rollback manuel qui a drop les
-- fonctions sans reverter la ligne dans schema_migrations.
--
-- Fix : recréer les 2 fonctions avec CREATE OR REPLACE (idempotent).
-- En-têtes search_path = public, pg_catalog ajoutés directement pour
-- éviter un re-fix via migration 027.

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

  RETURN QUERY
    SELECT true, 'ok'::TEXT, p.first_name, p.last_name, p.username
    FROM profiles p WHERE p.id = link.inviter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION validate_invitation_token(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID) TO anon;
GRANT EXECUTE ON FUNCTION validate_invitation_token(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION consume_invitation_token(p_token UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  link_id UUID;
  link_inviter UUID;
BEGIN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION consume_invitation_token(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_invitation_token(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION consume_invitation_token(UUID, UUID) TO service_role;
