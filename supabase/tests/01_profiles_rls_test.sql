-- ============================================================================
-- CMA Connect — RLS tests: profiles
-- ============================================================================
-- Couvre :
--   - SELECT: public pour tout user authenticated (policy profiles_select USING true)
--   - INSERT: id = auth.uid()
--   - UPDATE own: id = auth.uid()
--   - UPDATE admin: is_admin()
--   - DELETE: interdit (pas de policy)
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(7);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_admin UUID;
BEGIN
  v_alice := rls_test.create_user('alice_profiles', 'alumni', 'active');
  v_bob := rls_test.create_user('bob_profiles', 'alumni', 'active');
  v_admin := rls_test.create_user('admin_profiles', 'admin', 'active');

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.bob_id', v_bob::text, false);
  PERFORM set_config('test.admin_id', v_admin::text, false);
END $$;

-- ──── Test 1 : Alice (alumni) peut lire tous les profiles ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT ok(
  (SELECT COUNT(*) FROM profiles WHERE username IN ('alice_profiles','bob_profiles','admin_profiles')) = 3,
  'Alice (alumni) peut SELECT les 3 profiles (policy profiles_select USING true)'
);

-- ──── Test 2 : Alice peut UPDATE son propre profile ────
SELECT lives_ok(
  $q$ UPDATE profiles SET bio = 'Ma bio mise à jour' WHERE username = 'alice_profiles' $q$,
  'Alice peut UPDATE son propre profile (id = auth.uid())'
);

-- ──── Test 3 : Alice NE PEUT PAS UPDATE le profile de Bob ────
-- Sous RLS, un UPDATE non autorisé ne throw pas — il ne matche simplement
-- aucune ligne. On vérifie donc que la ligne cible n'a pas changé.
UPDATE profiles SET bio = 'injection' WHERE username = 'bob_profiles';

SELECT is(
  (SELECT bio FROM profiles WHERE username = 'bob_profiles'),
  NULL,
  'Alice ne peut PAS modifier le profile de Bob (RLS filtre l''UPDATE)'
);

-- ──── Test 4 : Admin peut UPDATE le profile de Bob ────
SELECT rls_test.as_user(current_setting('test.admin_id')::uuid);

SELECT lives_ok(
  $q$ UPDATE profiles SET bio = 'Par admin' WHERE username = 'bob_profiles' $q$,
  'Admin peut UPDATE le profile de Bob (policy profiles_update_admin)'
);

SELECT is(
  (SELECT bio FROM profiles WHERE username = 'bob_profiles'),
  'Par admin',
  'Le bio de Bob a bien été modifié par l''admin'
);

-- ──── Test 5 : Personne (pas même admin) ne peut DELETE ────
SELECT rls_test.as_user(current_setting('test.admin_id')::uuid);

-- DELETE silencieux sous RLS (pas de policy DELETE sur profiles)
DELETE FROM profiles WHERE username = 'bob_profiles';

SELECT ok(
  EXISTS(SELECT 1 FROM profiles WHERE username = 'bob_profiles'),
  'Même un admin ne peut PAS DELETE un profile (aucune policy DELETE)'
);

-- ──── Test 6 : Alice ne peut PAS INSERT avec un autre id ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT throws_ok(
  format(
    $q$ INSERT INTO profiles (id, username, first_name, last_name, date_of_birth, nationality, country, role, status)
        VALUES ('%s'::uuid, 'fake_user', 'X', 'Y', '2000-01-01', ARRAY['Haïtienne'], 'Haïti', 'alumni', 'active') $q$,
    gen_random_uuid()
  ),
  '42501',
  NULL,
  'Alice ne peut PAS INSERT un profile avec id ≠ auth.uid() (WITH CHECK id = auth.uid())'
);

SELECT * FROM finish();
ROLLBACK;
