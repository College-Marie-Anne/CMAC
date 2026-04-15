-- ============================================================
-- CMA CONNECT — Migration 019
-- Seed super-admin LakouSystems (spec §1333-1339)
--
-- Idempotent :
--   - skip si profiles.username = 'LakouSystems' existe déjà
--   - skip si auth.users.email existe déjà sans profil matché
--     (cas tordu : utiliser seed-admin.ts pour réparer à la main)
--
-- Remplace l'ancienne Server Action manuelle src/actions/seed-admin.ts
-- (désormais dépréciée — à supprimer une fois la migration appliquée).
--
-- Effets :
--   1. Crée un row dans auth.users (mot de passe bcrypt via pgcrypto)
--   2. Crée un row dans auth.identities (provider email, email_verified)
--   3. Crée un row dans public.profiles (is_super_admin = true)
--   4. notification_preferences auto-créé via trigger
--      trg_create_notification_preferences (migration 003)
-- ============================================================

-- pgcrypto requis pour crypt() et gen_salt('bf')
-- Supabase l'active par défaut, on le force idempotent au cas où
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  seed_email       TEXT  := 'lakousystems@gmail.com';
  seed_username    TEXT  := 'LakouSystems';
  seed_password    TEXT  := '@LakouSystems2026|';
  seed_first_name  TEXT  := 'Lakou';
  seed_last_name   TEXT  := 'Systems';
  seed_dob         DATE  := '2000-01-01';
  seed_nationality TEXT[] := ARRAY['Haïtienne'];
  seed_country     TEXT  := 'Haïti';

  seed_user_id UUID;
  existing_profile_id UUID;
  existing_auth_id UUID;
BEGIN
  -- ── Guard 1 : profil déjà seedé ──
  SELECT id INTO existing_profile_id
  FROM profiles WHERE username = seed_username LIMIT 1;
  IF existing_profile_id IS NOT NULL THEN
    RAISE NOTICE 'Super-admin already seeded (profile id %), skipping', existing_profile_id;
    RETURN;
  END IF;

  -- ── Guard 2 : auth user existe sans profil (état incohérent) ──
  SELECT id INTO existing_auth_id
  FROM auth.users WHERE email = seed_email LIMIT 1;
  IF existing_auth_id IS NOT NULL THEN
    RAISE EXCEPTION
      'auth.users % exists (id %) but no matching profile. Manual repair required: delete the auth user or create the profile row.',
      seed_email, existing_auth_id;
  END IF;

  -- ── Seed ──
  seed_user_id := gen_random_uuid();

  -- 1. auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    is_super_admin
  ) VALUES (
    seed_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    seed_email,
    crypt(seed_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    '',
    false -- auth.users.is_super_admin est le flag interne Supabase (distinct de profiles.is_super_admin)
  );

  -- 2. auth.identities (requis pour login par email/password sur Supabase moderne)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    created_at,
    updated_at,
    last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    seed_user_id,
    seed_user_id::text,
    jsonb_build_object(
      'sub', seed_user_id::text,
      'email', seed_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  -- 3. profiles (notification_preferences créé par trigger après INSERT)
  INSERT INTO profiles (
    id,
    username,
    first_name,
    last_name,
    date_of_birth,
    nationality,
    country,
    role,
    status,
    is_super_admin,
    is_profile_complete,
    must_change_password,
    accepted_terms_at,
    terms_version
  ) VALUES (
    seed_user_id,
    seed_username,
    seed_first_name,
    seed_last_name,
    seed_dob,
    seed_nationality,
    seed_country,
    'admin',
    'active',
    true,
    true,
    false,
    NOW(),
    '1.0'
  );

  RAISE NOTICE 'Super-admin seeded: % / % (auth id %)', seed_username, seed_email, seed_user_id;
END $$;
