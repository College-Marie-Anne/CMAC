-- ============================================================
-- CMA CONNECT — Migration 023
-- Notifications "election" (4 événements) + helpers réutilisables
-- Spec §980-986, §1244, §488 (préférences opt-in)
-- ============================================================
--
-- Contexte : la table `notifications` n'a aucune RLS INSERT (spec §638).
-- Tous les inserts doivent passer par des fonctions SECURITY DEFINER.
--
-- Cette migration fournit :
--   1. notify_user()          — INSERT 1 notification, respecte préférence
--   2. notify_promo_members() — broadcast à toutes les membres d'une promo
--   3. 4 triggers sur promo_elections (INSERT, UPDATE status)
--

-- ============================================================
-- 1. HELPER : notify_user
-- ============================================================
-- p_preference_field : nom de la colonne booléenne dans
-- notification_preferences (ex: 'election', 'mentorship'). NULL = non-opt-out
-- (toujours envoyée — spec §488 pour admin, account_*, post_pinned, etc.).

CREATE OR REPLACE FUNCTION notify_user(
  p_recipient UUID,
  p_type notification_type,
  p_reference_id UUID,
  p_content TEXT,
  p_preference_field TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  pref_enabled BOOLEAN;
  query_text TEXT;
  new_id UUID;
BEGIN
  -- Garde-fou : recipient inexistant ou compte non actif → no-op
  IF p_recipient IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_recipient AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  -- Si une préférence est spécifiée, on respecte le choix utilisateur.
  -- Si aucune ligne notification_preferences (cas edge), on considère ON.
  IF p_preference_field IS NOT NULL THEN
    query_text := format(
      'SELECT %I FROM notification_preferences WHERE profile_id = $1',
      p_preference_field
    );
    EXECUTE query_text INTO pref_enabled USING p_recipient;

    IF pref_enabled IS NOT NULL AND pref_enabled = false THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO notifications (recipient_id, type, reference_id, content)
  VALUES (p_recipient, p_type, p_reference_id, p_content)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. HELPER : notify_promo_members
-- ============================================================
-- Broadcast à toutes les utilisatrices actives d'une promotion.
-- Retourne le nombre de notifications réellement insérées (après filtre prefs).

CREATE OR REPLACE FUNCTION notify_promo_members(
  p_promo_id UUID,
  p_type notification_type,
  p_reference_id UUID,
  p_content TEXT,
  p_preference_field TEXT DEFAULT NULL,
  p_exclude_user UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  member_id UUID;
  inserted_count INTEGER := 0;
  result_id UUID;
BEGIN
  IF p_promo_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR member_id IN
    SELECT id FROM profiles
    WHERE promo_id = p_promo_id
      AND status = 'active'
      AND (p_exclude_user IS NULL OR id <> p_exclude_user)
  LOOP
    result_id := notify_user(
      member_id,
      p_type,
      p_reference_id,
      p_content,
      p_preference_field
    );
    IF result_id IS NOT NULL THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. TRIGGER : élection lancée (AFTER INSERT)
-- ============================================================
-- Une nouvelle ligne dans promo_elections = élection démarrée en phase
-- nomination. On notifie tous les membres de la promo.

CREATE OR REPLACE FUNCTION trg_notify_election_started()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_promo_members(
    NEW.promo_id,
    'election',
    NEW.id,
    'Une nouvelle election de chef de promo a ete lancee. Posez votre candidature !',
    'election',
    NULL  -- on notifie aussi l'initiatrice
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_election_started ON promo_elections;
CREATE TRIGGER trg_election_started
  AFTER INSERT ON promo_elections
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_election_started();

-- ============================================================
-- 4. TRIGGER : transitions de status (AFTER UPDATE)
-- ============================================================
-- 3 cas en un seul trigger pour éviter les callbacks multiples :
--   nomination → voting   = phase de vote ouverte
--   voting → completed    = résultats
--   * → cancelled         = annulée

CREATE OR REPLACE FUNCTION trg_notify_election_status_change()
RETURNS TRIGGER AS $$
DECLARE
  winner_full_name TEXT;
BEGIN
  -- nomination → voting
  IF OLD.status = 'nomination' AND NEW.status = 'voting' THEN
    PERFORM notify_promo_members(
      NEW.promo_id,
      'election',
      NEW.id,
      'La phase de vote de l''election de chef de promo est ouverte.',
      'election',
      NULL
    );
    RETURN NEW;
  END IF;

  -- voting → completed
  IF OLD.status = 'voting' AND NEW.status = 'completed' THEN
    -- Récupérer le nom de la gagnante pour le contenu du message
    IF NEW.winner_id IS NOT NULL THEN
      SELECT first_name || ' ' || last_name
        INTO winner_full_name
        FROM profiles
        WHERE id = NEW.winner_id;
    END IF;

    PERFORM notify_promo_members(
      NEW.promo_id,
      'election',
      NEW.id,
      CASE
        WHEN winner_full_name IS NOT NULL
          THEN 'Election terminee : ' || winner_full_name || ' a ete elue chef de promo.'
        ELSE 'L''election de chef de promo est terminee. Resultats disponibles.'
      END,
      'election',
      NULL
    );
    RETURN NEW;
  END IF;

  -- * → cancelled
  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    PERFORM notify_promo_members(
      NEW.promo_id,
      'election',
      NEW.id,
      'L''election de chef de promo a ete annulee (candidates insuffisantes).',
      'election',
      NULL
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_election_status_change ON promo_elections;
CREATE TRIGGER trg_election_status_change
  AFTER UPDATE OF status ON promo_elections
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trg_notify_election_status_change();

-- ============================================================
-- 5. GRANT execute aux clients authentifiés (pour notify_user via RPC)
-- ============================================================
-- Permet d'appeler `notify_user` depuis le code applicatif via supabase.rpc().
-- La fonction est SECURITY DEFINER : elle s'exécute avec les droits du
-- propriétaire (postgres) et bypass la RLS sur notifications, mais sa logique
-- vérifie déjà : recipient actif, préférence respectée. Pas d'élévation
-- non contrôlée.

GRANT EXECUTE ON FUNCTION notify_user(UUID, notification_type, UUID, TEXT, TEXT)
  TO authenticated;

-- notify_promo_members reste interne aux triggers (pas exposé).
