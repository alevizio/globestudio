import { defineConfig, devices } from "@playwright/test";

const e2ePort = Number(process.env.PLAYWRIGHT_PORT ?? 5174);
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Software-GL (swiftshader) rendering of the globe is heavy on CI runners:
  // first paint compiles the three.js graph through the dev server, and a
  // context can stall when the previous test left the GPU-less renderer busy.
  // Give each test room and lean on retries rather than chasing flakes.
  timeout: process.env.CI ? 120_000 : 60_000,
  expect: { timeout: process.env.CI ? 20_000 : 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: process.env.CI ? 30_000 : 0,
    navigationTimeout: process.env.CI ? 60_000 : 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            "--enable-unsafe-swiftshader",
            "--ignore-gpu-blocklist",
            "--use-angle=swiftshader",
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: e2eBaseUrl,
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 120_000,
    // The teaser gate is default-ON (App.jsx: VITE_TEASER !== "0"), which
    // would serve the coming-soon page on every route and the suite would
    // never reach the actual app.
    env: { ...process.env, VITE_TEASER: "0" },
  },
});
