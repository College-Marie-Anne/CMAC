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
  /**
   * URL publique du site (sans trailing slash), utilisée pour :
   *  - `emailRedirectTo` de Supabase Auth (lien dans les emails de confirmation)
   *  - `redirectTo` des reset password
   *  - Génération de liens absolus (invitations, partage)
   *
   * DOIT être configurée sur chaque environnement (Vercel prod, preview, local) :
   *  - Vercel prod     : https://cmaconnect.app (ou le domaine réel)
   *  - Vercel preview  : Vercel l'auto-préfixe (VERCEL_URL), fallback si non set
   *  - Local           : http://localhost:3000
   *
   * IMPORTANT : cette URL doit AUSSI être whitelistée dans le dashboard Supabase :
   *   Authentication → URL Configuration → Redirect URLs
   *   Sinon Supabase ignore `emailRedirectTo` et retombe sur le Site URL par défaut
   *   (qui peut pointer vers localhost → emails cassés en prod).
   */
  get siteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");
    // Vercel auto-set pour les preview deployments (pas le prod domain)
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;
    // Fallback dev
    return "http://localhost:3000";
  },
  /** Optional — emails silently skipped if not set (allows local dev without Resend). */
  get resendApiKey(): string | null {
    return process.env.RESEND_API_KEY ?? null;
  },
  /**
   * Adresse d'expéditeur pour tous les emails transactionnels (welcome, approval,
   * admin pending). Exemple : `"CMA Connect <noreply@cmaconnect.com>"`.
   *
   * ⚠ IMPORTANT : cette adresse DOIT appartenir à un domaine vérifié dans
   * Resend (Dashboard → Domains). Sans vérification, Resend rejette avec un
   * code d'erreur `validation_error` / `from_domain_not_verified` → l'email
   * ne part jamais, même si le code tourne sans exception.
   *
   * Fallback : `onboarding@resend.dev` est un domaine pré-vérifié fourni par
   * Resend, utile en dev / pendant qu'on vérifie notre propre domaine. Les
   * emails passent, mais le "From" affiche "onboarding@resend.dev" ce qui
   * n'est pas idéal en prod.
   */
  get emailFrom(): string {
    return process.env.EMAIL_FROM ?? "CMA Connect <onboarding@resend.dev>";
  },
  /**
   * Clé publique VAPID — exposée au client pour `pushManager.subscribe()`.
   * Générée via `npx web-push generate-vapid-keys --json` puis configurée
   * en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Vercel prod + preview + .env.local).
   *
   * null si non configurée → les push sont silencieusement désactivés
   * (le hook client signale l'état "unsupported" et le helper serveur
   * `sendPushToUser` short-circuit).
   */
  get vapidPublicKey(): string | null {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
  },
  /**
   * Clé privée VAPID — NE JAMAIS exposer au client.
   * Uniquement utilisée côté serveur par `web-push` pour signer les JWT
   * d'authentification auprès des endpoints push (FCM, Mozilla, Apple).
   */
  get vapidPrivateKey(): string | null {
    return process.env.VAPID_PRIVATE_KEY ?? null;
  },
  /**
   * Sujet VAPID — adresse mailto ou URL que les push gateways utilisent
   * pour contacter l'admin en cas d'abus. Obligatoire dans le JWT VAPID.
   */
  get vapidSubject(): string {
    return process.env.VAPID_SUBJECT ?? "mailto:admin@cmaconnect.app";
  },
};
