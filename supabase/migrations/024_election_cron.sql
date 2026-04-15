-- ============================================================
-- CMA CONNECT — Migration 024
-- Cron Supabase pour clôture automatique des élections
-- Spec §968 : "Via fonction serveur sécurisée (cron ou trigger à voting_end)"
-- ============================================================
--
-- Sans ce cron, les élections restent indéfiniment en "voting" si personne
-- n'ouvre /promo/election après voting_end (la sync était lazy via
-- syncElectionStateAction côté Next.js).
--
-- Ce cron applique la même logique que `syncElectionStateAction`
-- (src/actions/promo.ts:11-111) en SQL, sur TOUTES les élections en cours,
-- toutes les 5 minutes.
--
-- Les transitions de status déclenchent automatiquement les triggers
-- de notification définis en migration 023.
--

-- ============================================================
-- 1. Activer pg_cron (extension Supabase hosted)
-- ============================================================
-- Sur Supabase Cloud : pg_cron est pré-installé mais doit être activé.
-- Si la migration échoue ici, activer manuellement depuis le Dashboard :
-- Database → Extensions → pg_cron → Enable.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- 2. Fonction principale : sync_all_pending_elections
-- ============================================================
-- Itère sur toutes les élections actives (nomination ou voting) et applique
-- les transitions selon les deadlines. Retourne le nombre d'élections
-- traitées (utile pour les logs cron).
--
-- Logique répliquée de `syncElectionStateAction` :
--   - nomination expirée + < 2 candidates → cancelled
--   - nomination expirée + ≥ 2 candidates → voting
--   - voting expiré + ≥ 1 candidate     → completed (winner = max votes,
--                                          tie-break par profile.created_at ASC),
--                                          UPDATE promotions.leader_id
--   - voting expiré + 0 candidate        → cancelled

CREATE OR REPLACE FUNCTION sync_all_pending_elections()
RETURNS INTEGER AS $$
DECLARE
  election_row    RECORD;
  v_count         INTEGER;
  v_winner_id     UUID;
  v_processed     INTEGER := 0;
BEGIN
  FOR election_row IN
    SELECT id, promo_id, status, nomination_end, voting_end
      FROM promo_elections
      WHERE status IN ('nomination', 'voting')
  LOOP
    -- Cas 1 : phase nomination terminée
    IF election_row.status = 'nomination'
       AND election_row.nomination_end <= NOW() THEN

      SELECT COUNT(*) INTO v_count
        FROM promo_candidates
        WHERE election_id = election_row.id;

      IF v_count < 2 THEN
        UPDATE promo_elections
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = election_row.id;
      ELSE
        UPDATE promo_elections
          SET status = 'voting', updated_at = NOW()
          WHERE id = election_row.id;
      END IF;
      v_processed := v_processed + 1;

    -- Cas 2 : phase voting terminée
    ELSIF election_row.status = 'voting'
          AND election_row.voting_end <= NOW() THEN

      -- Gagnante = max(vote_count) avec tie-break par profile.created_at ASC
      SELECT pc.candidate_id INTO v_winner_id
        FROM promo_candidates pc
        JOIN profiles p ON p.id = pc.candidate_id
        WHERE pc.election_id = election_row.id
        ORDER BY pc.vote_count DESC, p.created_at ASC
        LIMIT 1;

      IF v_winner_id IS NOT NULL THEN
        UPDATE promo_elections
          SET status = 'completed',
              winner_id = v_winner_id,
              updated_at = NOW()
          WHERE id = election_row.id;

        UPDATE promotions
          SET leader_id = v_winner_id
          WHERE id = election_row.promo_id;
      ELSE
        -- Cas edge : aucune candidate (toutes retirées entre nomination et voting)
        UPDATE promo_elections
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = election_row.id;
      END IF;
      v_processed := v_processed + 1;
    END IF;
  END LOOP;

  RETURN v_processed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Programmation du job cron (toutes les 5 minutes)
-- ============================================================
-- Idempotent : on supprime d'abord un éventuel job existant pour pouvoir
-- re-jouer cette migration sans dupliquer le schedule.

DO $$
BEGIN
  -- cron.unschedule lève une exception si le job n'existe pas → on l'ignore
  PERFORM cron.unschedule('cmac-sync-elections');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;

SELECT cron.schedule(
  'cmac-sync-elections',
  '*/5 * * * *',
  $$SELECT sync_all_pending_elections();$$
);

-- ============================================================
-- 4. Garde-fous & permissions
-- ============================================================
-- La fonction est appelée par le job cron (rôle postgres → bypass RLS OK).
-- On ne l'expose PAS via GRANT TO authenticated : seul le cron doit la lancer.
-- Les triggers de notification (migration 023) se déclencheront
-- automatiquement sur les UPDATE de promo_elections.status.
