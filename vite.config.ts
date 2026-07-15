import { URL, fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

function bundleModuleManifest(): Plugin {
  return {
    name: "geodoku-bundle-module-manifest",
    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).flatMap((output) =>
        output.type === "chunk"
          ? [
              {
                fileName: output.fileName,
                isEntry: output.isEntry,
                isDynamicEntry: output.isDynamicEntry,
                imports: output.imports,
                modules: Object.keys(output.modules),
              },
            ]
          : [],
      );
      this.emitFile({
        type: "asset",
        fileName: ".bundle-modules.json",
        source: JSON.stringify(chunks, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), bundleModuleManifest()],
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
