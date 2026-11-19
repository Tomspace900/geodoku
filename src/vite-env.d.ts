/// <reference types="vite/client" />

/** Version de `package.json`, injectée au build (`define` de `vite.config.ts`). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  readonly VITE_POSTHOG_HOST: string;
}
