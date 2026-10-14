/**
 * Récolte les points culminants : altitude et nom du CIA World Factbook
 * (miroir `factbook.json`, commit figé), libellés fr/en Wikidata. Écrit
 * `scripts/countries/data/highestPoints.ts`. Réseau requis ; le résultat est
 * committé, `build-countries` ne fait que le fusionner (hors-ligne).
 *
 * Les pays sans libellé exploitable sont listés et le script échoue : il faut
 * alors les poser dans `overrides`, avec leur motif.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { COUNTRY_FACTS } from "../../../content/countries/facts.ts";
import { SOVEREIGNTY } from "../data/sovereignty.ts";
import type { HighestPointsSnapshot } from "../data/types.ts";
import { harvestVintage } from "./capitalLabelsLib.ts";
import {
  buildHighestPoints,
  buildHighestPointsQuery,
  buildKosovoPeakQuery,
  type FactbookPoint,
  GEC_FALLBACK,
  highestOf,
  KOSOVO_ISO3,
  parseHighestPointText,
  parseWikidataPeaks,
  renderHighestPointsModule,
  type SparqlResponse,
} from "./highestPointsLib.ts";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT =
  "Geodoku/0.1 (https://github.com/Tomspace900/geodoku; highest points harvest)";
const FACTBOOK_COMMIT = SOVEREIGNTY.sourceCommit;
const FACTBOOK_RAW = `https://raw.githubusercontent.com/factbook/factbook.json/${FACTBOOK_COMMIT}`;
const FACTBOOK_TREE = `https://api.github.com/repos/factbook/factbook.json/git/trees/${FACTBOOK_COMMIT}?recursive=1`;
const OUTPUT_PATH = resolve(import.meta.dirname, "../data/highestPoints.ts");

async function fetchOk(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function runSparql(query: string): Promise<SparqlResponse> {
  const url = `${SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetchOk(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/sparql-results+json",
    },
  });
  return (await response.json()) as SparqlResponse;
}

/** `<région>/<gec>.json` du miroir, indexé par code GEC (hors `meta/`). */
async function factbookPaths(): Promise<Record<string, string>> {
  const tree = (await (await fetchOk(FACTBOOK_TREE)).json()) as {
    truncated: boolean;
    tree: { path: string }[];
  };
  if (tree.truncated) throw new Error("arbre Factbook tronqué par GitHub");
  return Object.fromEntries(
    tree.tree.flatMap(({ path }) => {
      const match = /^(?!meta\/)[a-z-]+\/([a-z]{2})\.json$/.exec(path);
      return match ? [[match[1], path]] : [];
    }),
  );
}

async function factbookHighestPoint(
  path: string,
  gec: string,
): Promise<FactbookPoint> {
  const document = (await (
    await fetchOk(`${FACTBOOK_RAW}/${path}`)
  ).json()) as {
    Geography?: { Elevation?: { "highest point"?: { text?: string } } };
  };
  const text = document.Geography?.Elevation?.["highest point"]?.text;
  const parsed = text ? parseHighestPointText(text) : null;
  if (!parsed) {
    throw new Error(
      `${path}: point culminant illisible (${JSON.stringify(text)})`,
    );
  }
  return { ...parsed, gec };
}

async function previousOverrides(): Promise<
  HighestPointsSnapshot["overrides"]
> {
  try {
    const module = (await import("../data/highestPoints.ts")) as {
      HIGHEST_POINTS: HighestPointsSnapshot;
    };
    return module.HIGHEST_POINTS.overrides;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
      return {};
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const iso3Codes = Object.keys(COUNTRY_FACTS);
  const [main, kosovo, paths] = await Promise.all([
    runSparql(
      buildHighestPointsQuery(iso3Codes.filter((c) => c !== KOSOVO_ISO3)),
    ),
    runSparql(buildKosovoPeakQuery()),
    factbookPaths(),
  ]);
  const wikidata = {
    ...parseWikidataPeaks(main),
    ...parseWikidataPeaks(kosovo, KOSOVO_ISO3),
  };

  const factbook: Record<string, FactbookPoint> = {};
  await Promise.all(
    iso3Codes.map(async (iso3) => {
      const gecs = GEC_FALLBACK[iso3]?.gec ?? wikidata[iso3]?.gec ?? [];
      if (gecs.length === 0) {
        throw new Error(`${iso3}: aucun code GEC — l'ajouter à GEC_FALLBACK`);
      }
      const points = await Promise.all(
        gecs.map((gec) => {
          const path = paths[gec];
          if (!path)
            throw new Error(`${iso3}: pas de fichier Factbook « ${gec} »`);
          return factbookHighestPoint(path, gec);
        }),
      );
      factbook[iso3] = highestOf(points);
    }),
  );

  const overrides = await previousOverrides();
  const { points, unresolved } = buildHighestPoints(
    factbook,
    wikidata,
    overrides,
  );
  const sortedPoints = Object.fromEntries(
    Object.entries(points).sort(([a], [b]) => a.localeCompare(b)),
  );
  const snapshot: HighestPointsSnapshot = {
    factbookCommit: FACTBOOK_COMMIT,
    harvestedAt: new Date().toISOString().slice(0, 10),
    points: sortedPoints,
    overrides,
  };
  writeFileSync(OUTPUT_PATH, renderHighestPointsModule(snapshot));
  console.log(
    `[highestPoints] ${Object.keys(points).length} pays, ${unresolved.length} à traiter en override.`,
  );

  const vintage = harvestVintage(snapshot.harvestedAt);
  console.log(
    `[highestPoints] millésime à reporter dans content/sources.ts (wikidata_highest_point_labels.vintage) :\n  vintage: { fr: ${JSON.stringify(vintage.fr)}, en: ${JSON.stringify(vintage.en)} },`,
  );

  if (unresolved.length > 0) {
    unresolved.forEach(({ iso3, sourceName, reason }) => {
      console.error(`  ${iso3} « ${sourceName} » — ${reason}`);
    });
    process.exitCode = 1;
  }
}

await main();
