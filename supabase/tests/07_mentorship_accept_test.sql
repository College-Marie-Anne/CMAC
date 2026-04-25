-- ============================================================================
-- CMA Connect — Tests RPC: accept_mentorship_request (post-migration 035)
-- ----------------------------------------------------------------------------
-- Couvre les guards fonctionnels qui, combinés au `SELECT ... FOR UPDATE`
-- et à `pg_advisory_xact_lock(mentee_id)` introduits en 035, ferment la
-- fenêtre de race TOCTOU identifiée par l'audit.
--
-- Scénarios race condition (non simulables en pgTAP mono-session mais
-- validés par ces guards + locks) :
--   (A) 2 alumni acceptent la même request → le 2e voit status='accepted'
--       après le FOR UPDATE lock → RAISE 'Request is not pending'. TEST 2.
--   (B) 2 alumni acceptent 2 requests différentes de la même mentee (quota
--       déjà à 2) → l'advisory lock sérialise, le 2e voit count=3 et
--       RAISE 'Mentee already has 3...'. TEST 5.
--
-- Pour un test concurrent réel, lancer 2 sessions psql en parallèle :
--   session1: BEGIN; SELECT accept_mentorship_request('<id>'); -- ne commit pas
--   session2: SELECT accept_mentorship_request('<id>'); -- bloque puis rollback
-- ============================================================================

BEGIN;

\i supabase/tests/rls_helpers.sql

SELECT plan(7);

-- ──── Fixtures ────
DO $$
DECLARE
  v_mentee UUID;
  v_alumni_a UUID;
  v_alumni_b UUID;
  v_student UUID;
  v_req_open UUID;
  v_req_targeted UUID;
  v_req_quota UUID;
BEGIN
  v_mentee    := rls_test.create_user('mentee1',     'alumni',  'active');
  v_alumni_a  := rls_test.create_user('alumni_a',    'alumni',  'active');
  v_alumni_b  := rls_test.create_user('alumni_b',    'alumni',  'active');
  v_student   := rls_test.create_user('student_ment','student', 'active');

  -- Demande ouverte (mentor_id NULL) — acceptable par n'importe quel alumni
  INSERT INTO mentorship_requests (id, mentee_id, mentor_id, message, study_field, status)
  VALUES (gen_random_uuid(), v_mentee, NULL, 'Besoin aide orientation', 'Informatique', 'pending')
  RETURNING id INTO v_req_open;

  -- Demande ciblée sur alumni_a uniquement
  INSERT INTO mentorship_requests (id, mentee_id, mentor_id, message, study_field, status)
  VALUES (gen_random_uuid(), v_mentee, v_alumni_a, 'Demande ciblée', 'Médecine', 'pending')
  RETURNING id INTO v_req_targeted;

  -- Demande pour tester le quota
  INSERT INTO mentorship_requests (id, mentee_id, mentor_id, message, study_field, status)
  VALUES (gen_random_uuid(), v_mentee, NULL, 'Test quota', 'Droit', 'pending')
  RETURNING id INTO v_req_quota;

  PERFORM set_config('test.mentee',       v_mentee::text,       false);
  PERFORM set_config('test.alumni_a',     v_alumni_a::text,     false);
  PERFORM set_config('test.alumni_b',     v_alumni_b::text,     false);
  PERFORM set_config('test.student',      v_student::text,      false);
  PERFORM set_config('test.req_open',     v_req_open::text,     false);
  PERFORM set_config('test.req_targeted', v_req_targeted::text, false);
  PERFORM set_config('test.req_quota',    v_req_quota::text,    false);
END $$;

-- ──── Test 1 : alumni_a accepte la demande ouverte → succès ────
SELECT rls_test.as_user(current_setting('test.alumni_a')::uuid);

SELECT lives_ok(
  $q$ SELECT accept_mentorship_request(current_setting('test.req_open')::uuid) $q$,
  'alumni_a accepte une demande ouverte pending → succès'
);

