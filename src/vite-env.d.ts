/// <reference types="vite/client" />
// Types Node pour le programme de l'app, qui embarque des tests (`node:fs`) et
// des fichiers de `convex/` (`process.env`). Référence ici plutôt que `types`
// dans tsconfig.json : Vercel compile middleware.ts avec un tsconfig temporaire
// qui étend le nôtre, où `types` se chercherait hors du dépôt (TS2688).
/// <reference types="node" />

/** Version de `package.json`, injectée au build (`define` de `vite.config.ts`). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_POSTHOG_HOST: string;
}
