import { vi, type Mock } from 'vitest'

/**
 * Minimal chainable Supabase query mock.
 *
 * Supports common chains used by the codebase:
 *   .from(table).select().eq().single() / maybeSingle() / (awaited)
 *   .from(table).update({...}).eq(...)
 *   .from(table).insert([...])
 *   .from(table).in(col, arr)
 *
 * Terminal methods return `Promise<{ data, error }>`. Configure return values
 * via the `MockSupabase.setTableResponse()` helper.
 */

type QueryResponse = { data: unknown; error: unknown }

export type MockSupabaseClient = {
  from: Mock
  rpc: Mock
  auth: {
    getUser: Mock
    signInWithPassword: Mock
    signInWithOtp: Mock
    verifyOtp: Mock
    signUp: Mock
    signOut: Mock
    updateUser: Mock
    admin: {
      getUserById: Mock
      deleteUser: Mock
    }
  }
  __setTable: (table: string, response: Partial<QueryResponse>) => void
  __setRpc: (name: string, response: { data?: unknown; error?: unknown }) => void
  __setAuth: (
    method: keyof MockSupabaseClient['auth'],
    response: unknown
  ) => void
  __calls: {
    from: { table: string; updates: unknown[]; inserts: unknown[] }[]
    rpc: { name: string; args: unknown }[]
  }
}

export function createMockSupabase(): MockSupabaseClient {
  const tableResponses = new Map<string, QueryResponse>()
  const rpcResponses = new Map<string, QueryResponse>()

  const calls: MockSupabaseClient['__calls'] = {
    from: [],
    rpc: [],
  }

  function makeQuery(table: string) {
    const response = tableResponses.get(table) ?? { data: null, error: null }
    const call = { table, updates: [] as unknown[], inserts: [] as unknown[] }
    calls.from.push(call)

    const chain: Record<string, unknown> = {}

    // Chainable methods (return the chain)
    const chainable = [
      'select',
      'eq',
      'in',
      'neq',
      'gt',
      'gte',
      'lt',
      'lte',
      'order',
      'limit',
      'range',
      'filter',
      'match',
      'or',
      'not',
      'is',
      'contains',
      'containedBy',
      'overlaps',
      'textSearch',
      'returns',
    ]
    for (const m of chainable) {
      chain[m] = vi.fn(() => chain)
    }

    // Mutation methods (return chain but record payload)
    chain.update = vi.fn((payload: unknown) => {
      call.updates.push(payload)
      return chain
    })
    chain.insert = vi.fn((payload: unknown) => {
      call.inserts.push(payload)
      return chain
    })
    chain.upsert = vi.fn((payload: unknown) => {
      call.inserts.push(payload)
      return chain
    })
    chain.delete = vi.fn(() => chain)

    // Terminal methods (return promises)
    chain.single = vi.fn(() => Promise.resolve(response))
    chain.maybeSingle = vi.fn(() => Promise.resolve(response))

    // Make the chain itself awaitable (e.g. `.update().eq()` without .single())
    ;(chain as { then?: unknown }).then = (
      resolve: (v: QueryResponse) => unknown
    ) => resolve(response)

    return chain
  }

  const client: MockSupabaseClient = {
    from: vi.fn((table: string) => makeQuery(table)),
    rpc: vi.fn((name: string, args?: unknown) => {
      calls.rpc.push({ name, args })
      const resp = rpcResponses.get(name) ?? { data: null, error: null }
      return Promise.resolve(resp)
    }),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null })
      ),
      signInWithOtp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      verifyOtp: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null })
      ),
      signUp: vi.fn(() =>
        Promise.resolve({
          data: { user: { id: 'new-user-id' }, session: null },
          error: null,
        })
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      updateUser: vi.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      admin: {
        getUserById: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
        deleteUser: vi.fn(() => Promise.resolve({ data: null, error: null })),
      },
    },
    __setTable: (table: string, response: Partial<QueryResponse>) => {
      tableResponses.set(table, {
        data: response.data ?? null,
        error: response.error ?? null,
      })
    },
    __setRpc: (name: string, response: { data?: unknown; error?: unknown }) => {
      rpcResponses.set(name, {
        data: response.data ?? null,
        error: response.error ?? null,
      })
    },
    __setAuth: (method, response) => {
      const mock = client.auth[method]
      if (typeof mock === 'function') {
        ;(mock as Mock).mockResolvedValueOnce(response)
      }
    },
    __calls: calls,
  }

  return client
}