-- ──── Test 2 (race A) : alumni_b tente d''accepter la MÊME request déjà acceptée ────
-- Simule le scénario où 2 alumni cliquent "Accepter" au même moment.
-- Après 035, le FOR UPDATE sérialise : le 2e voit status='accepted' et échoue.
SELECT rls_test.as_user(current_setting('test.alumni_b')::uuid);

SELECT throws_ok(
  $q$ SELECT accept_mentorship_request(current_setting('test.req_open')::uuid) $q$,
  'P0001',
  'Request is not pending',
  'alumni_b ne peut pas accepter une request déjà acceptée (guard FOR UPDATE)'
);

-- ──── Test 3 : non-alumni (student) tente d''accepter ────
SELECT rls_test.as_user(current_setting('test.student')::uuid);

SELECT throws_ok(
  $q$ SELECT accept_mentorship_request(current_setting('test.req_quota')::uuid) $q$,
  'P0001',
  'Only active alumni can accept mentorship requests',
  'Un student ne peut pas accepter une demande de mentorat'
);

-- ──── Test 4 : alumni_b tente d''accepter une demande ciblée vers alumni_a ────
SELECT rls_test.as_user(current_setting('test.alumni_b')::uuid);

SELECT throws_ok(
  $q$ SELECT accept_mentorship_request(current_setting('test.req_targeted')::uuid) $q$,
  'P0001',
  'This request is not addressed to you',
  'alumni_b ne peut pas accepter une demande ciblée vers alumni_a'
);

-- ──── Test 5 (race B) : quota mentee à 3 → 4e acceptation refusée ────
-- Simule la race : 2 alumni acceptent 2 requests différentes de la même mentee.
-- Avec l'advisory lock, le 2e voit count=3 et échoue.
-- Ici on reproduit l'état "après le 1er commit" en insérant 2 sessions actives
-- manuellement + la session du test 1 (déjà acceptée), total=3.
SELECT rls_test.as_postgres();
DO $$
DECLARE
  v_mentee UUID := current_setting('test.mentee')::uuid;
  v_alumni_a UUID := current_setting('test.alumni_a')::uuid;
  v_req UUID;
BEGIN
  -- 2 sessions supplémentaires pour v_mentee (test 1 en a déjà créé 1)
  FOR i IN 1..2 LOOP
    INSERT INTO mentorship_requests (id, mentee_id, mentor_id, message, study_field, status)
    VALUES (gen_random_uuid(), v_mentee, v_alumni_a, 'Filler ' || i, 'Test', 'accepted')
    RETURNING id INTO v_req;

    INSERT INTO mentorship_sessions (request_id, mentor_id, mentee_id, status)
    VALUES (v_req, v_alumni_a, v_mentee, 'active');
  END LOOP;
END $$;

SELECT rls_test.as_user(current_setting('test.alumni_b')::uuid);

SELECT throws_ok(
  $q$ SELECT accept_mentorship_request(current_setting('test.req_quota')::uuid) $q$,
  'P0001',
  'Mentee already has 3 active mentorship sessions',
  'Quota mentee : 4e acceptation refusée (guard advisory lock)'
);

-- ──── Test 6 : session ET conversation DM créées après acceptation réussie ────
-- Validé implicitement via test 1 — on compte les effets de bord.
SELECT rls_test.as_postgres();

SELECT is(
  (SELECT COUNT(*)::int FROM mentorship_sessions
    WHERE request_id = current_setting('test.req_open')::uuid
      AND status = 'active'),
  1,
  'Une session active créée pour la request acceptée (test 1)'
);

-- ──── Test 7 : conversation DM créée entre alumni_a et mentee ────
SELECT is(
  (SELECT COUNT(*)::int FROM conversations
    WHERE (participant_1 = LEAST(
              current_setting('test.alumni_a')::uuid,
              current_setting('test.mentee')::uuid)
           AND participant_2 = GREATEST(
              current_setting('test.alumni_a')::uuid,
              current_setting('test.mentee')::uuid))),
  1,
  'Une conversation DM auto-créée entre alumni_a et mentee après acceptation'
);

SELECT * FROM finish();
ROLLBACK;
