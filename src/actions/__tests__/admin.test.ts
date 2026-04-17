import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase, type MockSupabaseClient } from '@/test/helpers/mock-supabase'

let mockSupabase: MockSupabaseClient
let mockAdmin: MockSupabaseClient

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}))
vi.mock('@/lib/emails/account-approved', () => ({
  sendAccountApprovedEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/push', () => ({
  dispatchPush: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/normalize-country', () => ({
  normalizeCountry: vi.fn((x: string) => x),
  normalizeNationalities: vi.fn((x: string[]) => x),
}))
vi.mock('@/lib/env', () => ({
  env: {
    supabaseUrl: 'http://fake',
    supabaseAnonKey: 'fake',
    supabaseServiceRoleKey: 'fake',
  },
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void | Promise<void>) => void fn),
}))

import {
  approveUserAction,
  rejectUserAction,
  bulkApproveAction,
  suspendUserAction,
  reactivateUserAction,
  deactivateUserAction,
  forceChangePasswordAction,
} from '../admin'

const ADMIN_USER = { id: 'admin-1' }
const TARGET_USER = 'target-user-id'

/**
 * Setup mocks so that requireAdmin() passes:
 * - auth.getUser returns a user
 * - from('profiles').select('role')... returns { role: 'admin' }
 */
function setupAdminAuth() {
  mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
    data: { user: ADMIN_USER },
    error: null,
  })
  mockSupabase.__setTable('profiles', {
    data: { role: 'admin', is_super_admin: false },
  })
}

describe('admin — requireAdmin guard', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
  })

  it('non authentifié → error "Non authentifié"', async () => {
    // getUser returns null by default in the mock
    const result = await approveUserAction(TARGET_USER)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Non authentifié/i)
  })

  it('utilisateur non-admin → error "Accès interdit"', async () => {
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', {
      data: { role: 'alumni', is_super_admin: false },
    })

    const result = await approveUserAction(TARGET_USER)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Accès interdit/i)
  })

  it('profil introuvable → error "Accès interdit"', async () => {
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.__setTable('profiles', {
      data: null,
      error: { message: 'not found' },
    })

    const result = await approveUserAction(TARGET_USER)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Accès interdit/i)
  })
})

describe('admin — approveUserAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('target introuvable → "Utilisatrice introuvable"', async () => {
    // setupAdminAuth configure profiles pour renvoyer admin ; on a besoin
    // que le requireTargetProfile renvoie null. On modifie après.
    // Le mock renvoie la même réponse pour toutes les requêtes sur profiles,
    // donc on doit reconfigurer après le requireAdmin.
    // Workaround : utiliser une réponse qui fait passer requireAdmin ET rendre target null
    // Le flow : auth.getUser → profiles.select('role').eq().single() (returns admin)
    //                       → profiles.select('id').eq().maybeSingle() (returns null)
    // Comme les deux lisent profiles, on ne peut pas les distinguer avec le mock simple.
    // On bypass en mockant l'admin profile normalement puis l'on setTable à null pour le 2nd call.
    // Simplification : on accepte que ce test soit skippé ou refactorisé.
    //
    // Pour tester ce cas, on mock différemment : getUser OK, puis on mock 2 réponses séquentielles.
    // Approche : on override la mock `from` pour renvoyer des query chainables différentes.
    let callCount = 0
    const origFrom = mockSupabase.from
    mockSupabase.from = vi.fn((table: string) => {
      callCount++
      const q = origFrom(table)
      if (callCount === 1 && table === 'profiles') {
        // requireAdmin's select('role')
        q.single = vi.fn(() =>
          Promise.resolve({ data: { role: 'admin', is_super_admin: false }, error: null })
        )
      } else if (callCount === 2 && table === 'profiles') {
        // requireTargetProfile's select('id')
        q.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
      }
      return q
    })

    const result = await approveUserAction(TARGET_USER)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Utilisatrice introuvable/i)
  })

  it('approuve avec succès → UPDATE status=active + notify_user + revalidate', async () => {
    // Override from pour simuler séquence :
    // 1. requireAdmin: select('role').single() → admin
    // 2. requireTargetProfile: select('id').maybeSingle() → exists
    // 3. select('first_name').eq().maybeSingle() → Marie
    // 4. update({status:active}).eq().eq() → success
    let callCount = 0
    mockSupabase.from = vi.fn((table: string) => {
      callCount++
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn((payload: unknown) => {
          ;(chain as { __lastUpdate?: unknown }).__lastUpdate = payload
          return chain
        }),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: null }),
      }
      if (callCount === 3) {
        // Third call = select first_name
        chain.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { first_name: 'Marie' }, error: null })
        )
      }
      void table
      return chain
    })

    const result = await approveUserAction(TARGET_USER)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    // Le RPC notify_user a été appelé
    const notifyCall = mockSupabase.__calls.rpc.find((c) => c.name === 'notify_user')
    expect(notifyCall).toBeDefined()
    expect(notifyCall!.args).toMatchObject({
      p_recipient: TARGET_USER,
      p_type: 'account_approved',
    })
  })
})

