-- ============================================================
-- CMA CONNECT — Migration 034
-- Débloquer la suppression (soft-delete) par l'auteur non-admin.
-- ============================================================
--
-- Symptôme observé (reporté côté utilisatrice + reproduit en SQL) :
--   Un user alumni non-admin clique "Supprimer" sur son propre commentaire /
--   post → erreur Postgres `new row violates row-level security policy for
--   table "forum_comments"` (resp. forum_posts).
--
-- Cause racine :
--   Depuis PostgreSQL 12, pour UPDATE, la visibilité de la NEW row est aussi
--   check via la policy SELECT (en plus du WITH CHECK). Pratiquement :
--     - Policy `forum_comments_select` : USING `... AND is_deleted = false`
--     - UPDATE set is_deleted=true → la NEW row a is_deleted=true
--     - Elle ne satisfait plus la SELECT → Postgres raise l'erreur ci-dessus
--   (Cf. https://www.postgresql.org/docs/current/ddl-rowsecurity.html —
--   "the new row must satisfy the combined expressions for SELECT and INSERT
--   or UPDATE policies".)
--
--   L'admin n'est pas touché car la policy `*_select_admin` (is_admin())
--   match sur n'importe quelle row, y compris les soft-deleted. L'auteur
--   non-admin n'avait pas cette porte de sortie.
--
-- Solution :
--   Ajout d'une policy SELECT "own" permissive pour chaque table, qui laisse
--   l'auteur voir ses propres rows même is_deleted=true. L'impact UX est nul
--   car le code applicatif filtre toujours `is_deleted=false` dans ses
--   queries SELECT métier (feed, comments, etc.). La policy existe uniquement
--   pour satisfaire le check PostgreSQL sur la NEW row post-UPDATE.
--
-- Idempotent : DROP IF EXISTS avant CREATE.

DROP POLICY IF EXISTS forum_comments_select_own ON public.forum_comments;
CREATE POLICY forum_comments_select_own ON public.forum_comments
  FOR SELECT
  TO authenticated
  USING (
    is_active()
    AND author_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS forum_posts_select_own ON public.forum_posts;
CREATE POLICY forum_posts_select_own ON public.forum_posts
  FOR SELECT
  TO authenticated
  USING (
    is_active()
    AND author_id = (SELECT auth.uid())
  );
