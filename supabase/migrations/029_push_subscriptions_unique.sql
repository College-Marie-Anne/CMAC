-- ============================================================
-- CMA CONNECT — Migration 029
-- Push Subscriptions : UNIQUE (profile_id, endpoint) + index
-- ============================================================
--
-- Contexte : la table push_subscriptions (créée en migration 002) n'a
-- aucune contrainte d'unicité, ce qui empêchait un upsert idempotent côté
-- Server Action. Si un navigateur ré-souscrit (p. ex. après revalidation
-- des clés VAPID ou reset du cache SW), on se retrouvait avec des doublons
-- (profile_id, endpoint) → N pushes envoyés au même device.
--
-- Choix d'unicité sur (profile_id, endpoint) plutôt que endpoint seul :
--   - un endpoint physique = 1 device, mais 2 users peuvent partager un
--     device (compte famille, démo en classe, etc.) → on tolère ce cas
--   - les doublons intra-user sont bloqués (cas principal qu'on veut éviter)
--   - permet ON CONFLICT (profile_id, endpoint) DO UPDATE dans l'action
--
-- Idempotent : IF NOT EXISTS sur les deux index.

CREATE UNIQUE INDEX IF NOT EXISTS uq_push_subscriptions_profile_endpoint
  ON public.push_subscriptions(profile_id, endpoint);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id
  ON public.push_subscriptions(profile_id);
