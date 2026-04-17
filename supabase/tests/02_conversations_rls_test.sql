-- ============================================================================
-- CMA Connect — RLS tests: conversations
-- ============================================================================
-- Couvre :
--   - SELECT : is_active() AND participant AND NOT is_admin()
--              → les admins sont EXPLICITEMENT EXCLUS (privacy des DMs)
--   - UPDATE : is_active() AND participant
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(5);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_charlie UUID;
  v_admin UUID;
  v_conv_ab UUID;
  v_conv_bc UUID;
BEGIN
  v_alice := rls_test.create_user('alice_conv', 'alumni', 'active');
  v_bob := rls_test.create_user('bob_conv', 'alumni', 'active');
  v_charlie := rls_test.create_user('charlie_conv', 'alumni', 'active');
  v_admin := rls_test.create_user('admin_conv', 'admin', 'active');

  -- Deux conversations : Alice↔Bob et Bob↔Charlie
  -- Contrainte DB: participant_1 < participant_2 → tri UUID
  INSERT INTO conversations (id, participant_1, participant_2)
  VALUES (
    gen_random_uuid(),
    LEAST(v_alice, v_bob),
    GREATEST(v_alice, v_bob)
  ) RETURNING id INTO v_conv_ab;

  INSERT INTO conversations (id, participant_1, participant_2)
  VALUES (
    gen_random_uuid(),
    LEAST(v_bob, v_charlie),
    GREATEST(v_bob, v_charlie)
  ) RETURNING id INTO v_conv_bc;

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.bob_id', v_bob::text, false);
  PERFORM set_config('test.charlie_id', v_charlie::text, false);
  PERFORM set_config('test.admin_id', v_admin::text, false);
  PERFORM set_config('test.conv_ab', v_conv_ab::text, false);
  PERFORM set_config('test.conv_bc', v_conv_bc::text, false);
END $$;

-- ──── Test 1 : Alice voit sa conversation avec Bob ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM conversations WHERE id = current_setting('test.conv_ab')::uuid),
  1,
  'Alice voit sa conversation avec Bob (participant)'
);

-- ──── Test 2 : Alice ne voit PAS la conversation Bob↔Charlie ────
SELECT is(
  (SELECT COUNT(*)::int FROM conversations WHERE id = current_setting('test.conv_bc')::uuid),
  0,
  'Alice ne voit PAS la conversation Bob↔Charlie (non participante)'
);

-- ──── Test 3 : Alice voit exactement 1 conversation (la sienne) ────
SELECT is(
  (SELECT COUNT(*)::int FROM conversations),
  1,
  'Alice voit exactement 1 conversation dans toute la table'
);

-- ──── Test 4 : CRITIQUE — Admin NE voit PAS les conversations des users ────
-- Policy conversations_select a `AND NOT is_admin()` explicitement pour la
-- privacy. Un admin ne doit jamais lire les DMs, même comme super-admin.
SELECT rls_test.as_user(current_setting('test.admin_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM conversations),
  0,
  'CRITIQUE : admin ne voit AUCUNE conversation (policy exclut les admins)'
);

-- ──── Test 5 : Bob peut UPDATE sa conversation (archiver) ────
SELECT rls_test.as_user(current_setting('test.bob_id')::uuid);

SELECT lives_ok(
  format(
    $q$ UPDATE conversations SET archived_by_1 = true WHERE id = '%s' $q$,
    current_setting('test.conv_ab')
  ),
  'Bob (participant) peut UPDATE la conversation Alice↔Bob'
);

SELECT * FROM finish();
ROLLBACK;
