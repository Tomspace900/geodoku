/**
 * Récolte les libellés fr/en des capitales sur Wikidata (SPARQL) et écrit
 * `scripts/countries/data/capitalLabels.ts`. Réseau requis ; le résultat est
 * committé, `build-countries` ne fait que le fusionner (hors-ligne).
 *
 * La liste des capitales est celle de `content/countries/facts.ts` (REST
 * Countries) : la récolte traduit, elle n'ajoute ni ne retire rien. Les noms
 * sans libellé exploitable sont listés et le script échoue : il faut alors les
 * poser dans `overrides`, avec leur motif.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTRY_FACTS } from "../../../content/countries/facts.ts";
import type { CapitalLabelsSnapshot } from "../data/types.ts";
import {
  buildCapitalLabelsQuery,
  buildKosovoQuery,
  KOSOVO_ISO3,
  matchCapitalLabels,
  parseCapitalRows,
  renderCapitalLabelsModule,
  type SparqlResponse,
} from "./capitalLabelsLib.ts";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "Geodoku/0.1 (https://github.com/Tomspace900/geodoku; capital labels harvest)";
const OUTPUT_PATH = resolve(import.meta.dirname, "../data/capitalLabels.ts");

async function runSparql(query: string): Promise<SparqlResponse> {
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });
  if (!response.ok) {
    throw new Error(`Wikidata SPARQL: HTTP ${response.status}`);
  }
  return (await response.json()) as SparqlResponse;
}

async function previousOverrides(): Promise<
  CapitalLabelsSnapshot["overrides"]
> {
  try {
    const module = (await import("../data/capitalLabels.ts")) as {
      CAPITAL_LABELS: CapitalLabelsSnapshot;
    };
    return module.CAPITAL_LABELS.overrides;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const sourceNames = Object.fromEntries(
    Object.entries(COUNTRY_FACTS).map(([iso3, facts]) => [
      iso3,
      facts.capitals.map((capital) => capital.name),
    ]),
  );
  const iso3Codes = Object.keys(sourceNames).filter(
    (code) => code !== KOSOVO_ISO3,
  );

  const [main, kosovo] = await Promise.all([
    runSparql(buildCapitalLabelsQuery(iso3Codes)),
    runSparql(buildKosovoQuery()),
  ]);
  const rows = [
    ...parseCapitalRows(main),
    ...parseCapitalRows(kosovo, KOSOVO_ISO3),
  ];

  const overrides = await previousOverrides();
  const { labels, unresolved } = matchCapitalLabels(
    sourceNames,
    rows,
    overrides,
  );

  const snapshot: CapitalLabelsSnapshot = {
    harvestedAt: new Date().toISOString().slice(0, 10),
    labels,
    overrides,
  };
  writeFileSync(OUTPUT_PATH, renderCapitalLabelsModule(snapshot));
  console.log(
    `[capitalLabels] ${Object.values(labels).reduce((n, c) => n + Object.keys(c).length, 0)} libellés récoltés, ${unresolved.length} à traiter en override.`,
  );

  if (unresolved.length > 0) {
    unresolved.forEach(({ iso3, name, reason }) => {
      console.error(`  ${iso3} « ${name} » — ${reason}`);
    });
    process.exitCode = 1;
  }
}

await main();
