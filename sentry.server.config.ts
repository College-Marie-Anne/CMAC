// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://6c7790a40c19f5152122e000af232ea1@o4511200062406656.ingest.us.sentry.io/4511200064831488",

  // Environnement explicite — distinguer prod / preview / dev dans le dashboard
  // Sentry. VERCEL_ENV vaut "production" / "preview" / "development" sur Vercel.
  environment:
    process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",

  // Release tag — permet de mapper les erreurs au commit qui les a introduites
  // et de profiter des source maps. Vercel expose VERCEL_GIT_COMMIT_SHA auto.
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
