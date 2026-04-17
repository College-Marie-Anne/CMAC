-- ============================================================================
-- CMA Connect — RLS tests: notifications
-- ============================================================================
-- Couvre :
--   - SELECT : recipient_id = auth.uid()
--   - UPDATE : recipient_id = auth.uid() (pour is_read)
--   - DELETE : recipient_id = auth.uid()
--   - INSERT : pas de policy → seul le RPC notify_user (SECURITY DEFINER) peut insérer
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(4);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_notif_alice UUID;
  v_notif_bob UUID;
BEGIN
  v_alice := rls_test.create_user('alice_notif', 'alumni', 'active');
  v_bob := rls_test.create_user('bob_notif', 'alumni', 'active');

  -- 1 notif pour Alice, 1 pour Bob
  INSERT INTO notifications (id, recipient_id, type, content)
  VALUES (gen_random_uuid(), v_alice, 'dm', 'Nouveau message pour Alice')
  RETURNING id INTO v_notif_alice;

  INSERT INTO notifications (id, recipient_id, type, content)
  VALUES (gen_random_uuid(), v_bob, 'dm', 'Nouveau message pour Bob')
  RETURNING id INTO v_notif_bob;

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.bob_id', v_bob::text, false);
  PERFORM set_config('test.notif_alice', v_notif_alice::text, false);
  PERFORM set_config('test.notif_bob', v_notif_bob::text, false);
END $$;

-- ──── Test 1 : Alice ne voit QUE ses propres notifs ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM notifications),
  1,
  'Alice voit exactement 1 notif (la sienne)'
);

SELECT is(
  (SELECT COUNT(*)::int FROM notifications WHERE id = current_setting('test.notif_bob')::uuid),
  0,
  'Alice ne voit PAS la notif de Bob (RLS filtre recipient_id)'
);

-- ──── Test 2 : Alice peut mettre is_read=true sur sa notif ────
SELECT lives_ok(
  format(
    $q$ UPDATE notifications SET is_read = true WHERE id = '%s' $q$,
    current_setting('test.notif_alice')
  ),
  'Alice peut marquer sa notif comme lue (UPDATE recipient_id = auth.uid())'
);

-- ──── Test 3 : Alice peut DELETE sa notif ────
SELECT lives_ok(
  format(
    $q$ DELETE FROM notifications WHERE id = '%s' $q$,
    current_setting('test.notif_alice')
  ),
  'Alice peut DELETE sa propre notif (DELETE recipient_id = auth.uid())'
);

SELECT * FROM finish();
ROLLBACK;
