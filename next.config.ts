import { withSentryConfig } from "@sentry/nextjs";
import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";

/**
 * Headers de sécurité STATIQUES — appliqués à toutes les routes.
 *
 * La Content-Security-Policy, elle, est générée DYNAMIQUEMENT par le proxy
 * (`src/proxy.ts`) pour pouvoir porter un nonce par requête et éliminer
 * `'unsafe-inline'` côté scripts. Voir le commentaire dans proxy.ts.
 */
const securityHeaders = [
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
  // Les uploads d'image passent par une Server Action (`uploadImageAction`)
  // qui reçoit le fichier en FormData pour y appliquer la validation magic
  // bytes côté serveur. La limite par défaut des Server Actions (1 MB) n'est
  // pas suffisante pour les images forum/DM (plafond métier : 5 MB). 6 MB
  // laisse une marge pour l'overhead multipart/form-data.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
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
