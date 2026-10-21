import type { PageMeta } from "../../src/app/pageMeta.ts";

/**
 * Réécrit l'en-tête d'`index.html` pour une page pré-rendue (#140) : langue,
 * titre, description, Open Graph, canonical, `hreflang` et, sur l'accueil,
 * données structurées. Chaque balise doit exister une fois et une seule dans
 * le gabarit : sinon le build échoue, plutôt que de publier une page au
 * canonical d'une autre.
 */

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ESCAPES[char] ?? char);
}

function replaceOnce(
  html: string,
  pattern: RegExp,
  replacement: string,
): string {
  const matches = html.match(new RegExp(pattern.source, "g")) ?? [];
  if (matches.length !== 1) {
    throw new Error(
      `[prerender] ${matches.length} correspondance(s) pour ${pattern} dans index.html, 1 attendue.`,
    );
  }
  return html.replace(pattern, () => replacement);
}

function metaTag(attribute: "name" | "property", key: string): RegExp {
  return new RegExp(
    `<meta\\s+${attribute}="${key.replace(/:/g, "\\:")}"\\s+content="[^"]*"\\s*/>`,
  );
}

/**
 * JSON-LD inséré dans un `<script>` : `<` échappé, pour qu'aucune chaîne ne
 * puisse fermer la balise.
 */
function structuredDataScript(data: PageMeta["structuredData"]): string {
  if (data === null) return "";
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>\n  `;
}

/**
 * Gabarit des routes non pré-rendues (`app-shell.html`, `404.html`) : son
 * en-tête est celui d'`index.html`, canonical compris, et ne décrit aucune
 * page réelle. On le soustrait à l'index.
 */
export function withNoindex(html: string): string {
  return replaceOnce(
    html,
    /<\/head>/,
    `  <meta name="robots" content="noindex" />\n  </head>`,
  );
}

export function applyPageHead(html: string, meta: PageMeta): string {
  const content = (value: string) => `content="${escapeAttribute(value)}"`;
  const alternates = meta.alternates
    .map(
      (alternate) =>
        `<link rel="alternate" hreflang="${alternate.hreflang}" href="${escapeAttribute(alternate.href)}" />`,
    )
    .join("\n    ");

  const replacements: Array<[RegExp, string]> = [
    [/<html lang="[^"]*">/, `<html lang="${meta.locale}">`],
    [/<title>[^<]*<\/title>/, `<title>${escapeAttribute(meta.title)}</title>`],
    [
      metaTag("name", "description"),
      `<meta name="description" ${content(meta.description)} />`,
    ],
    [
      metaTag("property", "og:title"),
      `<meta property="og:title" ${content(meta.title)} />`,
    ],
    [
      metaTag("property", "og:description"),
      `<meta property="og:description" ${content(meta.description)} />`,
    ],
    [
      metaTag("property", "og:url"),
      `<meta property="og:url" ${content(meta.canonical)} />`,
    ],
    [
      metaTag("property", "og:locale"),
      `<meta property="og:locale" ${content(meta.ogLocale)} />`,
    ],
    [
      metaTag("property", "og:locale:alternate"),
      `<meta property="og:locale:alternate" ${content(meta.ogLocaleAlternate)} />`,
    ],
    [
      metaTag("name", "twitter:title"),
      `<meta name="twitter:title" ${content(meta.title)} />`,
    ],
    [
      metaTag("name", "twitter:description"),
      `<meta name="twitter:description" ${content(meta.description)} />`,
    ],
    [
      metaTag("property", "og:image:alt"),
      `<meta property="og:image:alt" ${content(meta.imageAlt)} />`,
    ],
    [
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" />\n    ${alternates}`,
    ],
  ];

  const head = replacements.reduce(
    (result, [pattern, replacement]) =>
      replaceOnce(result, pattern, replacement),
    html,
  );
  return replaceOnce(
    head,
    /<\/head>/,
    `${structuredDataScript(meta.structuredData)}  </head>`,
  );
}
