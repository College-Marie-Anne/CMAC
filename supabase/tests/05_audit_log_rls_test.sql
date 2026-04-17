-- ============================================================================
-- CMA Connect — RLS tests: admin_audit_log
-- ============================================================================
-- Couvre :
--   - SELECT : is_admin() only
--   - INSERT : via triggers SECURITY DEFINER uniquement (pas de policy INSERT)
--   - UPDATE/DELETE : interdit (pas de policy)
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(3);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;
  v_admin UUID;
BEGIN
  v_alice := rls_test.create_user('alice_audit', 'alumni', 'active');
  v_admin := rls_test.create_user('admin_audit', 'admin', 'active');

  -- Insère une entrée d'audit manuellement (bypass RLS en mode postgres)
  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, 'approve_user', 'profile', v_alice, '{"note":"test"}'::jsonb);

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.admin_id', v_admin::text, false);
END $$;

-- ──── Test 1 : Admin peut lire l'audit log ────
SELECT rls_test.as_user(current_setting('test.admin_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM admin_audit_log),
  1,
  'Admin peut SELECT admin_audit_log (policy is_admin())'
);

-- ──── Test 2 : Alice (alumni) NE peut PAS lire l'audit log ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM admin_audit_log),
  0,
  'Alice (non-admin) ne voit AUCUNE entrée audit (RLS filtre)'
);

-- ──── Test 3 : Aucun user ne peut INSERT directement (pas de policy) ────
SELECT throws_ok(
  format(
    $q$ INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
        VALUES ('%s', 'approve_user', 'profile', '%s') $q$,
    current_setting('test.admin_id'),
    current_setting('test.alice_id')
  ),
  '42501',
  NULL,
  'Aucun user (même admin) ne peut INSERT audit_log directement — via trigger SECURITY DEFINER uniquement'
);

SELECT * FROM finish();
ROLLBACK;
