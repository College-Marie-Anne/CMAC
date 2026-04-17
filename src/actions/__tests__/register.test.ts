import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase, type MockSupabaseClient } from '@/test/helpers/mock-supabase'
import type { RegisterFormData } from '@/lib/validations/register'

let mockSupabase: MockSupabaseClient
let mockAdmin: MockSupabaseClient
let mockCheckRateLimit: ReturnType<typeof vi.fn>

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}))
vi.mock('@/lib/rate-limit', () => ({
  registerLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  sanitizeIp: vi.fn((raw: string | null | undefined) => raw ?? 'unknown'),
}))
vi.mock('@/lib/emails/welcome', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/emails/admin-pending-registration', () => ({
  sendAdminPendingRegistrationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/env', () => ({
  env: {
    siteUrl: 'http://localhost:3000',
    supabaseUrl: 'http://fake',
    supabaseAnonKey: 'fake',
    supabaseServiceRoleKey: 'fake',
    emailFrom: 'noreply@test.com',
  },
}))
vi.mock('@/lib/normalize-country', () => ({
  normalizeCountry: vi.fn((x: string) => x),
  normalizeNationalities: vi.fn((x: string[]) => x),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void | Promise<void>) => void fn),
}))

import { registerAction } from '../register'

const validAlumniData: RegisterFormData = {
  step1: {
    first_name: 'Marie',
    last_name: 'Dupont',
    date_of_birth: '1990-05-15',
    nationality: ['Haïtienne'],
    country: 'Haïti',
    status_type: 'ancienne',
  },
  step2_type: 'alumni',
  step2_alumni: {
    promotion_name: 'Promo 2008',
    is_new_promo: false,
    promo_start_date: 2004,
    filiere: 'SVT',
    activities: [],
    institution_type: 'university',
    institution_name: 'Université Quisqueya',
    study_field: 'Médecine',
    degree_level: 'Master',
    start_year: 2008,
    end_year: 2014,
    job_title: 'Médecin',
    job_company: 'Hôpital',
  },
  step3: {
    username: 'marie_d',
    email: 'marie@example.com',
    password: 'Password123',
    confirm_password: 'Password123',
    accept_terms: true,
  },
}

const validStudentData: RegisterFormData = {
  step1: {
    first_name: 'Léa',
    last_name: 'Martin',
    date_of_birth: '2010-03-20',
    nationality: ['Haïtienne'],
    country: 'Haïti',
    status_type: 'eleve_actuelle',
  },
  step2_type: 'student',
  step2_student: {
    class: 'S2',
    enrollment_date: 2024,
    activities: [],
    desired_study_fields: ['Médecine'],
  },
  step3: {
    username: 'lea_m',
    email: 'lea@example.com',
    password: 'Password123',
    confirm_password: 'Password123',
    accept_terms: true,
  },
}

