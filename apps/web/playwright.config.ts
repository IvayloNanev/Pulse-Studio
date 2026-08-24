import { defineConfig, devices } from "@playwright/test";

const webPort = Number(process.env.PULSE_E2E_PORT ?? 3000);
const supabasePort = Number(process.env.PULSE_MOCK_SUPABASE_PORT ?? 54329);
const baseURL = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 15_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: process.env.PULSE_SKIP_WEBSERVER ? undefined : [
    {
      command: "node e2e/mock-supabase.mjs",
      url: `http://127.0.0.1:${supabasePort}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { PULSE_MOCK_SUPABASE_PORT: String(supabasePort) },
    },
    {
      command: `pnpm run start --hostname 0.0.0.0 --port ${webPort}`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${supabasePort}`,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-placeholder-key",
        PULSE_MOCK_SUPABASE_PORT: String(supabasePort),
      },
    },
  ],
});
