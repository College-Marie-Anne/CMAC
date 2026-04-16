import { withSentryConfig } from "@sentry/nextjs";
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

/**
 * Content Security Policy — construite en fonction des ressources utilisées :
 *  - self : notre origine
 *  - Supabase : REST (https://*.supabase.co) + Realtime (wss://*.supabase.co)
 *  - Google Fonts : fonts.googleapis.com (CSS) + fonts.gstatic.com (woff)
 *  - data: / blob: : avatars uploadés, previews images
 *  - 'unsafe-inline' scripts : requis pour le script anti-FOUC beforeInteractive
 *    et le bundle Next.js qui inline certains scripts (pas de nonce activé ici)
 *  - 'unsafe-inline' styles : requis pour Framer Motion + shadcn/ui + Tailwind
 *  - 'unsafe-eval' : UNIQUEMENT en dev (Turbopack HMR utilise eval pour fast
 *    refresh). Retiré en prod pour réduire la surface XSS — aucune dépendance
 *    runtime (Sentry, Framer Motion, Supabase, Radix, Resend) ne nécessite
 *    eval en prod. Si un crash apparaît après déploiement, vérifier la console
 *    pour "EvalError" ou "CSP violation: unsafe-eval".
 *  - 'wasm-unsafe-eval' : ajouté en prod par sécurité pour les WASM modules
 *    (Sentry replay peut en utiliser pour la compression). Beaucoup moins
 *    risqué qu'unsafe-eval (le code WASM ne peut pas accéder au DOM directement).
 *
 * Sentry : le tunnel `/monitoring` route via notre domaine, donc pas besoin
 * de whitelist sentry.io dans connect-src.
 */
const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  // unsafe-eval uniquement en dev (Turbopack HMR)
  isDev ? "'unsafe-eval'" : null,
  // WASM toléré en prod (Sentry replay, futurs WASM modules)
  !isDev ? "'wasm-unsafe-eval'" : null,
]
  .filter(Boolean)
  .join(" ");

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' blob: data: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  // Clickjacking
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referer leak
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Désactive les features non utilisées (réduit la surface d'attaque)
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  },
  // Force HTTPS pendant 2 ans (seulement en prod — effet cumulatif)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Prefetch DNS pour les hôtes externes (perf)
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Appliqué à toutes les routes (sauf /serwist/* qui gère son propre
        // header Service-Worker-Allowed via @serwist/turbopack).
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Serwist (PWA Service Worker) wrappé en premier, puis Sentry par-dessus
export default withSentryConfig(withSerwist(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "lakou-systems",

  project: "cmac",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