describe('register — registerAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    mockCheckRateLimit = vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 5,
      resetAt: 0,
    })
    vi.clearAllMocks()
  })

  it('renvoie une erreur si le rate limit est dépassé', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    })

    const result = await registerAction(validAlumniData)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Trop de tentatives/i)
  })

  describe('token d\'invitation', () => {
    it('rejette un token au format non-UUID', async () => {
      const result = await registerAction(validAlumniData, 'not-a-uuid')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Lien d'invitation invalide/i)
    })

    it('rejette un token revoked', async () => {
      mockSupabase.__setRpc('validate_invitation_token', {
        data: { valid: false, reason: 'revoked' },
      })

      const result = await registerAction(
        validAlumniData,
        '123e4567-e89b-12d3-a456-426614174000'
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/révoqué/i)
    })

    it('rejette un token expired', async () => {
      mockSupabase.__setRpc('validate_invitation_token', {
        data: { valid: false, reason: 'expired' },
      })

      const result = await registerAction(
        validAlumniData,
        '123e4567-e89b-12d3-a456-426614174000'
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/expiré/i)
    })

    it('rejette un token used', async () => {
      mockSupabase.__setRpc('validate_invitation_token', {
        data: { valid: false, reason: 'used' },
      })

      const result = await registerAction(
        validAlumniData,
        '123e4567-e89b-12d3-a456-426614174000'
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/déjà été utilisé/i)
    })
  })

  it('rejette si username déjà pris', async () => {
    mockAdmin.__setTable('profiles', { data: { id: 'existing-user' } })

    const result = await registerAction(validAlumniData)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/déjà pris/i)
  })

  it('rejette avec erreur "already registered" de Supabase', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered' },
    })

    const result = await registerAction(validAlumniData)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/email est déjà utilisé/i)
  })

  it('rejette si enrollment_date invalide pour S1-S3 (< 1980)', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    const badData: RegisterFormData = {
      ...validStudentData,
      step2_student: {
        ...validStudentData.step2_student!,
        enrollment_date: 1979,
      },
    }

    const result = await registerAction(badData)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Année d'entrée au collège invalide/i)
    // Cleanup auth user appelé
    expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('new-user')
  })

  it('inscription sans invitation → status "pending" + redirect /pending', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    await expect(registerAction(validAlumniData)).rejects.toThrow(
      'NEXT_REDIRECT:/pending'
    )

    // Vérifie que le profil est inséré avec status 'pending'
    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    expect(profilesCall).toBeDefined()
    const payload = profilesCall!.inserts[0] as { status: string; terms_version: string }
    expect(payload.status).toBe('pending')
    expect(payload.terms_version).toBe('1.0')
  })

  it('inscription avec invitation valide → status "active" + redirect /login?invited=1', async () => {
    mockSupabase.__setRpc('validate_invitation_token', {
      data: { valid: true },
    })
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    await expect(
      registerAction(
        validAlumniData,
        '123e4567-e89b-12d3-a456-426614174000'
      )
    ).rejects.toThrow('NEXT_REDIRECT:/login?invited=1')

    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    expect(profilesCall).toBeDefined()
    const payload = profilesCall!.inserts[0] as { status: string }
    expect(payload.status).toBe('active')
  })

  it('student S2 → expected_end_date = enrollment_date + 2', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    await expect(registerAction(validStudentData)).rejects.toThrow(
      'NEXT_REDIRECT:/pending'
    )

    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    expect(profilesCall).toBeDefined()
    const payload = profilesCall!.inserts[0] as {
      expected_end_date: number
      class: string
      enrollment_date: number
    }
    expect(payload.class).toBe('S2')
    expect(payload.enrollment_date).toBe(2024)
    expect(payload.expected_end_date).toBe(2026) // 2024 + 2 (S2 = +2 ans)
  })

  it('student S1 → expected_end_date = enrollment_date + 3', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    const s1Data: RegisterFormData = {
      ...validStudentData,
      step2_student: { ...validStudentData.step2_student!, class: 'S1' },
    }

    await expect(registerAction(s1Data)).rejects.toThrow('NEXT_REDIRECT:/pending')

    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    const payload = profilesCall!.inserts[0] as { expected_end_date: number }
    expect(payload.expected_end_date).toBe(2027) // 2024 + 3
  })

  it('student S3 → expected_end_date = enrollment_date + 1', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    const s3Data: RegisterFormData = {
      ...validStudentData,
      step2_student: { ...validStudentData.step2_student!, class: 'S3' },
    }

    await expect(registerAction(s3Data)).rejects.toThrow('NEXT_REDIRECT:/pending')

    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    const payload = profilesCall!.inserts[0] as { expected_end_date: number }
    expect(payload.expected_end_date).toBe(2025) // 2024 + 1
  })

  it('alumni → rôle "alumni", pas d\'enrollment_date, pas d\'expected_end_date', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    await expect(registerAction(validAlumniData)).rejects.toThrow('NEXT_REDIRECT:/pending')

    const profilesCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'profiles' && c.inserts.length > 0
    )
    const payload = profilesCall!.inserts[0] as {
      role: string
      enrollment_date: number | null
      expected_end_date: number | null
      filiere: string
    }
    expect(payload.role).toBe('alumni')
    expect(payload.enrollment_date).toBeNull()
    expect(payload.expected_end_date).toBeNull()
    expect(payload.filiere).toBe('SVT')
  })

  it('alumni avec is_new_promo → upsert sur promotions avec status "pending"', async () => {
    mockAdmin.__setTable('profiles', { data: null })
    mockSupabase.auth.signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    })

    const newPromoData: RegisterFormData = {
      ...validAlumniData,
      step2_alumni: {
        ...validAlumniData.step2_alumni!,
        is_new_promo: true,
        promotion_name: 'Nouvelle Promo',
      },
    }

    // Précharger une réponse upsert pour promotions
    mockAdmin.__setTable('promotions', { data: { id: 'new-promo-id' } })

    await expect(registerAction(newPromoData)).rejects.toThrow('NEXT_REDIRECT:/pending')

    const promoCall = mockAdmin.__calls.from.find(
      (c) => c.table === 'promotions' && c.inserts.length > 0
    )
    expect(promoCall).toBeDefined()
    const payload = promoCall!.inserts[0] as { name: string; status: string }
    expect(payload.name).toBe('Nouvelle Promo')
    expect(payload.status).toBe('pending')
  })
})
