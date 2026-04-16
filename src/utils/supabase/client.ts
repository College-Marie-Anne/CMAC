import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client Supabase côté browser — **singleton**.
 *
 * Pourquoi singleton :
 *  - `createBrowserClient` construit un nouveau `SupabaseClient` + un nouveau
 *    `RealtimeClient` à chaque appel. Dans les composants client qui appellent
 *    `createClient()` depuis un `useEffect`, chaque render crée un nouveau
 *    WebSocket et le `auth.onAuthStateChange` listener interne (qui propage
 *    le JWT vers `realtime.setAuth`) n'a pas systématiquement le temps de
 *    firer avant que le canal soit subscribed.
 *  - Conséquence observée (bug #dm-ne-se-met-pas-a-jour) : les subscriptions
 *    `postgres_changes` sur `direct_messages` / `notifications` se
 *    connectaient en `anon`, les RLS des policies SELECT (qui exigent
 *    `auth.uid() = participant_x`) rejetaient tous les events côté Realtime,
 *    rien ne remontait au callback.
 *  - Avec un singleton : une seule connexion WebSocket, un seul listener
 *    `onAuthStateChange` actif pendant toute la durée de la session, le JWT
 *    est propagé à Realtime dès qu'il change.
 *
 * Les Server Components et le proxy utilisent `createServerClient` via
 * `@/utils/supabase/server` — aucun conflit.
 */

declare global {
  // Storage cross-HMR pour survivre aux Fast Refresh en dev (évite de
  // recréer le singleton et laisser des WebSockets orphelins).
  // eslint-disable-next-line no-var
  var __cmac_supabase_browser: SupabaseClient | undefined;
}

export function createClient(): SupabaseClient {
  if (typeof window === "undefined") {
    // Safety net : ne doit jamais être appelé côté serveur, mais on évite
    // de persister une instance globale côté SSR (leak cross-requêtes).
    return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  if (!globalThis.__cmac_supabase_browser) {
    globalThis.__cmac_supabase_browser = createBrowserClient(
      env.supabaseUrl,
      env.supabaseAnonKey
    );
  }
  return globalThis.__cmac_supabase_browser;
}
