-- Fix CVE-class : Postgres functions with mutable search_path
--
-- Sans `SET search_path` explicite, une fonction (surtout SECURITY DEFINER)
-- peut être détournée par un attaquant qui crée des objets homonymes dans
-- son propre schéma — la recherche par nom-non-qualifié peut résoudre vers
-- ces objets malicieux au lieu des vraies tables/fonctions.
--
-- Ref Supabase : https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
-- Ce DO block découvre dynamiquement TOUTES les fonctions du schéma `public`
-- qui n'ont pas de search_path fixé et leur applique le fix. Idempotent : si
-- une fonction a déjà un search_path, elle est skippée. Si une nouvelle
-- fonction est ajoutée plus tard sans search_path, ré-exécuter cette
-- migration la corrigera (mais idéalement, chaque CREATE FUNCTION future
-- devrait avoir SET search_path = public, pg_catalog directement).
--
-- search_path = public, pg_catalog :
--   - public : nos tables/types métier
--   - pg_catalog : built-ins Postgres (auth.uid(), etc.)
-- NB : auth.* et storage.* doivent être qualifiés explicitement dans le
-- corps des fonctions (resolve_email_by_profile_id qualifie déjà auth.users).

DO $$
DECLARE
  f RECORD;
  fixed_count INT := 0;
BEGIN
  FOR f IN
    SELECT
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- functions only (pas procédures, pas aggregates)
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS c
          WHERE c LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      f.nspname, f.proname, f.args
    );
    fixed_count := fixed_count + 1;
  END LOOP;

  RAISE NOTICE 'Fixed search_path on % function(s)', fixed_count;
END $$;
