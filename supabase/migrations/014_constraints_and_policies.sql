-- ============================================================
-- CMA CONNECT — Migration 014
-- Fix : idempotent CHECK constraints, user_education year bounds,
--        promo_votes documented SELECT deny policy
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FIX 1 : Make migration 011 CHECK constraints idempotent
-- If re-run, these won't error because we drop-if-exists first.
-- (The constraints already exist from migration 011 — this is
-- a corrective pattern for branch/replay safety.)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE promotions DROP CONSTRAINT IF EXISTS chk_promotions_start_date;
ALTER TABLE promotions ADD CONSTRAINT chk_promotions_start_date CHECK (start_date BETWEEN 1980 AND 2100);

ALTER TABLE promotions DROP CONSTRAINT IF EXISTS chk_promotions_end_date;
ALTER TABLE promotions ADD CONSTRAINT chk_promotions_end_date CHECK (end_date BETWEEN 1980 AND 2100);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_promo_start;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_promo_start CHECK (promo_start_date BETWEEN 1980 AND 2100);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_enrollment;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_enrollment CHECK (enrollment_date BETWEEN 1980 AND 2100);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_expected_end;
ALTER TABLE profiles ADD CONSTRAINT chk_profiles_expected_end CHECK (expected_end_date BETWEEN 1980 AND 2100);

-- ─────────────────────────────────────────────────────────────
-- FIX 2 : user_education.start_year / end_year CHECK constraints
-- Prevents garbage data (negative years, unrealistic values)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE user_education DROP CONSTRAINT IF EXISTS chk_edu_start_year;
ALTER TABLE user_education ADD CONSTRAINT chk_edu_start_year CHECK (start_year BETWEEN 1950 AND 2100);

ALTER TABLE user_education DROP CONSTRAINT IF EXISTS chk_edu_end_year;
ALTER TABLE user_education ADD CONSTRAINT chk_edu_end_year CHECK (end_year BETWEEN 1950 AND 2100);

-- ─────────────────────────────────────────────────────────────
-- FIX 3 : promo_votes — explicit SELECT deny policy (documented)
--
-- Votes are ANONYMOUS by design. No user (including admins) may
-- see who voted for whom. Only the aggregated vote_count on
-- promo_candidates is visible (updated by trigger).
--
-- RLS is already enabled and blocks SELECT by default.
-- This explicit policy documents the intentional design decision.
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'promo_votes'
    AND policyname = 'promo_votes_select_deny'
  ) THEN
    -- Explicit restrictive policy: nobody can SELECT promo_votes.
    -- The default RLS deny already blocks SELECT, but this makes
    -- the intent explicit and prevents accidental permissive policies
    -- from overriding the block in the future.
    CREATE POLICY promo_votes_select_deny ON promo_votes
      AS RESTRICTIVE
      FOR SELECT TO authenticated
      USING (false);
  END IF;
END $$;
