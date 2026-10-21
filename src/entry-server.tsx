import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "@/App";

export { pageMeta, prerenderedPaths } from "@/app/pageMeta";

/**
 * Point d'entrée du pré-rendu (#139), utilisé par `scripts/build/prerender.ts`
 * au build. Mêmes composants que `main.tsx`, sans PostHog ni Vercel Analytics,
 * qui n'ont de sens que dans le navigateur.
 */
export function render(url: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}
