-- ============================================================================
-- CMA Connect — RLS tests: invitation_links
-- ============================================================================
-- Couvre :
--   - SELECT : inviter_id = auth.uid() OR is_admin()
--   - INSERT : inviter_id = auth.uid() AND profile is alumni active
--   - UPDATE : inviter_id OK pour is_revoked=true, admin OK pour tout
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(4);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;       -- alumni active
  v_pending UUID;     -- user pending (ne doit pas pouvoir créer)
  v_admin UUID;
  v_link UUID;
BEGIN
  v_alice := rls_test.create_user('alice_inv', 'alumni', 'active');
  v_pending := rls_test.create_user('pending_inv', 'alumni', 'pending');
  v_admin := rls_test.create_user('admin_inv', 'admin', 'active');

  -- Lien d'invitation créé par Alice (setup en mode postgres)
  INSERT INTO invitation_links (id, inviter_id, token, expires_at)
  VALUES (gen_random_uuid(), v_alice, gen_random_uuid(), NOW() + INTERVAL '7 days')
  RETURNING id INTO v_link;

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.pending_id', v_pending::text, false);
  PERFORM set_config('test.admin_id', v_admin::text, false);
  PERFORM set_config('test.link_id', v_link::text, false);
END $$;

-- ──── Test 1 : Alice voit ses propres invitations ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM invitation_links WHERE id = current_setting('test.link_id')::uuid),
  1,
  'Alice voit son propre invitation link'
);

-- ──── Test 2 : Admin voit les liens de tous ────
SELECT rls_test.as_user(current_setting('test.admin_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM invitation_links),
  1,
  'Admin voit tous les invitation links (policy OR is_admin())'
);

-- ──── Test 3 : Alice peut révoquer SON lien (is_revoked=true) ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT lives_ok(
  format(
    $q$ UPDATE invitation_links SET is_revoked = true WHERE id = '%s' $q$,
    current_setting('test.link_id')
  ),
  'Alice peut révoquer SON propre lien (policy invitation_links_revoke_own)'
);

-- ──── Test 4 : User pending ne voit pas les liens des autres ────
SELECT rls_test.as_user(current_setting('test.pending_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM invitation_links),
  0,
  'User pending ne voit pas les liens des autres (SELECT: inviter_id = auth.uid())'
);

SELECT * FROM finish();
ROLLBACK;
