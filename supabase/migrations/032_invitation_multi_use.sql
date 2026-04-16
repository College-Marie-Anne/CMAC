-- ============================================================
-- CMA CONNECT — Migration 032
-- Lien d'invitation : jusqu'à 10 usages au lieu d'un seul.
-- ============================================================
--
-- Contexte : avant, 1 lien = 1 inscription. Souhaité : 1 lien = jusqu'à
-- 10 inscriptions, avec traçabilité de chaque invitée (spec §141).
--
-- Schéma :
--   - `invitation_links.max_uses` (INT, default 10) : plafond configurable
--   - `invitation_links.used_count` (INT, default 0) : compteur incrémenté
--   - `invitation_links.is_used` (legacy bool) : conservé pour rétro-compat
--     UI, mis à true uniquement quand used_count >= max_uses
--   - `invitation_links.used_by` (legacy single UUID) : conservé comme
--     "première invitée" (shortcut affichage), déprécié
--   - Nouvelle table `invitation_link_uses` : une ligne par inscrite via
--     ce lien → la traçabilité complète passe par là
--
-- Les 2 RPCs (validate/consume) sont mises à jour en cohérence.

-- ─── 1. Nouvelles colonnes sur invitation_links ───

ALTER TABLE invitation_links
  ADD COLUMN IF NOT EXISTS max_uses INTEGER NOT NULL DEFAULT 10
    CHECK (max_uses > 0),
  ADD COLUMN IF NOT EXISTS used_count INTEGER NOT NULL DEFAULT 0
    CHECK (used_count >= 0);

-- ─── 2. Nouvelle table de jonction ───
-- Une ligne par inscrite via le lien. Permet l'audit "qui s'est inscrite
-- via quel lien, quand" (spec §141) avec une granularité bien meilleure
-- que le single `used_by` legacy.

CREATE TABLE IF NOT EXISTS invitation_link_uses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_link_id  UUID NOT NULL REFERENCES invitation_links(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  used_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (invitation_link_id, user_id)
);

ALTER TABLE invitation_link_uses ENABLE ROW LEVEL SECURITY;

-- SELECT : l'inviter peut voir ses propres uses, l'admin voit tout.
CREATE POLICY invitation_link_uses_select ON invitation_link_uses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invitation_links il
      WHERE il.id = invitation_link_uses.invitation_link_id
        AND il.inviter_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'admin'
        AND p.status = 'active'
    )
  );

CREATE INDEX IF NOT EXISTS idx_invitation_link_uses_link_id
  ON invitation_link_uses (invitation_link_id);
CREATE INDEX IF NOT EXISTS idx_invitation_link_uses_user_id
  ON invitation_link_uses (user_id);

-- ─── 3. Backfill : rows existantes avec is_used=true ───

INSERT INTO invitation_link_uses (invitation_link_id, user_id)
SELECT id, used_by FROM invitation_links
WHERE is_used = true AND used_by IS NOT NULL
ON CONFLICT (invitation_link_id, user_id) DO NOTHING;

UPDATE invitation_links
SET used_count = 1
WHERE is_used = true AND used_count = 0;

-- ─── 4. Remplace validate_invitation_token ───
-- Check : used_count < max_uses au lieu de is_used=false.

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

  IF link.used_count >= link.max_uses THEN
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

-- ─── 5. Remplace consume_invitation_token ───
-- Incrémente used_count + insère dans invitation_link_uses.
-- is_used devient true quand used_count atteint max_uses (rétro-compat UI).
-- used_by (legacy) reçoit le PREMIER user uniquement.

CREATE OR REPLACE FUNCTION consume_invitation_token(p_token UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  link_id UUID;
  link_inviter UUID;
  link_max INTEGER;
  link_count INTEGER;
BEGIN
  SELECT id, inviter_id, max_uses, used_count
    INTO link_id, link_inviter, link_max, link_count
  FROM invitation_links
  WHERE token = p_token
    AND is_revoked = false
    AND used_count < max_uses
    AND expires_at >= NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Trace cette utilisation (idempotent si le user retente)
  INSERT INTO invitation_link_uses (invitation_link_id, user_id)
  VALUES (link_id, p_user_id)
  ON CONFLICT (invitation_link_id, user_id) DO NOTHING;

  -- Incrémenter le compteur + maintenir is_used en cohérence
  UPDATE invitation_links
  SET used_count = used_count + 1,
      is_used = (used_count + 1 >= max_uses),
      -- Legacy used_by : on garde la première inscrite seulement (pour l'UI admin/profil)
      used_by = COALESCE(used_by, p_user_id)
  WHERE id = link_id;

  -- Notification à l'inviteur à chaque utilisation (spec §1253)
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