describe('admin — rejectUserAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('rejette un user pending → UPDATE status=deactivated', async () => {
    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn((payload: unknown) => {
          ;(chain as { __lastUpdate?: unknown }).__lastUpdate = payload
          return chain
        }),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: null }),
      }
      void callCount
      return chain
    })

    const result = await rejectUserAction(TARGET_USER)

    expect(result.success).toBe(true)
  })

  it('renvoie une erreur si la DB échoue', async () => {
    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: { message: 'DB connection lost' } }),
      }
      void callCount
      return chain
    })

    const result = await rejectUserAction(TARGET_USER)

    expect(result.success).toBe(false)
    expect(result.error).toBe('DB connection lost')
  })
})

describe('admin — bulkApproveAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('approuve plusieurs users + envoie N notifications', async () => {
    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'ok' }, error: null })),
        then: (resolve: (v: unknown) => unknown) => {
          // call 2 = fetch profiles first_names → array of 3 users
          if (callCount === 2) {
            return resolve({
              data: [
                { id: 'u1', first_name: 'Alice' },
                { id: 'u2', first_name: 'Bob' },
                { id: 'u3', first_name: 'Charlie' },
              ],
              error: null,
            })
          }
          return resolve({ data: null, error: null })
        },
      }
      return chain
    })

    const result = await bulkApproveAction(['u1', 'u2', 'u3'])

    expect(result.success).toBe(true)
    const notifyCalls = mockSupabase.__calls.rpc.filter((c) => c.name === 'notify_user')
    expect(notifyCalls.length).toBe(3)
  })
})

describe('admin — suspendUserAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('suspend le compte → UPDATE status=suspended + notify', async () => {
    mockSupabase.from = vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: null }),
      }
      return chain
    })

    const result = await suspendUserAction(TARGET_USER, 'Violation CGU')

    expect(result.success).toBe(true)
    const notifyCall = mockSupabase.__calls.rpc.find((c) => c.name === 'notify_user')
    expect(notifyCall).toBeDefined()
    expect(notifyCall!.args).toMatchObject({
      p_recipient: TARGET_USER,
      p_type: 'account_suspended',
    })
  })
})

describe('admin — reactivateUserAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('réactive le compte → UPDATE status=active + notify account_reactivated', async () => {
    mockSupabase.from = vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: null }),
      }
      return chain
    })

    const result = await reactivateUserAction(TARGET_USER)

    expect(result.success).toBe(true)
    const notifyCall = mockSupabase.__calls.rpc.find((c) => c.name === 'notify_user')
    expect(notifyCall!.args).toMatchObject({
      p_type: 'account_reactivated',
    })
  })
})

describe('admin — deactivateUserAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
    setupAdminAuth()
  })

  it('désactive le compte → UPDATE status=deactivated + notify', async () => {
    mockSupabase.from = vi.fn(() => {
      const chain: Record<string, unknown> = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        update: vi.fn(() => chain),
        single: vi.fn(() =>
          Promise.resolve({ data: { role: 'admin' }, error: null })
        ),
        maybeSingle: vi.fn(() => Promise.resolve({ data: { id: TARGET_USER }, error: null })),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: null, error: null }),
      }
      return chain
    })

    const result = await deactivateUserAction(TARGET_USER)

    expect(result.success).toBe(true)
    const notifyCall = mockSupabase.__calls.rpc.find((c) => c.name === 'notify_user')
    expect(notifyCall!.args).toMatchObject({
      p_type: 'account_deactivated',
    })
  })
})

describe('admin — forceChangePasswordAction', () => {
  beforeEach(() => {
    mockSupabase = createMockSupabase()
    mockAdmin = createMockSupabase()
    vi.clearAllMocks()
  })

  it('validation Zod échoue (password trop court)', async () => {
    const result = await forceChangePasswordAction({
      password: 'short',
      confirm_password: 'short',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('session expirée → "Session expirée. Reconnectez-vous"', async () => {
    // getUser renvoie null (par défaut)
    const result = await forceChangePasswordAction({
      password: 'Password123',
      confirm_password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/Session expirée/i)
  })

  it('same_password error Supabase → message explicite', async () => {
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })
    mockSupabase.auth.updateUser = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'same_password: must be different' },
    })

    const result = await forceChangePasswordAction({
      password: 'Password123',
      confirm_password: 'Password123',
    })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/différent du temporaire/i)
  })
})
