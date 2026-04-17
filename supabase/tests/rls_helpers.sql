-- ============================================================================
-- CMA Connect — pgTAP RLS test helpers
-- ----------------------------------------------------------------------------
-- Fonctions utilitaires pour les tests RLS.
-- À INCLURE dans chaque fichier de test via `\i supabase/tests/rls_helpers.sql`
-- OU en copie-collée (supabase test db exécute chaque fichier en transaction
-- isolée avec ROLLBACK implicite).
--
-- Patterns :
--   - `rls_test.as_user(uuid)` simule une session authenticated pour cet user
--   - `rls_test.as_anon()` simule une session anonyme
--   - `rls_test.create_user(...)` insère user auth + profile en mode admin
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS rls_test;

-- ─────────────────────────────────────────────────────────────────────────────
-- Impersonate un user authenticated (set JWT claims + rôle)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_test.as_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
    true
  );
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reset en rôle postgres (bypass RLS — pour setup de fixtures)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_test.as_postgres()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Impersonate un user anonyme (pas de JWT)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_test.as_anon()
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Crée un user complet (auth.users + profiles) en contournant les policies.
-- Retourne l'UUID de l'user.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rls_test.create_user(
  p_username TEXT,
  p_role profile_role DEFAULT 'alumni',
  p_status profile_status DEFAULT 'active'
) RETURNS UUID AS $$
DECLARE
  v_id UUID := gen_random_uuid();
BEGIN
  -- auth.users : minimum viable pour FK profiles.id
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_username || '@test.local', crypt('test_password', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb
  );

  -- profiles : profil minimal
  INSERT INTO profiles (
    id, username, first_name, last_name, date_of_birth, nationality, country,
    role, status, is_profile_complete
  ) VALUES (
    v_id, p_username, 'Test', p_username, '2000-01-01', ARRAY['Haïtienne'], 'Haïti',
    p_role, p_status, true
  );

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
