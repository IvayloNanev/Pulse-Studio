import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 15_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "node e2e/mock-supabase.mjs",
      url: "http://127.0.0.1:54329/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "pnpm run start --hostname 0.0.0.0",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-placeholder-key",
      },
    },
  ],
});
