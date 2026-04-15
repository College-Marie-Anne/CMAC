-- ============================================================
-- CMA CONNECT — Migration 018
-- Security hardening:
--   FIX 1 — Trigger BEFORE INSERT sur desired_study_fields : enforce max 3
--           (la policy desired_study_fields_insert_own de 016 contourne la RPC ;
--            on sécurise au niveau DB pour que le plafond soit inviolable
--            quelle que soit la voie d'accès — RPC, INSERT direct, psql, etc.)
--
--   FIX 2 — Ajouter WITH CHECK à profiles_update_admin (défense en profondeur)
--           Le trigger prevent_super_admin_change (008) bloque déjà le changement
--           de is_super_admin, mais la policy manquait son WITH CHECK (ceinture-
--           bretelles recommandée).
--
--   FIX 3 — Nettoyage défensif de l'ENUM admin_deactivation_status + cruft
--           résiduel des migrations 001-004. La migration 006 le dropait déjà,
--           mais IF EXISTS CASCADE protège contre les réapplications partielles.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- FIX 1 : Plafond de 3 desired_study_fields inviolable (trigger DB)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION enforce_desired_study_fields_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM desired_study_fields
  WHERE profile_id = NEW.profile_id;

  IF current_count >= 3 THEN
    RAISE EXCEPTION
      'Maximum 3 desired study fields per profile (currently % for profile %)',
      current_count, NEW.profile_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_desired_study_fields_limit ON desired_study_fields;
CREATE TRIGGER trg_enforce_desired_study_fields_limit
  BEFORE INSERT ON desired_study_fields
  FOR EACH ROW
  EXECUTE FUNCTION enforce_desired_study_fields_limit();


-- ─────────────────────────────────────────────────────────────
-- FIX 1bis : RPC atomique replace_desired_study_fields
--
-- Le pattern DELETE + bulk INSERT côté client (profile.ts:170-179)
-- se fait en 2 requêtes PostgREST séparées → fenêtre où
-- l'utilisatrice se retrouve avec 0 domaine si l'INSERT plante.
--
-- Cette RPC fait la même chose atomiquement (transaction DB unique)
-- et rejette côté serveur si le nouveau tableau dépasse 3 éléments.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION replace_desired_study_fields(p_fields TEXT[])
RETURNS VOID AS $$
DECLARE
  len INT;
BEGIN
  len := COALESCE(array_length(p_fields, 1), 0);

  IF len > 3 THEN
    RAISE EXCEPTION 'Maximum 3 desired study fields allowed (% provided)', len
      USING ERRCODE = 'check_violation';
  END IF;

  -- Atomic replacement
  DELETE FROM desired_study_fields WHERE profile_id = auth.uid();

  IF len > 0 THEN
    INSERT INTO desired_study_fields (profile_id, field_name)
    SELECT auth.uid(), unnest(p_fields);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION replace_desired_study_fields(TEXT[]) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- FIX 2 : profiles_update_admin — ajout WITH CHECK
--
-- Avant : USING (is_admin()) sans CHECK → un admin pouvait en théorie
--         UPDATE toute ligne (protégé uniquement par le trigger 008
--         pour le champ is_super_admin).
-- Après : USING + WITH CHECK — l'admin doit rester admin après l'UPDATE.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS profiles_update_admin ON profiles;

CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ─────────────────────────────────────────────────────────────
-- FIX 3 : Nettoyage défensif — ENUM admin_deactivation_status
--
-- Déjà dropé en 006:15, mais on garantit l'état final avec CASCADE
-- au cas où une dépendance oubliée bloque le drop initial.
-- Tables et fonctions déjà droppées (006:11-14), cleanup idempotent.
-- ─────────────────────────────────────────────────────────────

-- Ordre : tables → fonction → trigger (idempotent, no-op si déjà dropped)
DROP TABLE IF EXISTS admin_deactivation_approvals CASCADE;
DROP TABLE IF EXISTS admin_deactivation_votes CASCADE;
DROP FUNCTION IF EXISTS check_admin_deactivation_threshold() CASCADE;
DROP TYPE IF EXISTS admin_deactivation_status CASCADE;


-- ─────────────────────────────────────────────────────────────
-- Vérification finale (ne plante pas, juste un NOTICE)
-- ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  residual_count INT;
BEGIN
  SELECT COUNT(*) INTO residual_count
  FROM pg_type WHERE typname = 'admin_deactivation_status';
  IF residual_count > 0 THEN
    RAISE WARNING 'admin_deactivation_status ENUM still exists after cleanup';
  END IF;

  SELECT COUNT(*) INTO residual_count
  FROM pg_proc WHERE proname = 'check_admin_deactivation_threshold';
  IF residual_count > 0 THEN
    RAISE WARNING 'check_admin_deactivation_threshold function still exists';
  END IF;

  SELECT COUNT(*) INTO residual_count
  FROM pg_tables
  WHERE tablename IN ('admin_deactivation_votes', 'admin_deactivation_approvals');
  IF residual_count > 0 THEN
    RAISE WARNING 'admin_deactivation_* tables still exist';
  END IF;
END $$;
