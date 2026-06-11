import { defineConfig } from '@playwright/test';

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
