import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Load .env.local so VITE_CONVEX_URL is available in test process fixtures
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Backend-bound suite: all browsers share one daily grid on the Convex dev
  // deployment and submit identical guesses to the same docs. Run serially — a
  // single Vite dev server transforms ESM on the fly, and a concurrent WebKit/
  // Firefox page load saturates CPU enough to freeze another worker's
  // latency-sensitive 9-cell fill for >30s. The suite is small (and the heavy
  // completion tests are gated to chromium-desktop), so wall-clock stays modest.
  workers: 1,
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  // One local retry absorbs the residual load flake on the heaviest tests (the
  // 9-cell win/share flows) when they happen to run against a saturated machine.
  retries: process.env.CI ? 3 : 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  // Serve the app unless a deployed URL is provided.
  // - CI: serve the production build via `vite preview`. Built assets avoid the
  //   on-the-fly ESM transform of the dev server that saturates the runner's CPU
  //   and makes the latency-sensitive 9-cell fills time out. `dist/` is produced
  //   by the `pnpm build` step earlier in the CI job (must exist before preview).
  // - Local: `pnpm dev` for fast iteration (loads .env.local automatically).
  ...(process.env.PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: process.env.CI
            ? "pnpm exec vite preview --port 5173 --strictPort"
            : "pnpm dev",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }),
  projects: [
    // Tests are routed to projects by filename suffix (rather than per-test
    // `test.skip`), so each runs exactly where it's meaningful and the run
    // reports ~no skips:
    //   *.shared.spec.ts  → every engine (core gameplay, cross-browser value)
    //   *.desktop.spec.ts → chromium-desktop only (heavy/browser-agnostic flows
    //                       + clipboard, which is Chromium-only in Playwright)
    //   *.mobile.spec.ts  → mobile profiles only (touch layout / drawer)
    // ── Desktop ─────────────────────────────────────────────────────────────
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [/\.shared\.spec\.ts$/, /\.desktop\.spec\.ts$/],
    },
    {
      name: "firefox-desktop",
      use: { ...devices["Desktop Firefox"] },
      testMatch: [/\.shared\.spec\.ts$/],
    },
    {
      name: "webkit-desktop",
      use: { ...devices["Desktop Safari"] },
      testMatch: [/\.shared\.spec\.ts$/],
    },
    // ── Mobile ──────────────────────────────────────────────────────────────
    {
      name: "chromium-android",
      use: { ...devices["Pixel 7"] },
      testMatch: [/\.shared\.spec\.ts$/, /\.mobile\.spec\.ts$/],
    },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 15"] },
      testMatch: [/\.shared\.spec\.ts$/, /\.mobile\.spec\.ts$/],
    },
    {
      name: "webkit-ipad",
      use: { ...devices["iPad Pro 11"] },
      testMatch: [/\.shared\.spec\.ts$/, /\.mobile\.spec\.ts$/],
    },
  ],
});
