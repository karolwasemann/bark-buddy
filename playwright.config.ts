// Playwright configuration for Bark Buddy E2E tests.
// Auth setup project logs in once; tests reuse the session via storageState.

import { defineConfig, devices } from "@playwright/test";

const authFile = "auth.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    ...(process.env.CI
      ? [
          {
            name: "chromium",
            use: { ...devices["Desktop Chrome"], storageState: authFile },
            dependencies: ["setup"],
          },
        ]
      : [
          {
            name: "edge",
            use: { ...devices["Desktop Edge"], channel: "msedge" as const, storageState: authFile },
            dependencies: ["setup"],
          },
        ]),
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
