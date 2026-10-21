/**
 * Pré-rendu des pages publiques (#139), appelé par le plugin `geodoku-prerender`
 * de `vite.config.ts` à la fin de chaque `vite build`.
 *
 * 1. Build SSR de `src/entry-server.tsx` avec la même config Vite.
 * 2. Pour chaque page et chaque langue : HTML rendu par React, injecté dans le
 *    `<div id="root">` d'`index.html` (CSS et scripts hashés déjà en place),
 *    et en-tête réécrit (`applyPageHead`).
 * 3. Un fichier par page, au format `cleanUrls` de Vercel : `fr.html`,
 *    `fr/privacy.html`, `en.html`, `en/privacy.html`…
 *
 * 4. `sitemap.xml`, généré depuis ces mêmes pages (#141).
 *
 * Les adresses sans langue (`/`, `/about`…) n'ont pas de fichier : le
 * middleware Vercel les redirige vers la langue du visiteur (#140).
 * `index.html` reste le gabarit, servi seulement si ce middleware manque.
 *
 * Les routes du SPA non pré-rendues (`/fr/archive`, `/admin`) sont réécrites vers
 * `app-shell.html` (`vercel.json`), le gabarit vide d'origine : leur servir
 * l'accueil pré-rendu ferait clignoter l'accueil avant la vraie page. Toute
 * autre adresse reçoit `404.html`, le même gabarit servi avec un vrai statut
 * 404 (#141) : le joueur est renvoyé vers l'accueil par le SPA, un robot voit
 * une page inexistante. Le client garde `createRoot().render()` : React
 * remplace le HTML pré-rendu par un rendu identique.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import type { PageMeta } from "../../src/app/pageMeta.ts";
import { applyPageHead } from "./pageHead.ts";
import { renderSitemap } from "./sitemap.ts";

const ROOT_PLACEHOLDER = '<div id="root"></div>';
export const APP_SHELL = "app-shell.html";
const NOT_FOUND = "404.html";
const SITEMAP = "sitemap.xml";

type ServerEntry = {
  render: (url: string) => string;
  pageMeta: (url: string) => PageMeta;
  prerenderedPaths: () => string[];
};

type PrerenderOptions = {
  root: string;
  outDir: string;
  configFile: string | undefined;
};

/** `/fr` → `fr.html`, `/en/privacy` → `en/privacy.html`. */
export function outputFileFor(path: string): string {
  return path === "/" ? "index.html" : `${path.slice(1)}.html`;
}

export async function prerender({
  root,
  outDir,
  configFile,
}: PrerenderOptions): Promise<void> {
  const ssrOutDir = join(root, "node_modules/.cache/geodoku-ssr");
  await build({
    configFile,
    logLevel: "warn",
    build: {
      ssr: "src/entry-server.tsx",
      outDir: ssrOutDir,
      emptyOutDir: true,
      copyPublicDir: false,
    },
  });

  const server = (await import(
    pathToFileURL(join(ssrOutDir, "entry-server.js")).href
  )) as ServerEntry;

  try {
    const template = readFileSync(join(outDir, "index.html"), "utf8");
    if (!template.includes(ROOT_PLACEHOLDER)) {
      throw new Error(
        `[prerender] ${ROOT_PLACEHOLDER} introuvable dans index.html`,
      );
    }
    writeFileSync(join(outDir, APP_SHELL), template);
    writeFileSync(join(outDir, NOT_FOUND), template);

    const paths = server.prerenderedPaths();
    paths.forEach((path) => {
      const file = join(outDir, outputFileFor(path));
      const html = applyPageHead(template, server.pageMeta(path)).replace(
        ROOT_PLACEHOLDER,
        () => `<div id="root">${server.render(path)}</div>`,
      );
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
    });
    writeFileSync(
      join(outDir, SITEMAP),
      renderSitemap(paths.map((path) => server.pageMeta(path).canonical)),
    );
    console.log(
      `[prerender] ${paths.join(", ")} + ${APP_SHELL}, ${NOT_FOUND}, ${SITEMAP}`,
    );
  } finally {
    rmSync(ssrOutDir, { recursive: true, force: true });
  }
}
