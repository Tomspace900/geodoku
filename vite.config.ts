import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { prerender } from "./scripts/build/prerender.ts";
import { vercelHeadersForHost } from "./scripts/build/vercelHeaders.ts";

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

// `vite preview` (l'e2e de la CI) sert les en-têtes que Vercel sert hors de
// www.geodoku.app, CSP bloquante comprise : une origine oubliée casse l'e2e
// avant la prod (#180). Pas en `vite dev`, dont le rechargement à chaud
// injecte un script inline.
const PREVIEW_HEADERS = vercelHeadersForHost(
  JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8")),
  "localhost",
);

// cmdk attache `Command.Dialog` (Radix Dialog) à l'objet `Command` par
// `Object.assign` : impossible à éliminer, il faisait entrer 11 KiB de Radix
// dans le chargement initial à côté de nos modales Base UI (#183). On ne s'en
// sert pas ; s'il venait à être rendu, le module de remplacement le dit.
function cmdkWithoutDialog(): Plugin {
  const stubId = "\0geodoku-cmdk-dialog-stub";
  return {
    name: "geodoku-cmdk-without-dialog",
    enforce: "pre",
    resolveId(source, importer) {
      if (source === "@radix-ui/react-dialog" && importer?.includes("/cmdk/"))
        return stubId;
      return null;
    },
    load(id) {
      if (id !== stubId) return null;
      return [
        "const Unavailable = () => {",
        '  throw new Error("Command.Dialog de cmdk n\'est pas servi : utiliser DialogContent (#183)");',
        "};",
        "export { Unavailable as Root, Unavailable as Portal, Unavailable as Overlay, Unavailable as Content };",
      ].join("\n");
    },
  };
}

export default defineConfig({
  plugins: [
    cmdkWithoutDialog(),
    react(),
    bundleModuleManifest(),
    prerenderPages(),
  ],
  preview: {
    headers: PREVIEW_HEADERS,
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // `node` by default: mounting happy-dom for every file cost ~10 s of the
    // suite. A test that touches the DOM or web storage opts in on its first
    // line with `// @vitest-environment happy-dom` (AGENTS.md §4).
    environment: "node",
    globals: true,
    // Playwright e2e specs (e2e/*.spec.ts) must not be collected by Vitest —
    // they import @playwright/test, which is incompatible with the Vitest runner.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.claude/**", "e2e/**"],
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
});
