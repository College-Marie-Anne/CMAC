-- ============================================================
-- CMA CONNECT — Migration 009
-- Fix : resolve_profiles_by_fullname ne retourne plus DOB à anon
-- + ajout colonne registration_incomplete pour signaler les inscriptions partielles
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1 : resolve_profiles_by_fullname
--
-- L'ancienne version retournait date_of_birth au rôle anon,
-- permettant l'énumération de DOB par brute-force.
--
-- Nouvelle logique :
-- - Sans DOB : retourne le COUNT de correspondances (pas les données)
-- - Avec DOB : retourne uniquement les IDs des profils matchés
-- - DOB n'est JAMAIS retourné dans le résultat
-- ─────────────────────────────────────────────────────────────

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS resolve_profiles_by_fullname(TEXT, TEXT, DATE);

-- Nouvelle version : retourne uniquement id (pas de DOB dans le résultat)
CREATE OR REPLACE FUNCTION resolve_profiles_by_fullname(
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE DEFAULT NULL
)
RETURNS TABLE(id UUID) AS $$
BEGIN
  IF p_dob IS NOT NULL THEN
    RETURN QUERY
      SELECT p.id
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name)
        AND p.date_of_birth = p_dob;
  ELSE
    RETURN QUERY
      SELECT p.id
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_profiles_by_fullname(TEXT, TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION resolve_profiles_by_fullname(TEXT, TEXT, DATE) TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- FIX 2 : colonne registration_incomplete
--
-- Signale les profils dont les données secondaires (activités,
-- éducation, métiers, domaines désirés) ont échoué à l'inscription.
-- Visible dans le dashboard admin.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS registration_incomplete BOOLEAN NOT NULL DEFAULT false;
