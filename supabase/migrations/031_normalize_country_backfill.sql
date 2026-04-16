-- ============================================================
-- CMA CONNECT — Migration 031
-- Backfill : normaliser pays/nationalités pour éliminer les doublons
-- causés par les variantes de saisie ("Haiti" vs "Haïti",
-- "Haitienne"/"HAÏTIENNE" vs "Haïtienne", etc.).
-- ============================================================
--
-- Contexte : la normalisation côté app (src/lib/normalize-country.ts)
-- traite désormais tout nouveau INSERT/UPDATE côté register + admin.
-- Cette migration aligne les rows déjà écrites.
--
-- Idempotent : les UPDATE ciblent uniquement les valeurs non-canoniques.
-- Les nouvelles valeurs sont celles produites par notre dictionnaire
-- (voir CANONICAL_COUNTRY / CANONICAL_NATIONALITY côté TS).

-- unaccent : retire les diacritiques pour matcher "Haiti" contre "haïti".
-- Pré-installée sur Supabase Postgres mais désactivée par défaut.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─── Pays ───
UPDATE profiles SET country = 'Haïti'
  WHERE lower(unaccent(country)) = 'haiti'
    AND country IS DISTINCT FROM 'Haïti';

UPDATE profiles SET country = 'Québec'
  WHERE lower(unaccent(country)) = 'quebec'
    AND country IS DISTINCT FROM 'Québec';

UPDATE profiles SET country = 'États-Unis'
  WHERE lower(unaccent(country)) IN ('etats-unis', 'etats unis', 'united states', 'usa')
    AND country IS DISTINCT FROM 'États-Unis';

UPDATE profiles SET country = 'République dominicaine'
  WHERE lower(unaccent(country)) IN ('republique dominicaine', 'dominican republic')
    AND country IS DISTINCT FROM 'République dominicaine';

UPDATE profiles SET country = 'Côte d''Ivoire'
  WHERE lower(unaccent(country)) IN ('cote d''ivoire', 'cote-d''ivoire', 'ivory coast')
    AND country IS DISTINCT FROM 'Côte d''Ivoire';

UPDATE profiles SET country = 'Bénin'
  WHERE lower(unaccent(country)) = 'benin'
    AND country IS DISTINCT FROM 'Bénin';

UPDATE profiles SET country = 'Sénégal'
  WHERE lower(unaccent(country)) = 'senegal'
    AND country IS DISTINCT FROM 'Sénégal';

UPDATE profiles SET country = 'Brésil'
  WHERE lower(unaccent(country)) IN ('bresil', 'brazil')
    AND country IS DISTINCT FROM 'Brésil';

-- ─── Nationalités (tableau TEXT[]) ───
-- Helper : remplace une valeur dans un array nationality. L'expression
-- array() + SELECT + CASE map chaque entrée.

UPDATE profiles
SET nationality = (
  SELECT array_agg(DISTINCT
    CASE
      WHEN lower(unaccent(n)) IN ('haitienne','haitien','ayisyen') THEN 'Haïtienne'
      WHEN lower(unaccent(n)) IN ('francaise','francais','french') THEN 'Française'
      WHEN lower(unaccent(n)) IN ('canadienne','canadien') THEN 'Canadienne'
      WHEN lower(unaccent(n)) IN ('quebecoise','quebecois') THEN 'Québécoise'
      WHEN lower(unaccent(n)) IN ('americaine','americain','american') THEN 'Américaine'
      WHEN lower(unaccent(n)) IN ('dominicaine','dominicain') THEN 'Dominicaine'
      WHEN lower(unaccent(n)) IN ('ivoirienne','ivoirien') THEN 'Ivoirienne'
      WHEN lower(unaccent(n)) IN ('beninoise','beninois') THEN 'Béninoise'
      WHEN lower(unaccent(n)) IN ('senegalaise','senegalais') THEN 'Sénégalaise'
      WHEN lower(unaccent(n)) IN ('bresilienne','bresilien') THEN 'Brésilienne'
      WHEN lower(unaccent(n)) = 'belge' THEN 'Belge'
      WHEN lower(unaccent(n)) = 'suisse' THEN 'Suisse'
      WHEN lower(unaccent(n)) = 'espagnole' THEN 'Espagnole'
      WHEN lower(unaccent(n)) = 'allemande' THEN 'Allemande'
      WHEN lower(unaccent(n)) = 'italienne' THEN 'Italienne'
      WHEN lower(unaccent(n)) IN ('britannique','british') THEN 'Britannique'
      ELSE n
    END
  )
  FROM unnest(nationality) AS n
)
WHERE nationality IS NOT NULL
  AND array_length(nationality, 1) > 0
  AND EXISTS (
    -- Ne modifie que si au moins une entrée diffère de sa forme canonique
    SELECT 1 FROM unnest(nationality) AS n
    WHERE lower(unaccent(n)) IN (
      'haitienne','haitien','ayisyen',
      'francaise','francais','french',
      'canadienne','canadien',
      'quebecoise','quebecois',
      'americaine','americain','american',
      'dominicaine','dominicain',
      'ivoirienne','ivoirien',
      'beninoise','beninois',
      'senegalaise','senegalais',
      'bresilienne','bresilien',
      'britannique','british'
    )
    AND n NOT IN (
      'Haïtienne','Française','Canadienne','Québécoise','Américaine',
      'Dominicaine','Ivoirienne','Béninoise','Sénégalaise','Brésilienne',
      'Britannique'
    )
  );
