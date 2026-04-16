/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  CacheFirst,
  NetworkFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "serwist";

/**
 * Service Worker CMA Connect.
 *
 * Cache strategies (spec §1556-1561) :
 *  - App Shell (JS, CSS, HTML)               → via defaultCache (Serwist)
 *  - Images Supabase Storage                 → CacheFirst 30j / 200 entries
 *  - API Supabase REST                       → NetworkFirst (timeout 3s)
 *  - Google Fonts                            → CacheFirst 365j
 *
 * Offline fallback : `/offline` (précachée via additionalPrecacheEntries).
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sw = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  runtimeCaching: [
    ...defaultCache,

    // Supabase Storage — images (avatars, emblèmes, forum-images)
    {
      matcher: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/(public|sign)\/.*/i,
      handler: new CacheFirst({
        cacheName: "cmac-storage-images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Supabase REST API — forum, profils, notifications
    {
      matcher: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: new NetworkFirst({
        cacheName: "cmac-api",
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 5 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },

    // Google Fonts stylesheets
    {
      matcher: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: new StaleWhileRevalidate({
        cacheName: "cmac-google-fonts-css",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
        ],
      }),
    },

    // Google Fonts webfont files
    {
      matcher: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "cmac-google-fonts-woff",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 30,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          }),
          new CacheableResponsePlugin({ statuses: [0, 200] }),
        ],
      }),
    },
  ],

  // Fallback quand réseau ET cache indisponibles
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

sw.addEventListeners();
