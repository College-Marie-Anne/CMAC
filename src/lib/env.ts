function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;
