-- Active Supabase Realtime sur les tables qui en ont besoin.
--
-- Contexte : la publication `supabase_realtime` existe par défaut sur tous
-- les projets Supabase MAIS est vide à la création (puballtables=false, 0
-- table attachée). Tant qu'aucune table n'est ajoutée via
-- `ALTER PUBLICATION supabase_realtime ADD TABLE …`, les subscriptions
-- `postgres_changes` côté client ne reçoivent JAMAIS d'événements, même si
-- le code client est correct.
--
-- Tables ajoutées ici (celles que le code client écoute actuellement) :
--   - forum_posts     : PostFeed (nouveau post en live sur /feed, /promo, /opportunities)
--   - forum_comments  : comment_count live (futur)
--   - forum_reactions : reaction_count live (futur)
--   - notifications   : badge cloche en-tête + MobileProfileMenu
--   - direct_messages : thread DM + list DM (nouveaux messages en live)
--   - conversations   : détection de nouvelles conv (futur)
--
-- REPLICA IDENTITY FULL est activé sur `notifications` car le hook
-- `use-unread-notifications.ts` lit `payload.old.is_read` pour décrémenter
-- le compteur lors d'un UPDATE ou DELETE. Par défaut, seule la PK est
-- envoyée dans `payload.old` → FULL est requis pour avoir toutes les colonnes.
--
-- Pour les autres tables, le DEFAULT (PK seule dans old) suffit car le code
-- client lit `payload.new` pour les INSERT et les UPDATE.
--
-- Idempotent : on use `DROP ... IF EXISTS` + `ADD TABLE` (sinon ADD throw si
-- la table est déjà dans la publication).

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'forum_posts',
    'forum_comments',
    'forum_reactions',
    'notifications',
    'direct_messages',
    'conversations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- DROP si déjà présent (évite l'erreur "table already member of publication")
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN OTHERS THEN
      -- Not a member : c'est OK, on continue
      NULL;
    END;
    -- Re-ADD proprement
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
  END LOOP;
END $$;

-- REPLICA IDENTITY FULL sur notifications (besoin du old.is_read côté client)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
