import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase, type MockSupabaseClient } from '@/test/helpers/mock-supabase'

// Mocks must be declared BEFORE importing the SUT.
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
  loginLimiter: {},
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  sanitizeIp: vi.fn((raw: string | null | undefined) => raw ?? 'unknown'),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { loginAction, logoutAction } from '../auth'

describe('auth — loginAction', () => {
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
      resetAt: Date.now() + 30_000,
    })

    const result = await loginAction({
      identifier: 'marie_d',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Trop de tentatives/i)
  })

  it('renvoie une erreur si la validation Zod échoue (identifier trop court)', async () => {
    const result = await loginAction({
      identifier: 'ab',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('username inconnu → erreur "Aucun compte trouvé"', async () => {
    mockSupabase.__setRpc('resolve_profile_id_by_username', { data: null })

    const result = await loginAction({
      identifier: 'unknown_user',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Aucun compte/i)
  })

  it('fullname avec 1 seul mot → erreur "Entrez vos prénoms suivis de votre nom"', async () => {
    const result = await loginAction({
      identifier: 'Marie Dupont Anne',
      password: 'Password123',
    })
    // "Marie Dupont Anne" contient des espaces → fullname
    // Mais il y a 3 parts, donc OK — testons avec 1 seul mot qui contient un char non alphanum
    // Note: "Marie-Anne" single token → détecté comme fullname car contient `-` (non alphanum)
    const r2 = await loginAction({
      identifier: 'Marie-Anne',
      password: 'Password123',
    })
    expect(r2.success).toBe(false)
    expect(r2.error).toMatch(/prénoms suivis/i)
    // sanity check on first call: "Marie Dupont Anne" → hit the RPC path
    expect(result.success).toBe(false)
  })

  it('fullname avec plusieurs homonymes sans DOB → needsDob: true', async () => {
    mockSupabase.__setRpc('resolve_profiles_by_fullname', {
      data: [{ id: 'user-1' }, { id: 'user-2' }],
    })

    const result = await loginAction({
      identifier: 'Marie Dupont',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.needsDob).toBe(true)
    expect(result.matches).toBe(2)
  })

  it('fullname avec plusieurs homonymes + DOB → needsOtp: true', async () => {
    mockSupabase.__setRpc('resolve_profiles_by_fullname', {
      data: [{ id: 'user-1' }, { id: 'user-2' }],
    })
    mockAdmin.__setRpc('resolve_email_by_profile_id', {
      data: 'marie@example.com',
    })

    const result = await loginAction({
      identifier: 'Marie Dupont',
      password: 'Password123',
      dob: '2000-01-15',
    })

    expect(result.success).toBe(false)
    expect(result.needsOtp).toBe(true)
    expect(mockSupabase.auth.signInWithOtp).toHaveBeenCalled()
  })

  it('email + mot de passe invalide → "Identifiant ou mot de passe incorrect"', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await loginAction({
      identifier: 'marie@example.com',
      password: 'wrongpass',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Identifiant ou mot de passe incorrect/i)
  })

  it('compte "pending" → signOut + message en attente', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', { data: { status: 'pending' } })

    const result = await loginAction({
      identifier: 'marie@example.com',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/en attente/i)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('compte "suspended" → signOut + message suspension', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', { data: { status: 'suspended' } })

    const result = await loginAction({
      identifier: 'marie@example.com',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/suspendu/i)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('compte "deactivated" → signOut + message désactivation', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', { data: { status: 'deactivated' } })

    const result = await loginAction({
      identifier: 'marie@example.com',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/désactivé/i)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('compte "active" → redirect /feed (throw NEXT_REDIRECT)', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', { data: { status: 'active' } })

    await expect(
      loginAction({
        identifier: 'marie@example.com',
        password: 'Password123',
      })
    ).rejects.toThrow('NEXT_REDIRECT:/feed')
  })

  it('compte sans profil → signOut + erreur "Profil introuvable"', async () => {
    mockSupabase.auth.signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', {
      data: null,
      error: { message: 'not found' },
    })

    const result = await loginAction({
      identifier: 'marie@example.com',
      password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Profil introuvable/i)
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})

describe('auth — logoutAction', () => {
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

  it('appelle signOut et redirect /login', async () => {
    await expect(logoutAction()).rejects.toThrow('NEXT_REDIRECT:/login')
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })
})
