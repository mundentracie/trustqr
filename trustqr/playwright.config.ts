import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000, // Chromium extension launch can be slow on this machine
  expect: { timeout: 10000 },
  workers: 1, // extensions share a profile, run serially
});
