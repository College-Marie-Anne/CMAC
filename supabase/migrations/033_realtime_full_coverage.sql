-- ============================================================
-- CMA CONNECT — Migration 033
-- Étend la publication Realtime à toutes les tables "live".
-- ============================================================
--
-- Migration 028 avait ajouté : forum_posts, forum_comments,
-- forum_reactions, notifications, direct_messages, conversations.
--
-- On complète ici :
--   - mentorship_requests    : dashboard mentor/mentee se met à jour en live
--                              quand une demande est faite/acceptée/déclinée
--   - mentorship_sessions    : statut (active → completed) live
--   - promo_elections        : transitions de phase (nomination → voting → completed)
--   - promo_candidates       : nouvelle candidature / retrait visible live
--
-- REPLICA IDENTITY FULL :
--   - forum_reactions : sur DELETE, on a besoin de post_id/comment_id/user_id
--     dans payload.old pour décrémenter le compteur côté client. Sans FULL,
--     seule la PK (id UUID) est transmise → on ne sait pas quel post.
--   - promo_candidates : sur DELETE (retrait candidature), besoin du
--     election_id + candidate_id.
--   - mentorship_requests : sur UPDATE, status transition → besoin du
--     mentor_id pour router vers le bon destinataire.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'mentorship_requests',
    'mentorship_sessions',
    'promo_elections',
    'promo_candidates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
  END LOOP;
END $$;

ALTER TABLE public.forum_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.promo_candidates REPLICA IDENTITY FULL;
ALTER TABLE public.mentorship_requests REPLICA IDENTITY FULL;
