/**
 * `sitemap.xml` généré au build (#141) à partir des pages pré-rendues : il ne
 * peut pas oublier une page ni en lister une qui n'existe pas. Sans `lastmod` :
 * Google ne s'en sert que s'il est exact, et une date de build ne l'est pas.
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderSitemap(urls: readonly string[]): string {
  const entries = urls
    .map((url) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}
