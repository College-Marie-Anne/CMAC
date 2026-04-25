-- ============================================================
-- CMA CONNECT — Migration 036
-- profiles.date_of_birth : DROP NOT NULL
--
-- CONTEXTE :
--   La colonne `date_of_birth` était NOT NULL depuis la migration 002,
--   conçue pour les comptes alumni / S1-S4 (donnée scolaire structurante).
--   Les admins, créés par le super-admin via `createAdminAction`, n'ont
--   pas de date de naissance à fournir — l'INSERT échoue avec
--   "null value in column date_of_birth violates not-null constraint".
--
-- IMPACT :
--   - Les profils existants conservent leur DOB (rien à backfiller).
--   - La fonction `resolve_profile_by_username_dob` (007/009/013) fait
--     `WHERE p.date_of_birth = p_dob` — un profil avec DOB NULL ne sera
--     jamais matché par ce flow (cohérent : les admins ne récupèrent pas
--     leur username via le wizard "j'ai oublié").
--   - Les flows d'inscription (registerAction) continuent de passer
--     date_of_birth (validation Zod côté client) — aucune régression.
-- ============================================================

ALTER TABLE profiles
  ALTER COLUMN date_of_birth DROP NOT NULL;
