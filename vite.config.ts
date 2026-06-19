import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    // Playwright e2e specs (e2e/*.spec.ts) must not be collected by Vitest —
    // they import @playwright/test, which is incompatible with the Vitest runner.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "e2e/**"],
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
});
