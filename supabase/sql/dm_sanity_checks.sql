-- ============================================================
-- CMA CONNECT — DM sanity checks
-- Objectif: valider rapidement le comportement DMs/notifications
-- ============================================================
--
-- Usage:
-- 1) Remplacer les variables dans le bloc ci-dessous
-- 2) Exécuter le script dans une session SQL (staging/dev)
-- 3) Lire les résultats de chaque section
--
-- Note:
-- - Les sections d'UPDATE/DELETE sont encapsulées dans une transaction
--   et terminées par ROLLBACK pour ne rien persister.

-- =========================
-- Variables à renseigner
-- =========================
-- Remplace les valeurs UUID ci-dessous avant exécution.
-- - sender_id: utilisatrice A
-- - receiver_id: utilisatrice B
-- - conversation_id: conversation existante entre A et B
-- - sample_message_id: un message de cette conversation

WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid AS sender_id,
    '00000000-0000-0000-0000-000000000002'::uuid AS receiver_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS conversation_id,
    '00000000-0000-0000-0000-000000000004'::uuid AS sample_message_id
)
SELECT * FROM vars;

-- =========================
-- 1) Intégrité conversation
-- =========================
WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000003'::uuid AS conversation_id
)
SELECT
  c.id,
  c.participant_1,
  c.participant_2,
  c.last_message_at,
  c.archived_by_1,
  c.archived_by_2
FROM conversations c
JOIN vars v ON c.id = v.conversation_id;

-- =========================
-- 2) Notification DM créée ?
-- =========================
-- Vérifie les notifications DM les plus récentes pour une conversation.
WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000002'::uuid AS receiver_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS conversation_id
)
SELECT
  n.id,
  n.recipient_id,
  n.type,
  n.reference_id,
  n.content,
  n.is_read,
  n.created_at
FROM notifications n
JOIN vars v ON n.recipient_id = v.receiver_id
WHERE n.type = 'dm'
  AND n.reference_id = v.conversation_id
ORDER BY n.created_at DESC
LIMIT 10;

-- =========================
-- 3) Préférences notifications DM
-- =========================
WITH vars AS (
  SELECT '00000000-0000-0000-0000-000000000002'::uuid AS receiver_id
)
SELECT
  np.profile_id,
  np.dm,
  np.push_enabled,
  np.updated_at
FROM notification_preferences np
JOIN vars v ON np.profile_id = v.receiver_id;

-- =========================
-- 4) Non-lus côté receiver (scope conversation)
-- =========================
-- Ce compteur doit exclure les messages "supprimés pour moi".
WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000002'::uuid AS receiver_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS conversation_id
)
SELECT
  COUNT(*)::int AS unread_visible_count
FROM direct_messages dm
JOIN vars v ON dm.conversation_id = v.conversation_id
WHERE dm.sender_id <> v.receiver_id
  AND dm.is_read = false
  AND dm.is_deleted_by_receiver = false;

-- =========================
-- 5) Preview "visible" (dernier message non masqué)
-- =========================
WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000002'::uuid AS viewer_id,
    '00000000-0000-0000-0000-000000000003'::uuid AS conversation_id
)
SELECT
  dm.id,
  dm.sender_id,
  dm.content,
  dm.created_at
FROM direct_messages dm
JOIN vars v ON dm.conversation_id = v.conversation_id
WHERE NOT (
  (dm.sender_id = v.viewer_id AND dm.is_deleted_by_sender = true)
  OR
  (dm.sender_id <> v.viewer_id AND dm.is_deleted_by_receiver = true)
)
ORDER BY dm.created_at DESC
LIMIT 1;

-- =========================
-- 6) Test soft-delete (non destructif)
-- =========================
BEGIN;

WITH vars AS (
  SELECT
    '00000000-0000-0000-0000-000000000001'::uuid AS actor_id,
    '00000000-0000-0000-0000-000000000004'::uuid AS sample_message_id
),
target AS (
  SELECT dm.id, dm.sender_id
  FROM direct_messages dm
  JOIN vars v ON dm.id = v.sample_message_id
)
UPDATE direct_messages dm
SET
  is_deleted_by_sender = CASE WHEN t.sender_id = (SELECT actor_id FROM vars) THEN true ELSE dm.is_deleted_by_sender END,
  is_deleted_by_receiver = CASE WHEN t.sender_id <> (SELECT actor_id FROM vars) THEN true ELSE dm.is_deleted_by_receiver END
FROM target t
WHERE dm.id = t.id;

-- Vérification immédiate
WITH vars AS (
  SELECT '00000000-0000-0000-0000-000000000004'::uuid AS sample_message_id
)
SELECT
  dm.id,
  dm.sender_id,
  dm.is_deleted_by_sender,
  dm.is_deleted_by_receiver,
  dm.created_at
FROM direct_messages dm
JOIN vars v ON dm.id = v.sample_message_id;

ROLLBACK;

-- =========================
-- 7) Détection incohérences rapides
-- =========================
-- 7a) Messages marqués lus mais sans read_at
SELECT
  COUNT(*)::int AS read_without_read_at
FROM direct_messages
WHERE is_read = true
  AND read_at IS NULL;

-- 7b) Conversations avec last_message_at nul mais contenant des messages
SELECT
  c.id AS conversation_id,
  c.last_message_at,
  COUNT(dm.id)::int AS message_count
FROM conversations c
JOIN direct_messages dm ON dm.conversation_id = c.id
GROUP BY c.id, c.last_message_at
HAVING c.last_message_at IS NULL
ORDER BY message_count DESC
LIMIT 20;

-- 7c) Notifications DM dont reference_id ne pointe pas vers une conversation
SELECT
  n.id AS notification_id,
  n.recipient_id,
  n.reference_id,
  n.created_at
FROM notifications n
LEFT JOIN conversations c ON c.id = n.reference_id
WHERE n.type = 'dm'
  AND n.reference_id IS NOT NULL
  AND c.id IS NULL
ORDER BY n.created_at DESC
LIMIT 50;
