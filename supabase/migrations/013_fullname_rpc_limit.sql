-- ============================================================
-- CMA CONNECT — Migration 013
-- Fix : LIMIT 10 sur resolve_profiles_by_fullname (DoS protection)
-- ============================================================

CREATE OR REPLACE FUNCTION resolve_profiles_by_fullname(
  p_first_name TEXT,
  p_last_name TEXT,
  p_dob DATE DEFAULT NULL
)
RETURNS TABLE(id UUID) AS $$
BEGIN
  IF p_dob IS NOT NULL THEN
    RETURN QUERY
      SELECT p.id
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name)
        AND p.date_of_birth = p_dob
      LIMIT 10;
  ELSE
    RETURN QUERY
      SELECT p.id
      FROM profiles p
      WHERE LOWER(p.first_name) = LOWER(p_first_name)
        AND LOWER(p.last_name) = LOWER(p_last_name)
      LIMIT 10;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
