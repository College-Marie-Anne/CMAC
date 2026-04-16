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

/**
 * Web Push — handler `push`
 *
 * Reçoit le payload JSON envoyé par le serveur via `web-push` côté Next
 * (src/lib/push.ts:sendPushToUser). Le payload suit le contrat `PushPayload` :
 *   { title, body, url?, tag? }
 *
 * showNotification DOIT être appelé dans event.waitUntil, sinon Chrome
 * affiche un "This site has been updated in the background" générique
 * (punition anti-silent-push). On affiche systématiquement une notif, même
 * si le payload est malformé (fallback texte minimal).
 */
self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent;
  type Payload = { title?: string; body?: string; url?: string; tag?: string };
  let payload: Payload = {};
  try {
    payload = (pushEvent.data?.json() ?? {}) as Payload;
  } catch {
    // Payload non-JSON (rare avec notre pipeline Next) : on affiche un fallback
    payload = { body: pushEvent.data?.text() ?? "Nouvelle notification" };
  }

  const title = payload.title ?? "CMA Connect";
  const body = payload.body ?? "";
  const url = payload.url ?? "/notifications";
  const tag = payload.tag ?? "cmac-notif";

  pushEvent.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag,
      // Passé au notificationclick pour router vers la bonne page
      data: { url },
    })
  );
});

/**
 * Web Push — handler `notificationclick`
 *
 * Au clic sur la notif OS :
 *   - Si un onglet CMA Connect est déjà ouvert → on le focus et navigate vers url
 *   - Sinon on ouvre un nouvel onglet sur url
 *
 * Le `focus()` évite d'ouvrir un 2e onglet quand la PWA tourne déjà.
 */
self.addEventListener("notificationclick", (event) => {
  const clickEvent = event as NotificationEvent;
  clickEvent.notification.close();
  const targetUrl =
    (clickEvent.notification.data as { url?: string } | undefined)?.url ??
    "/notifications";

  clickEvent.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Cherche un onglet déjà ouvert sur notre origine (même pathname différent)
      const existing = allClients.find((c) =>
        c.url.startsWith(self.location.origin)
      );

      if (existing) {
        // navigate() peut échouer si cross-origin — safe ici puisque même origin
        try {
          await existing.navigate(targetUrl);
        } catch {
          // fallback : focus seul, l'utilisatrice est déjà dans l'app
        }
        await existing.focus();
        return;
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
