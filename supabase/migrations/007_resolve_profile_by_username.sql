-- Fonction pour résoudre un profile_id par username
-- SECURITY DEFINER car appelée avant l'auth (login flow)
CREATE OR REPLACE FUNCTION resolve_profile_id_by_username(p_username TEXT)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM profiles WHERE username = p_username LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour résoudre des profils par nom complet (login flow)
CREATE OR REPLACE FUNCTION resolve_profiles_by_fullname(
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE DEFAULT NULL
)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT, date_of_birth DATE) AS $$
BEGIN
  IF p_dob IS NOT NULL THEN
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.date_of_birth
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name)
        AND p.date_of_birth = p_dob;
  ELSE
    RETURN QUERY
      SELECT p.id, p.first_name, p.last_name, p.date_of_birth
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_profile_id_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION resolve_profile_id_by_username(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_profiles_by_fullname(TEXT, TEXT, DATE) TO anon;
GRANT EXECUTE ON FUNCTION resolve_profiles_by_fullname(TEXT, TEXT, DATE) TO authenticated;
