import { defineConfig } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

/**
 * Load .env.local into the TEST process, not just the server process.
 *
 * `next start` reads .env.local by itself, so the app was always configured —
 * but the specs read process.env directly to decide whether to skip, and
 * Playwright does not load env files. That is why the two DB-backed tests
 * skipped even with credentials on disk. Using Next's own loader keeps the
 * test process and the server process reading exactly the same values.
 */
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './playwright',
  timeout: 30_000,
  retries: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://localhost:3941',
  },
  webServer: {
    command: 'bunx next start -p 3941',
    port: 3941,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      /**
       * The suite submits far more than a real visitor would, and every spec
       * hits the server from the same loopback address. At the production
       * limit of 5/hour the later submitting tests fail with 429 for a reason
       * that has nothing to do with what they assert - which is how the PII
       * test came back red the first time it was ever allowed to run.
       *
       * Caveat: `reuseExistingServer` means this does NOT apply to a server
       * you already had running. Restart it if a spec starts seeing 429.
       */
      TRIP_REQUEST_RATE_LIMIT: '1000',
    },
  },
});
