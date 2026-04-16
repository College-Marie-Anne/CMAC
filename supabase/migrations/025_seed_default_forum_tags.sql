-- Seed des tags par défaut pour le forum.
--
-- Contexte : avant cette migration, la table forum_tags ne contenait que
-- le tag système "Bourses & Opportunités". Le feed filtre les tags système
-- (ils vont uniquement dans /opportunities), donc le select de création
-- de post était vide → les utilisatrices ne pouvaient choisir aucun tag.
--
-- Les tags seedés ici sont is_system=false : modifiables/supprimables par
-- l'admin depuis /admin/tags. Palette choisie pour cohérence avec l'UI
-- (bordeaux, vert forêt, or — et teintes supplémentaires).
--
-- ON CONFLICT (name) DO NOTHING → migration idempotente.

INSERT INTO forum_tags (name, color, is_system) VALUES
  ('Général',        '#800020', false),  -- bordeaux CMA
  ('Entraide',       '#006B3F', false),  -- vert forêt CMA
  ('Orientation',    '#2563EB', false),  -- bleu
  ('Offre de Stage', '#7C3AED', false),  -- violet
  ('Actualités',     '#EA580C', false),  -- orange
  ('Questions',      '#0891B2', false)   -- cyan
ON CONFLICT (name) DO NOTHING;
