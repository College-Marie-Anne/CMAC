-- ============================================================
-- CMA CONNECT — Migration 012
-- Nettoyage : suppression des politiques RLS orphelines
-- référençant les tables admin_deactivation_* (dropped en 006)
-- ============================================================

-- Ces policies ont été créées en migration 004 mais les tables
-- sous-jacentes ont été supprimées en migration 006.
-- Les DROP POLICY IF EXISTS sont idempotents et sûrs.

DROP POLICY IF EXISTS admin_deactivation_votes_select ON admin_deactivation_votes;
DROP POLICY IF EXISTS admin_deactivation_votes_insert ON admin_deactivation_votes;
DROP POLICY IF EXISTS admin_deactivation_approvals_select ON admin_deactivation_approvals;
DROP POLICY IF EXISTS admin_deactivation_approvals_insert ON admin_deactivation_approvals;
