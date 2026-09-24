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
  },
});
