// IMPORTANT: Les variables NEXT_PUBLIC_* doivent être accédées directement
// via process.env.NOM_VARIABLE (notation statique), pas via process.env[variable]
// car Next.js effectue une substitution statique à la compilation.

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get supabaseServiceRoleKey() {
    return requireEnv(process.env.SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
  },
};
