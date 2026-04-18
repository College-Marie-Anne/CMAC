// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6c7790a40c19f5152122e000af232ea1@o4511200062406656.ingest.us.sentry.io/4511200064831488",

  // Environnement explicite — distinguer prod / preview / dev dans le dashboard
  // Sentry. NEXT_PUBLIC_VERCEL_ENV est exposé côté client par Vercel.
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // Release tag — pour mapper les erreurs au commit qui les a introduites.
  // NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA exposé côté client par Vercel.
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Erreurs non-actionnables qu'on ne veut pas dans Sentry.
  // - UnrecognizedActionError : après un deploy, les hashes de Server Actions
  //   changent. Les clients avec l'ancienne page en cache (mobile en arrière-
  //   plan, iOS Safari qui restore la session) tentent d'invoquer un hash
  //   qui n'existe plus. Next.js catch et fallback vers une navigation full
  //   (handled = yes), donc pas d'impact UX réel — juste du bruit Sentry.
  //   Sentry issue 5ac28cf76fc6 — iOS Safari sur /register/invite/:token.
  //   Ref : https://nextjs.org/docs/messages/failed-to-find-server-action
  ignoreErrors: ["UnrecognizedActionError"],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
