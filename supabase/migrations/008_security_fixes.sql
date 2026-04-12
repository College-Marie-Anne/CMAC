-- ============================================================
-- CMA CONNECT — Migration 008
-- Corrections de sécurité : RLS super_admin + trigger purge DM
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1 : RLS profiles_block_super_admin_update
--
-- L'ancienne policy comparait is_super_admin avec la valeur courante
-- du profil de l'utilisateur connecté (circulaire). La bonne logique
-- est : si la LIGNE modifiée a is_super_admin = true, seul le
-- super-admin lui-même peut la modifier, ET is_super_admin ne peut
-- jamais changer de valeur via UPDATE.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_block_super_admin_update ON profiles;

-- Policy 1 : empêcher tout changement de is_super_admin via un trigger
-- (WITH CHECK ne peut pas comparer OLD vs NEW, donc on utilise un trigger)
CREATE OR REPLACE FUNCTION prevent_super_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- is_super_admin est immuable : aucun UPDATE ne peut le modifier
  IF OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin THEN
    RAISE EXCEPTION 'Le champ is_super_admin est immuable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_super_admin_change ON profiles;
CREATE TRIGGER trg_prevent_super_admin_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_change();

-- ─────────────────────────────────────────────────────────────
-- FIX 2 : purge_deleted_dm() — BEFORE UPDATE au lieu de AFTER UPDATE
--
-- L'ancien trigger AFTER UPDATE exécutait DELETE sur la même ligne
-- qui venait d'être mise à jour, causant potentiellement des
-- violations FK et des comportements imprévisibles.
-- Avec BEFORE UPDATE + RETURN NULL, la ligne est supprimée
-- proprement sans que l'UPDATE ne se termine.
-- ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_purge_deleted_dm ON direct_messages;

CREATE OR REPLACE FUNCTION purge_deleted_dm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_deleted_by_sender = true AND NEW.is_deleted_by_receiver = true THEN
    -- Supprimer la ligne. L'image dans Storage sera nettoyée côté application.
    DELETE FROM direct_messages WHERE id = OLD.id;
    -- RETURN NULL empêche l'UPDATE de se finaliser (ligne déjà supprimée)
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purge_deleted_dm
  BEFORE UPDATE OF is_deleted_by_sender, is_deleted_by_receiver
  ON direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION purge_deleted_dm();
