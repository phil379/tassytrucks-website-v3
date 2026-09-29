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
    /**
     * Keep a trace for anything that fails or flakes. A wizard spec that lands
     * on the wrong page fails as a locator timeout with no page snapshot, which
     * is a dead end at 3am — the trace has the URL, the DOM and the network.
     */
    trace: 'retain-on-failure',
  },
  /**
   * TWO servers, deliberately.
   *
   * 3941 runs the real configuration, including the real NTFY_TOPIC — the
   * PII spec asserts against messages actually published to that topic, so
   * redirecting the sink globally silently turns that test into one that
   * polls an empty topic and passes for the wrong reason. It nearly did.
   *
   * 3943 is the Stripe webhook's rig: a known signing secret and a push sink
   * on a loopback port the specs start, count and kill.
   */
  webServer: [
    {
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
      /**
       * Same reason, second route. /api/facility-signup allows 5 per IP per
       * hour; the facility spec posts nine times from one loopback address, so
       * the later tests 429 for a reason unrelated to what they assert. That is
       * how four of them came back red the first time they ran.
       */
      FACILITY_SIGNUP_RATE_LIMIT: '1000',
      /** Same reason, third route — the school specs post more than 5 times. */
      SCHOOL_BOOKING_RATE_LIMIT: '1000',
      /**
       * NO REAL EMAIL FROM THE TEST SUITE.
       *
       * This file deliberately loads .env.local into the test process, and
       * `next start` reads it too. .env.local carries a REAL RESEND_API_KEY,
       * and lib/notifications.ts has no test guard — so every spec that
       * submits a booking sent real mail on the real account, and the operator
       * leg landed in Phil's actual inbox. That is how ~3,000 emails went out
       * against a business with no customers, until Resend answered
       * 429 monthly_quota_exceeded and production auto-replies went dark.
       *
       * Empty string, not a fake key: notifyOperatorEmail throws on a falsy
       * key BEFORE it builds a request, so this makes zero network calls.
       * A fake key would still reach api.resend.com and 401.
       *
       * The email legs then fail, are logged, and are swallowed — the
       * documented contract at the top of lib/notifications.ts. The row is
       * still written and every assertion in the suite still holds.
       *
       * @next/env does not overwrite a variable already present in the
       * environment, and '' is present. VERIFY after a full run: Resend's
       * dashboard must show zero sends for the window.
       */
      RESEND_API_KEY: '',
      },
    },
    {
      command: 'bunx next start -p 3943',
      port: 3943,
      reuseExistingServer: true,
      timeout: 60_000,
      env: {
        /**
         * A KNOWN signing secret. Deliberately not the real one: a test that
         * depends on a production secret being present on a laptop is a test
         * that skips, and a payment path is the last place to accept that.
         */
        STRIPE_WEBHOOK_SECRET: 'whsec_pw_test_secret',
        /**
         * The push sink, pointed at a loopback port the specs own. Capture
         * server up = "was the operator told?" is observable. Capture server
         * down = connection refused, which is the shape of ntfy being down and
         * is how the resilience test proves a dead sink cannot undo a payment.
         */
        NTFY_TOPIC: 'pw-test-topic',
        NTFY_BASE_URL: 'http://127.0.0.1:3942',
        /**
         * Same reason as the 3941 server, and not merely belt-and-braces: a
         * webServer `env` block is merged with process.env, and this config
         * loads .env.local into that — so WITHOUT this line the rig would still
         * hold the real key. Nothing here sends mail today, which is exactly
         * the state 3941 was in before a spec was added that did.
         */
        RESEND_API_KEY: '',
      },
    },
  ],
});
