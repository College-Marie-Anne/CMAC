-- ============================================================================
-- CMA Connect — Tests RPC: send_direct_message (post-migration 035)
-- ----------------------------------------------------------------------------
-- Valide le guard blocked_users fusionné atomiquement avec l'INSERT.
--
-- Scénario race (impossible à simuler en pgTAP mono-session mais fermé par
-- la fusion en un seul statement MVCC) :
--   (1) Sender lit conversation + status active → OK
--   (2) Receiver bloque sender (INSERT blocked_users, commit)
--   (3) Sender INSERT direct_messages → avant 035 : le SELECT blocked_users
--       avait vu un snapshot ancien et laissait passer. Après 035, le
--       INSERT ... SELECT ... WHERE NOT EXISTS évalue blocked_users dans
--       le même snapshot que l'INSERT → block détecté → 0 row → RAISE.
--
-- Pour un test concurrent réel, lancer 2 sessions psql :
--   session1: BEGIN; SELECT send_direct_message(<conv>, 'hi');
--   session2: INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (...);
--   session1: COMMIT; -- devrait échouer si on raffine avec SERIALIZABLE
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(6);

-- ──── Fixtures ────
DO $$
DECLARE
  v_alice UUID;
  v_bob UUID;
  v_charlie UUID;
  v_conv_ab UUID;
  v_conv_ac UUID;
BEGIN
  v_alice   := rls_test.create_user('alice_block',   'alumni', 'active');
  v_bob     := rls_test.create_user('bob_block',     'alumni', 'active');
  v_charlie := rls_test.create_user('charlie_block', 'alumni', 'active');

  -- Conversation Alice ↔ Bob
  INSERT INTO conversations (id, participant_1, participant_2)
  VALUES (
    gen_random_uuid(),
    LEAST(v_alice, v_bob),
    GREATEST(v_alice, v_bob)
  )
  RETURNING id INTO v_conv_ab;

  -- Conversation Alice ↔ Charlie (pour test non-participant)
  INSERT INTO conversations (id, participant_1, participant_2)
  VALUES (
    gen_random_uuid(),
    LEAST(v_alice, v_charlie),
    GREATEST(v_alice, v_charlie)
  )
  RETURNING id INTO v_conv_ac;

  PERFORM set_config('test.alice',   v_alice::text,   false);
  PERFORM set_config('test.bob',     v_bob::text,     false);
  PERFORM set_config('test.charlie', v_charlie::text, false);
  PERFORM set_config('test.conv_ab', v_conv_ab::text, false);
  PERFORM set_config('test.conv_ac', v_conv_ac::text, false);
END $$;

-- ──── Test 1 : Alice envoie un DM à Bob → succès ────
SELECT rls_test.as_user(current_setting('test.alice')::uuid);

SELECT lives_ok(
  $q$ SELECT send_direct_message(
        current_setting('test.conv_ab')::uuid,
        'Bonjour Bob'
      ) $q$,
  'Alice (participant, non bloquée) peut envoyer un DM à Bob'
);

-- ──── Test 2 : Charlie (non-participant) tente d''envoyer dans Alice↔Bob ────
SELECT rls_test.as_user(current_setting('test.charlie')::uuid);

SELECT throws_ok(
  $q$ SELECT send_direct_message(
        current_setting('test.conv_ab')::uuid,
        'Intrusion'
      ) $q$,
  'P0001',
  'Not a participant of this conversation',
  'Charlie ne peut pas envoyer dans la conversation Alice↔Bob'
);

-- ──── Test 3 : Bob bloque Alice, Alice tente d''envoyer → refusé (guard atomique) ────
SELECT rls_test.as_postgres();
INSERT INTO blocked_users (blocker_id, blocked_id)
VALUES (
  current_setting('test.bob')::uuid,
  current_setting('test.alice')::uuid
);

SELECT rls_test.as_user(current_setting('test.alice')::uuid);

SELECT throws_ok(
  $q$ SELECT send_direct_message(
        current_setting('test.conv_ab')::uuid,
        'Tentative post-block'
      ) $q$,
  'P0001',
  'You are blocked by this user',
  'DM refusé quand receiver a bloqué sender (guard INSERT ... WHERE NOT EXISTS)'
);

-- ──── Test 4 : aucun message fantôme créé malgré la tentative bloquée ────
SELECT rls_test.as_postgres();

SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages
    WHERE conversation_id = current_setting('test.conv_ab')::uuid
      AND content = 'Tentative post-block'),
  0,
  'Aucun message inséré lors de la tentative post-block (atomicité du guard)'
);

-- ──── Test 5 : le message légitime du test 1 est bien présent ────
SELECT is(
  (SELECT COUNT(*)::int FROM direct_messages
    WHERE conversation_id = current_setting('test.conv_ab')::uuid
      AND content = 'Bonjour Bob'),
  1,
  'Le message légitime du test 1 est bien persisté'
);

-- ──── Test 6 : Alice (sender compte désactivé) ne peut pas envoyer ────
SELECT rls_test.as_postgres();
UPDATE profiles SET status = 'suspended'
  WHERE id = current_setting('test.alice')::uuid;
-- On retire aussi le block pour isoler la cause du raise
DELETE FROM blocked_users
  WHERE blocker_id = current_setting('test.bob')::uuid
    AND blocked_id = current_setting('test.alice')::uuid;

SELECT rls_test.as_user(current_setting('test.alice')::uuid);

SELECT throws_ok(
  $q$ SELECT send_direct_message(
        current_setting('test.conv_ab')::uuid,
        'Post-suspension'
      ) $q$,
  'P0001',
  'Your account is not active',
  'Sender suspended ne peut pas envoyer un DM'
);

SELECT * FROM finish();
ROLLBACK;
