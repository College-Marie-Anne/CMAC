-- ============================================================
-- CMA CONNECT — Migration 010
-- Index manquants + RLS profile_activities UPDATE policy
-- ============================================================

-- ─── Index manquants ───

-- blocked_users : reverse lookup (qui m'a bloqué ?)
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id
  ON blocked_users (blocked_id);

-- promo_elections : filtrage par statut (élection active en cours ?)
CREATE INDEX IF NOT EXISTS idx_promo_elections_status
  ON promo_elections (status);

-- mentorship_sessions : lookup par mentor
CREATE INDEX IF NOT EXISTS idx_mentorship_sessions_mentor_id
  ON mentorship_sessions (mentor_id);

-- ─── RLS : profile_activities UPDATE policy ───
-- Permet à une utilisatrice de modifier ses propres associations
-- (en pratique c'est DELETE + INSERT, mais la policy empêche les erreurs)

-- Note : profile_activities a une PK composite (profile_id, activity_id)
-- et aucun champ modifiable. L'UPDATE n'a pas de sens fonctionnel
-- mais on ajoute une policy permissive pour éviter les erreurs silencieuses
-- si un client tente un UPDATE au lieu de DELETE + INSERT.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profile_activities'
    AND policyname = 'profile_activities_update_own'
  ) THEN
    CREATE POLICY profile_activities_update_own ON profile_activities
      FOR UPDATE TO authenticated
      USING (auth.uid() = profile_id)
      WITH CHECK (auth.uid() = profile_id);
  END IF;
END $$;
