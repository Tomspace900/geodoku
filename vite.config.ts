import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { prerender } from "./scripts/build/prerender.ts";

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

// Pré-rendu des pages publiques (#139), à la fin du build navigateur : tout
// `vite build` le produit, Vercel et la CI compris, sans commande à changer. Le
// build SSR qu'il lance relit cette config, d'où la garde `ssrBuild`.
function prerenderPages(): Plugin {
  let options: Parameters<typeof prerender>[0] | null = null;
  return {
    name: "geodoku-prerender",
    apply: "build",
    configResolved(config) {
      options = config.build.ssr
        ? null
        : {
            root: config.root,
            outDir: resolve(config.root, config.build.outDir),
            configFile: config.configFile,
          };
    },
    async closeBundle() {
      if (options) await prerender(options);
    },
  };
}

// Version de l'app (`package.json`), montée à chaque mise en prod (AGENTS.md
// §11, « Versions ») : elle est donc déjà la bonne sur develop avant la PR.
const APP_VERSION: string = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8"),
).version;

export default defineConfig({
  plugins: [react(), bundleModuleManifest(), prerenderPages()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
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
