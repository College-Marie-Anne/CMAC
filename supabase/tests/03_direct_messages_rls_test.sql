-- ============================================================================
-- CMA Connect — RLS tests: direct_messages
-- ============================================================================
-- Couvre :
--   - SELECT : is_active() AND participant conversation AND (soft-delete logic)
--   - soft-delete per-side : sender voit !is_deleted_by_sender, receiver voit !is_deleted_by_receiver
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
  v_conv_ab UUID;
  v_msg_normal UUID;
  v_msg_del_sender UUID;
  v_msg_del_receiver UUID;
BEGIN
  v_alice := rls_test.create_user('alice_dm', 'alumni', 'active');
  v_bob := rls_test.create_user('bob_dm', 'alumni', 'active');
  v_charlie := rls_test.create_user('charlie_dm', 'alumni', 'active');

  INSERT INTO conversations (id, participant_1, participant_2)
  VALUES (gen_random_uuid(), LEAST(v_alice, v_bob), GREATEST(v_alice, v_bob))
  RETURNING id INTO v_conv_ab;

  -- Message normal de Alice vers Bob
  INSERT INTO direct_messages (id, conversation_id, sender_id, content)
  VALUES (gen_random_uuid(), v_conv_ab, v_alice, 'Bonjour Bob !')
  RETURNING id INTO v_msg_normal;

  -- Message deleted par sender (Alice) → invisible à Alice, visible à Bob
  INSERT INTO direct_messages (id, conversation_id, sender_id, content, is_deleted_by_sender)
  VALUES (gen_random_uuid(), v_conv_ab, v_alice, 'Message supprimé par Alice', true)
  RETURNING id INTO v_msg_del_sender;

  -- Message deleted par receiver (Bob) → visible à Alice (sender), invisible à Bob
  INSERT INTO direct_messages (id, conversation_id, sender_id, content, is_deleted_by_receiver)
  VALUES (gen_random_uuid(), v_conv_ab, v_alice, 'Message supprimé par Bob', true)
  RETURNING id INTO v_msg_del_receiver;

  PERFORM set_config('test.alice_id', v_alice::text, false);
  PERFORM set_config('test.bob_id', v_bob::text, false);
  PERFORM set_config('test.charlie_id', v_charlie::text, false);
  PERFORM set_config('test.msg_normal', v_msg_normal::text, false);
  PERFORM set_config('test.msg_del_sender', v_msg_del_sender::text, false);
  PERFORM set_config('test.msg_del_receiver', v_msg_del_receiver::text, false);
END $$;

-- ──── Test 1 : Alice (sender) voit le message normal ────
SELECT rls_test.as_user(current_setting('test.alice_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages WHERE id = current_setting('test.msg_normal')::uuid),
  1,
  'Alice (sender + participant) voit son message normal'
);

-- ──── Test 2 : Alice NE voit PAS son message qu''elle a supprimé (deleted_by_sender) ────
SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages WHERE id = current_setting('test.msg_del_sender')::uuid),
  0,
  'Alice (sender) NE voit PAS le message supprimé de son côté (is_deleted_by_sender)'
);

-- ──── Test 3 : Alice voit encore le message que Bob a supprimé de son côté ────
SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages WHERE id = current_setting('test.msg_del_receiver')::uuid),
  1,
  'Alice (sender) voit encore le message que Bob (receiver) a supprimé de son côté'
);

-- ──── Test 4 : Bob (receiver) NE voit PAS le message qu''il a supprimé ────
SELECT rls_test.as_user(current_setting('test.bob_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages WHERE id = current_setting('test.msg_del_receiver')::uuid),
  0,
  'Bob (receiver) NE voit PAS le message qu''il a supprimé (is_deleted_by_receiver)'
);

-- ──── Test 5 : Charlie (non participant) ne voit AUCUN message ────
SELECT rls_test.as_user(current_setting('test.charlie_id')::uuid);

SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages),
  0,
  'Charlie (non participant) ne voit aucun message de la conversation Alice↔Bob'
);

SELECT * FROM finish();
ROLLBACK;
