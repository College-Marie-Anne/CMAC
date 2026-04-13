-- ============================================================
-- CMA CONNECT — Migration 016
-- RLS pour l'édition profil par l'utilisatrice (user_education,
-- user_professions, desired_study_fields) + bucket avatars
-- ============================================================

-- user_education : permettre UPDATE de ses propres parcours
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_education_update_own' AND tablename = 'user_education'
  ) THEN
    CREATE POLICY user_education_update_own ON user_education
      FOR UPDATE TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

-- user_professions : permettre UPDATE de ses propres métiers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_professions_update_own' AND tablename = 'user_professions'
  ) THEN
    CREATE POLICY user_professions_update_own ON user_professions
      FOR UPDATE TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;

-- desired_study_fields : permettre INSERT direct (en plus du RPC existant)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'desired_study_fields_insert_own' AND tablename = 'desired_study_fields'
  ) THEN
    CREATE POLICY desired_study_fields_insert_own ON desired_study_fields
      FOR INSERT TO authenticated
      WITH CHECK (profile_id = auth.uid());
  END IF;
END $$;
