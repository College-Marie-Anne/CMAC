import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Administrative Supabase Client (bypasses RLS).
 * Use purely for backend admin scripts and rollback flows.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
