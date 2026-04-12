-- Fonction SECURITY DEFINER pour résoudre l'email d'un utilisateur
-- via auth.users sans avoir besoin de la service role key.
-- Appelée uniquement depuis les Server Actions côté serveur.

CREATE OR REPLACE FUNCTION resolve_email_by_profile_id(p_profile_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_profile_id;

  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restreindre l'accès : seuls les utilisateurs authentifiés peuvent appeler cette fonction
REVOKE ALL ON FUNCTION resolve_email_by_profile_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_email_by_profile_id(UUID) TO authenticated;
