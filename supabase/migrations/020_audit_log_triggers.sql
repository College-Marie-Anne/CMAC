-- ============================================================
-- CMA CONNECT — Migration 020
-- Audit log via triggers DB (spec §775)
--
-- PROBLÈME CORRIGÉ :
--   Avant cette migration, les Server Actions faisaient
--   `supabase.from("admin_audit_log").insert(...)` directement.
--   Or la RLS (004:609-611) ne définit AUCUNE policy INSERT,
--   donc tous ces INSERTs étaient SILENCIEUSEMENT BLOQUÉS par RLS.
--   L'audit log était probablement vide en production.
--
-- SOLUTION :
--   - Triggers AFTER sur chaque table admin-sensible
--   - Fonctions SECURITY DEFINER → bypass RLS pour insérer l'audit
--   - auth.uid() préservé dans le contexte SECURITY DEFINER
--   - Détection intelligente de l'action via les diffs OLD/NEW
--   - Self-edits (admin éditant son propre profil) : skip (pas admin action)
--
-- COUVERTURE :
--   profiles       : UPDATE (status transitions, role, promo_id, autre)
--                    INSERT (create_admin quand role=admin par super-admin)
--   forum_posts    : UPDATE (is_pinned, is_deleted par admin)
--   forum_comments : UPDATE (is_deleted par admin)
--   forum_tags     : INSERT/UPDATE/DELETE (CRUD)
--   activities     : INSERT/UPDATE/DELETE (CRUD)
--   invitation_links : UPDATE (is_revoked)
--   support_tickets  : UPDATE (assigned_to, admin_response, status)
--   promo_elections  : UPDATE (status = cancelled par admin)
--
-- BULK ACTIONS :
--   Les bulk actions (bulk_approve, bulk_suspend) déclenchent
--   N triggers individuels — plus granulaire que la spec §456.
--   On conserve l'action 'bulk_*' pour compat, mais les triggers
--   fournissent N entrées individuelles (approve_user × N).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Helper : détecte si l'acteur courant est un admin actif
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_acting_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v UUID := auth.uid();
BEGIN
  IF v IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v AND role = 'admin' AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ─────────────────────────────────────────────────────────────
-- Trigger 1 : profiles AFTER UPDATE
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_profiles_update()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_action TEXT;
  v_details JSONB := '{}'::jsonb;
BEGIN
  -- Skip : contexte migration (no auth session)
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  -- Skip : acteur pas admin (self-edit user)
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;
  -- Skip : admin édite son propre profil (self-edit, pas admin action)
  IF v_admin = NEW.id THEN RETURN NEW; END IF;

  -- Détection de l'action
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_action := CASE
      WHEN OLD.status = 'pending' AND NEW.status = 'active' THEN 'approve_user'
      WHEN OLD.status = 'pending' AND NEW.status = 'deactivated' THEN 'reject_user'
      WHEN NEW.status = 'suspended' THEN 'suspend_user'
      WHEN OLD.status IN ('suspended', 'deactivated') AND NEW.status = 'active' THEN 'reactivate_user'
      WHEN NEW.status = 'deactivated' THEN 'deactivate_user'
      ELSE 'update_profile'
    END;
    v_details := jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status
    );
  ELSIF OLD.role IS DISTINCT FROM NEW.role THEN
    v_action := 'update_profile';
    v_details := jsonb_build_object(
      'role_transition', jsonb_build_object('old', OLD.role, 'new', NEW.role)
    );
  ELSIF OLD.promo_id IS DISTINCT FROM NEW.promo_id THEN
    v_action := 'assign_promo_to_user';
    v_details := jsonb_build_object(
      'old_promo_id', OLD.promo_id,
      'new_promo_id', NEW.promo_id
    );
  ELSE
    -- Autres changements (filiere, class, nationality, bio admin, etc.)
    v_action := 'update_profile';
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, v_action, 'profile', NEW.id::text, v_details);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_profiles_update ON profiles;
CREATE TRIGGER trg_audit_profiles_update
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profiles_update();


