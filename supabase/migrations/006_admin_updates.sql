-- ============================================================
-- CMA CONNECT — Migration 006
-- Mise à jour admin : super-admin, suppression votes, nouveaux champs
-- ============================================================

-- 1. Ajouter les colonnes manquantes à profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- 2. Supprimer les tables de votes de désactivation admin (remplacées par action directe LakouSystems)
DROP TRIGGER IF EXISTS trg_check_admin_deactivation ON admin_deactivation_approvals;
DROP FUNCTION IF EXISTS check_admin_deactivation_threshold();
DROP TABLE IF EXISTS admin_deactivation_approvals;
DROP TABLE IF EXISTS admin_deactivation_votes;
DROP TYPE IF EXISTS admin_deactivation_status;

-- 3. RLS : bloquer toute modification de is_super_admin
-- (la colonne est immuable, settée uniquement par ce seed)
CREATE POLICY profiles_block_super_admin_update ON profiles
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    -- Si is_super_admin change, bloquer
    is_super_admin = (SELECT is_super_admin FROM profiles WHERE id = auth.uid())
  );
