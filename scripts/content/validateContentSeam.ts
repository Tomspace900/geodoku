/**
 * Garde du seam : `content/` est **terminal**.
 *
 * La règle (`AGENTS.md` §3) dit que le contenu n'importe rien de `src/`, de
 * `convex/` ni d'une feature, et que tout import y reste relatif au dossier.
 * Elle n'était vérifiée par rien : `tsx` et Vite résolvent l'alias `@/`, et
 * seuls les fichiers de `content/` que Convex importe transitivement passaient
 * sous le typecheck sans `paths`. Un `@/…` dans `catalog.ts`, `facts.ts` ou
 * `derivations.ts` traversait donc la CI entière en vert — et `catalog.ts` est
 * dans le bundle joueur.
 *
 * Ne sont pas policés les imports **bare** (`vitest` dans les tests) : ce sont
 * des paquets, pas du code du projet.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { posix, resolve, sep } from "node:path";

const CONTENT_ROOT = "content";

/** `import … from "x"`, `export … from "x"`, `import("x")`. */
const SPECIFIER = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

/**
 * Violations du seam pour un module, à chemin **relatif à la racine du dépôt**
 * et en séparateurs POSIX (`content/constraints/derivations.ts`).
 */
export function contentSeamViolations(
  relativePath: string,
  source: string,
): string[] {
  const dir = posix.dirname(relativePath);
  const violations: string[] = [];

  for (const match of source.matchAll(SPECIFIER)) {
    const specifier = match[1];
    if (specifier.startsWith("@/")) {
      violations.push(
        `${relativePath}: import via l'alias « ${specifier} » — content/ est terminal, n'importer que du relatif interne`,
      );
      continue;
    }
    if (!specifier.startsWith(".")) continue;

    const target = posix.normalize(posix.join(dir, specifier));
    if (target !== CONTENT_ROOT && !target.startsWith(`${CONTENT_ROOT}/`)) {
      violations.push(
        `${relativePath}: import hors de content/ (« ${specifier} ») — content/ est terminal`,
      );
    }
  }

  return violations;
}

function collectModules(dir: string, acc: string[]): string[] {
  readdirSync(dir).forEach((name) => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      collectModules(full, acc);
    } else if (name.endsWith(".ts")) {
      acc.push(full);
    }
  });
  return acc;
}

/** Applique `contentSeamViolations` à tous les modules de `<root>/content/`. */
export function validateContentSeam(root: string): string[] {
  const contentDir = resolve(root, CONTENT_ROOT);
  return collectModules(contentDir, []).flatMap((absolute) => {
    const relative = `${CONTENT_ROOT}/${absolute
      .slice(contentDir.length + 1)
      .split(sep)
      .join("/")}`;
    return contentSeamViolations(relative, readFileSync(absolute, "utf8"));
  });
}