-- ─────────────────────────────────────────────────────────────
-- Trigger 2 : profiles AFTER INSERT (create_admin)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_profiles_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;
  -- Skip l'insert fait par l'utilisatrice elle-même (onboarding)
  IF v_admin = NEW.id THEN RETURN NEW; END IF;
  -- Log uniquement quand un nouvel admin est créé
  IF NEW.role <> 'admin' THEN RETURN NEW; END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (
    v_admin, 'create_admin', 'profile', NEW.id::text,
    jsonb_build_object('username', NEW.username)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_profiles_insert ON profiles;
CREATE TRIGGER trg_audit_profiles_insert
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profiles_insert();


-- ─────────────────────────────────────────────────────────────
-- Trigger 3 : forum_posts AFTER UPDATE (is_pinned, is_deleted par admin)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_forum_posts_update()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_action TEXT;
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;

  -- is_pinned toggle
  IF OLD.is_pinned IS DISTINCT FROM NEW.is_pinned THEN
    v_action := CASE WHEN NEW.is_pinned THEN 'pin_post' ELSE 'unpin_post' END;
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
    VALUES (v_admin, v_action, 'forum_post', NEW.id::text);
  END IF;

  -- is_deleted passage à true par admin (modération)
  IF OLD.is_deleted = false AND NEW.is_deleted = true AND v_admin <> COALESCE(NEW.author_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
    VALUES (v_admin, 'delete_post', 'forum_post', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_forum_posts_update ON forum_posts;
CREATE TRIGGER trg_audit_forum_posts_update
  AFTER UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION audit_forum_posts_update();


-- ─────────────────────────────────────────────────────────────
-- Trigger 4 : forum_comments AFTER UPDATE (is_deleted par admin)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_forum_comments_update()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;

  IF OLD.is_deleted = false AND NEW.is_deleted = true
     AND v_admin <> COALESCE(NEW.author_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
    VALUES (v_admin, 'delete_comment', 'forum_comment', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_forum_comments_update ON forum_comments;
CREATE TRIGGER trg_audit_forum_comments_update
  AFTER UPDATE ON forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION audit_forum_comments_update();


-- ─────────────────────────────────────────────────────────────
-- Trigger 5 : forum_tags CRUD
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_forum_tags()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_action TEXT;
  v_target_id TEXT;
  v_details JSONB;
BEGIN
  IF v_admin IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT is_acting_admin() THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create_tag';
    v_target_id := NEW.id::text;
    v_details := jsonb_build_object('name', NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_tag';
    v_target_id := NEW.id::text;
    v_details := jsonb_build_object('name', NEW.name, 'old_name', OLD.name);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_tag';
    v_target_id := OLD.id::text;
    v_details := jsonb_build_object('name', OLD.name);
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, v_action, 'forum_tag', v_target_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_forum_tags ON forum_tags;
CREATE TRIGGER trg_audit_forum_tags
  AFTER INSERT OR UPDATE OR DELETE ON forum_tags
  FOR EACH ROW
  EXECUTE FUNCTION audit_forum_tags();


-- ─────────────────────────────────────────────────────────────
-- Trigger 6 : activities CRUD
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_action TEXT;
  v_target_id TEXT;
  v_details JSONB;
BEGIN
  IF v_admin IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT is_acting_admin() THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create_activity';
    v_target_id := NEW.id::text;
    v_details := jsonb_build_object('name', NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update_activity';
    v_target_id := NEW.id::text;
    v_details := jsonb_build_object('name', NEW.name, 'old_name', OLD.name);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete_activity';
    v_target_id := OLD.id::text;
    v_details := jsonb_build_object('name', OLD.name);
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, v_action, 'activity', v_target_id, v_details);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_activities ON activities;
CREATE TRIGGER trg_audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION audit_activities();


-- ─────────────────────────────────────────────────────────────
-- Trigger 7 : invitation_links AFTER UPDATE (is_revoked)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_invitation_links()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;

  -- Log uniquement la révocation (autre UPDATE = system/user flow)
  IF OLD.is_revoked = false AND NEW.is_revoked = true THEN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
    VALUES (v_admin, 'revoke_invitation', 'invitation_link', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_invitation_links ON invitation_links;
CREATE TRIGGER trg_audit_invitation_links
  AFTER UPDATE ON invitation_links
  FOR EACH ROW
  EXECUTE FUNCTION audit_invitation_links();


-- ─────────────────────────────────────────────────────────────
-- Trigger 8 : support_tickets AFTER UPDATE
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_support_tickets()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
  v_action TEXT;
  v_details JSONB;
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    v_action := 'assign_ticket';
    v_details := jsonb_build_object('assigned_to', NEW.assigned_to);
  ELSIF OLD.admin_response IS DISTINCT FROM NEW.admin_response AND NEW.admin_response IS NOT NULL THEN
    v_action := 'respond_ticket';
    v_details := jsonb_build_object('status', NEW.status);
  ELSIF NEW.status = 'closed' AND OLD.status <> 'closed' THEN
    v_action := 'close_ticket';
    v_details := jsonb_build_object('old_status', OLD.status);
  ELSE
    RETURN NEW;  -- autre changement non audité
  END IF;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (v_admin, v_action, 'support_ticket', NEW.id::text, v_details);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_support_tickets ON support_tickets;
CREATE TRIGGER trg_audit_support_tickets
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION audit_support_tickets();


-- ─────────────────────────────────────────────────────────────
-- Trigger 9 : promo_elections AFTER UPDATE (annulation par admin)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_promo_elections()
RETURNS TRIGGER AS $$
DECLARE
  v_admin UUID := auth.uid();
BEGIN
  IF v_admin IS NULL THEN RETURN NEW; END IF;
  IF NOT is_acting_admin() THEN RETURN NEW; END IF;

  IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
    INSERT INTO admin_audit_log (admin_id, action, target_type, target_id)
    VALUES (v_admin, 'cancel_election', 'promo_election', NEW.id::text);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_promo_elections ON promo_elections;
CREATE TRIGGER trg_audit_promo_elections
  AFTER UPDATE ON promo_elections
  FOR EACH ROW
  EXECUTE FUNCTION audit_promo_elections();


-- ─────────────────────────────────────────────────────────────
-- INSERT policy for admin_audit_log
--
-- Les triggers tournent en SECURITY DEFINER donc bypass RLS.
-- Mais la RPC log_admin_action (003:444-459) est appelable depuis
-- les Server Actions (ex: admin_login non capté par trigger) et
-- elle aussi est SECURITY DEFINER, donc elle bypass.
--
-- Aucune policy INSERT n'est nécessaire — et c'est intentionnel :
-- seuls les chemins SECURITY DEFINER peuvent insérer, ce qui
-- garantit l'intégrité (pas d'INSERT direct depuis un client).
-- ─────────────────────────────────────────────────────────────

-- No changes needed to RLS — status quo reinforced.
