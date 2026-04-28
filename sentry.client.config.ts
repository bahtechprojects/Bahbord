// Sentry client-side initialization (browser).
// Loaded automatically by @sentry/nextjs on the client.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // Minimal setup: no replays, no tunnel.
  });
}
