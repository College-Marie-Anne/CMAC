import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch (err) {
          // Échec attendu dans les Server Components (cookies read-only).
          // Le middleware rafraîchit les cookies en amont.
          // On log uniquement en dev pour ne pas polluer les logs prod.
          if (process.env.NODE_ENV === 'development') {
            console.warn('[supabase] Cookie set failed (expected in SC):', err instanceof Error ? err.message : String(err))
          }
        }
      },
    },
  })
}
