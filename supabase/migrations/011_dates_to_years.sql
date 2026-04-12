-- ============================================================
-- CMA CONNECT — Migration 011
-- Convertir les champs DATE en INTEGER (année uniquement)
-- Les mois ne sont plus pertinents pour les promos et enrollment
-- ============================================================

-- promotions.start_date : DATE → INTEGER
ALTER TABLE promotions
  ALTER COLUMN start_date TYPE INTEGER USING EXTRACT(YEAR FROM start_date)::INTEGER;

-- promotions.end_date : DATE → INTEGER
ALTER TABLE promotions
  ALTER COLUMN end_date TYPE INTEGER USING EXTRACT(YEAR FROM end_date)::INTEGER;

-- profiles.promo_start_date : DATE → INTEGER
ALTER TABLE profiles
  ALTER COLUMN promo_start_date TYPE INTEGER USING EXTRACT(YEAR FROM promo_start_date)::INTEGER;

-- profiles.enrollment_date : DATE → INTEGER
ALTER TABLE profiles
  ALTER COLUMN enrollment_date TYPE INTEGER USING EXTRACT(YEAR FROM enrollment_date)::INTEGER;

-- profiles.expected_end_date : DATE → INTEGER
ALTER TABLE profiles
  ALTER COLUMN expected_end_date TYPE INTEGER USING EXTRACT(YEAR FROM expected_end_date)::INTEGER;

-- CHECK constraints (idempotent: drop-if-exists + add)
ALTER TABLE promotions DROP CONSTRAINT IF EXISTS chk_promotions_start_date;
ALTER TABLE promotions
  ADD CONSTRAINT chk_promotions_start_date CHECK (start_date BETWEEN 1980 AND 2100);
ALTER TABLE promotions DROP CONSTRAINT IF EXISTS chk_promotions_end_date;
ALTER TABLE promotions
  ADD CONSTRAINT chk_promotions_end_date CHECK (end_date BETWEEN 1980 AND 2100);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_promo_start;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_promo_start CHECK (promo_start_date BETWEEN 1980 AND 2100);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_enrollment;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_enrollment CHECK (enrollment_date BETWEEN 1980 AND 2100);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profiles_expected_end;
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_expected_end CHECK (expected_end_date BETWEEN 1980 AND 2100);
