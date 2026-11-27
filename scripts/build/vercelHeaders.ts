/**
 * En-têtes que `vercel.json` sert à un hôte donné, pour que `vite preview`
 * serve les mêmes que Vercel (#180). L'e2e tourne sur `vite preview` : sans
 * eux, une origine oubliée dans la CSP n'aurait cassé que la prod.
 *
 * Ne lit que les entrées qui couvrent tout le site (`/(.*)`) et dont les
 * conditions portent sur l'hôte. Une entrée à une autre condition (en-tête,
 * cookie, requête) est ignorée : on ne saurait pas dire si elle s'applique.
 */

type HostCondition = { type: string; value?: string };

type HeaderEntry = {
  source: string;
  has?: HostCondition[];
  missing?: HostCondition[];
  headers: { key: string; value: string }[];
};

type VercelConfig = { headers?: HeaderEntry[] };

const WHOLE_SITE = "/(.*)";

function appliesToHost(entry: HeaderEntry, host: string): boolean {
  const conditions = [...(entry.has ?? []), ...(entry.missing ?? [])];
  if (entry.source !== WHOLE_SITE) return false;
  if (conditions.some((condition) => condition.type !== "host")) return false;
  const hasMatches = (entry.has ?? []).every((c) => c.value === host);
  const missingMatches = (entry.missing ?? []).every((c) => c.value !== host);
  return hasMatches && missingMatches;
}

export function vercelHeadersForHost(
  config: VercelConfig,
  host: string,
): Record<string, string> {
  return Object.fromEntries(
    (config.headers ?? [])
      .filter((entry) => appliesToHost(entry, host))
      .flatMap((entry) => entry.headers.map(({ key, value }) => [key, value])),
  );
}
