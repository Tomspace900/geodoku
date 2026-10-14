/**
 * Logique pure de la récolte des points culminants (`highestPoints.ts`) :
 * lecture du texte du Factbook, requête Wikidata, correspondance par altitude.
 * Séparée du script pour être testable sans réseau.
 */
import type {
  HighestPointEntry,
  HighestPointLabel,
  HighestPointOverride,
  HighestPointsSnapshot,
} from "../data/types.ts";

export type ParsedHighestPoint = {
  sourceName: string;
  elevationM: number;
  /** `false` quand le Factbook ne nomme pas le point (« unnamed elevation … »). */
  named: boolean;
};

const UNNAMED = /^unnamed\b/i;
const NAME_AND_ELEVATION = /^(.*\S)\s+(\d[\d,]*(?:\.\d+)?)\s*(?:m)?$/;

/**
 * Lit « Mont Blanc 4,810 » en nom et altitude. Le texte du Factbook est plus
 * sale que cela : unité absente, parenthèses (avant ou après l'altitude), notes
 * après `;` ou `<br>`, point sans nom, position au lieu d'un nom. L'altitude est
 * le dernier nombre du texte une fois ces ajouts retirés.
 */
export function parseHighestPointText(text: string): ParsedHighestPoint | null {
  // Les parenthèses partent d'abord : elles peuvent contenir un « ; ».
  const main = text.replace(/\([^)]*\)/g, " ").split(/<br\s*\/?>|;/i)[0] ?? "";
  const cleaned = main.replace(/\s+/g, " ").trim();
  const match = NAME_AND_ELEVATION.exec(cleaned);
  if (!match) return null;
  const elevationM = Number(match[2].replace(/,/g, ""));
  if (!Number.isFinite(elevationM)) return null;
  const sourceName = match[1].replace(/[\s,]+$/, "");
  return { sourceName, elevationM, named: !UNNAMED.test(sourceName) };
}

/**
 * Codes GEC (FIPS 10-4) que `P901` ne donne pas, ou que le Factbook découpe.
 * Le Factbook scinde la Palestine en Cisjordanie (`we`) et Gaza (`gz`) : on
 * retient le plus haut des deux.
 */
export const GEC_FALLBACK: Readonly<
  Record<string, { gec: readonly string[]; reason: string }>
> = {
  NLD: { gec: ["nl"], reason: "pas de P901 exploitable sur Wikidata" },
  XKX: { gec: ["kv"], reason: "le Kosovo n'a pas de P298 sur Wikidata" },
  PSE: {
    gec: ["we", "gz"],
    reason:
      "le Factbook découpe la Palestine en Cisjordanie et Gaza : on prend le plus haut des deux",
  },
};

/** Le Kosovo n'a pas de `P298` : il se récolte par son identifiant. */
export const KOSOVO_ISO3 = "XKX";
export const KOSOVO_QID = "Q1246";

/**
 * Tolérance de reconnaissance d'un sommet par son altitude : Wikidata porte
 * plusieurs mesures par sommet (Mont Blanc 4 805–4 810 m, Damavand 5 610–5 628 m)
 * et le Factbook arrondit au mètre. 25 m absorbe ces écarts de mesure sans
 * confondre deux sommets distincts d'un même pays ; tout écart au-delà passe
 * en revue (override motivé).
 */
export const ELEVATION_TOLERANCE_M = 25;

const PEAK_SELECT = `?iso3 ?gec ?peak ?fr ?en ?elev`;
const PEAK_OPTIONALS = `OPTIONAL { ?peak rdfs:label ?fr FILTER(lang(?fr) = "fr") }
    OPTIONAL { ?peak rdfs:label ?en FILTER(lang(?en) = "en") }
    OPTIONAL { ?peak p:P2044/psn:P2044/wikibase:quantityAmount ?elev }`;

export function buildHighestPointsQuery(iso3Codes: readonly string[]): string {
  const values = iso3Codes.map((code) => `"${code}"`).join(" ");
  return `SELECT ${PEAK_SELECT} WHERE {
  VALUES ?iso3 { ${values} }
  ?country wdt:P298 ?iso3 .
  OPTIONAL { ?country wdt:P901 ?gec }
  OPTIONAL { ?country wdt:P610 ?peak .
    ${PEAK_OPTIONALS} }
}`;
}

export function buildKosovoPeakQuery(): string {
  return `SELECT ?peak ?fr ?en ?elev WHERE {
  wd:${KOSOVO_QID} wdt:P610 ?peak .
  ${PEAK_OPTIONALS}
}`;
}

type SparqlBinding = Record<string, { value: string } | undefined>;
export type SparqlResponse = { results: { bindings: SparqlBinding[] } };

export type WikidataPeak = {
  qid: string;
  fr: string | null;
  en: string | null;
  /** Toutes les mesures d'altitude de Wikidata, en mètres. */
  elevations: number[];
};

export type WikidataCountry = {
  gec: string[];
  peaks: WikidataPeak[];
};

function qidFromUri(uri: string): string {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

/** Regroupe les lignes SPARQL par pays, puis par sommet (une ligne par mesure). */
export function parseWikidataPeaks(
  response: SparqlResponse,
  fallbackIso3?: string,
): Record<string, WikidataCountry> {
  const countries: Record<string, WikidataCountry> = {};
  response.results.bindings.forEach((binding) => {
    const iso3 = binding.iso3?.value ?? fallbackIso3;
    if (!iso3) return;
    countries[iso3] ??= { gec: [], peaks: [] };
    const country = countries[iso3];
    const gec = binding.gec?.value.toLowerCase();
    if (gec && !country.gec.includes(gec)) country.gec.push(gec);
    const uri = binding.peak?.value;
    if (!uri) return;
    const qid = qidFromUri(uri);
    let peak = country.peaks.find((candidate) => candidate.qid === qid);
    if (!peak) {
      peak = {
        qid,
        fr: binding.fr?.value ?? null,
        en: binding.en?.value ?? null,
        elevations: [],
      };
      country.peaks.push(peak);
    }
    const elevation = Number(binding.elev?.value);
    if (binding.elev && Number.isFinite(elevation)) {
      peak.elevations.push(elevation);
    }
  });
  return countries;
}

const APOSTROPHE_LIKE = /[ʻʼ’‘`′ʹ]/g;

/** Forme de comparaison d'un nom : sans accents, minuscules, apostrophes droites. */
export function normalizePeakName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(APOSTROPHE_LIKE, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function distanceToElevation(peak: WikidataPeak, elevationM: number): number {
  return peak.elevations.length === 0
    ? Number.POSITIVE_INFINITY
    : Math.min(...peak.elevations.map((value) => Math.abs(value - elevationM)));
}

export type HighestPointFamily = "graphie" | "identique" | "sans_nom";

export type PeakMatch =
  | { kind: "matched"; peak: WikidataPeak & { fr: string; en: string } }
  | { kind: "unnamed" }
  | { kind: "unresolved"; reason: string };

/**
 * Reconnaît le sommet du Factbook parmi les `P610` du pays **par l'altitude**,
 * pas par le nom (le Factbook retire les diacritiques : 74 noms sur ~190 ne
 * rejoignent pas le libellé anglais de Wikidata). Plusieurs sommets dans la
 * tolérance : le nom les départage, sinon la revue tranche.
 */
export function matchHighestPoint(
  parsed: ParsedHighestPoint,
  peaks: readonly WikidataPeak[],
): PeakMatch {
  if (!parsed.named) return { kind: "unnamed" };
  const near = peaks.filter(
    (peak) =>
      distanceToElevation(peak, parsed.elevationM) <= ELEVATION_TOLERANCE_M,
  );
  const wanted = normalizePeakName(parsed.sourceName);
  const byName = near.filter((peak) =>
    [peak.fr, peak.en].some(
      (label) => label && normalizePeakName(label) === wanted,
    ),
  );
  const candidates = byName.length > 0 ? byName : near;
  if (candidates.length === 0) {
    const known = peaks
      .map((peak) => `${peak.en ?? peak.qid} ${peak.elevations.join("/")} m`)
      .join(" ; ");
    return {
      kind: "unresolved",
      reason: `aucun sommet Wikidata à ±${ELEVATION_TOLERANCE_M} m de ${parsed.elevationM} m (P610 : ${known || "aucun"})`,
    };
  }
  if (candidates.length > 1) {
    return {
      kind: "unresolved",
      reason: `plusieurs sommets Wikidata dans la tolérance (${candidates.map((peak) => peak.qid).join(", ")})`,
    };
  }
  const [peak] = candidates;
  if (!peak.fr || !peak.en) {
    return {
      kind: "unresolved",
      reason: `libellé fr ou en absent sur Wikidata (${peak.qid})`,
    };
  }
  return { kind: "matched", peak: { ...peak, fr: peak.fr, en: peak.en } };
}

export type FactbookPoint = ParsedHighestPoint & { gec: string };

/** Plus haut des points d'un pays dont le Factbook est découpé (Palestine). */
export function highestOf(points: readonly FactbookPoint[]): FactbookPoint {
  return points.reduce((best, point) =>
    point.elevationM > best.elevationM ? point : best,
  );
}

export type HighestPointsResult = {
  points: Record<string, HighestPointEntry>;
  /** Pays sans libellé exploitable et sans override. */
  unresolved: { iso3: string; sourceName: string; reason: string }[];
};

export function buildHighestPoints(
  factbook: Readonly<Record<string, FactbookPoint>>,
  wikidata: Readonly<Record<string, WikidataCountry>>,
  overrides: Readonly<Record<string, HighestPointOverride>>,
): HighestPointsResult {
  const points: HighestPointsResult["points"] = {};
  const unresolved: HighestPointsResult["unresolved"] = [];
  Object.entries(factbook).forEach(([iso3, point]) => {
    const match = matchHighestPoint(point, wikidata[iso3]?.peaks ?? []);
    const base = { sourceName: point.sourceName, elevationM: point.elevationM };
    if (match.kind === "matched") {
      points[iso3] = {
        ...base,
        label: { fr: match.peak.fr, en: match.peak.en },
        wikidata: match.peak.qid,
      };
      return;
    }
    points[iso3] = { ...base, label: null, wikidata: null };
    if (match.kind === "unresolved" && !overrides[iso3]) {
      unresolved.push({
        iso3,
        sourceName: point.sourceName,
        reason: match.reason,
      });
    }
  });
  return { points, unresolved };
}

/** Libellé retenu : l'override curé d'abord, la récolte ensuite. */
export function effectiveLabel(
  iso3: string,
  snapshot: Pick<HighestPointsSnapshot, "points" | "overrides">,
): HighestPointLabel | null {
  const override = snapshot.overrides[iso3];
  return override ? override.label : (snapshot.points[iso3]?.label ?? null);
}

/** Famille de correspondance pour le dossier de gate. */
export function highestPointFamily(
  entry: HighestPointEntry,
  override: HighestPointOverride | undefined,
): HighestPointFamily | "override" {
  if (override) return "override";
  if (!entry.label) return "sans_nom";
  const wanted = normalizePeakName(entry.sourceName);
  const same = [entry.label.fr, entry.label.en].some(
    (label) => normalizePeakName(label) === wanted,
  );
  return same ? "identique" : "graphie";
}

/** Sérialise le dataset (le fichier est ensuite normalisé par Biome). */
export function renderHighestPointsModule(
  snapshot: HighestPointsSnapshot,
): string {
  return `import type { HighestPointsSnapshot } from "./types";

/**
 * Points culminants — altitude et nom : [CIA World Factbook, *Elevation › highest
 * point*](https://www.cia.gov/the-world-factbook/field/elevation/), via le miroir
 * figé \`factbook.json\` (même commit que \`sovereignty.ts\`). Libellés fr/en :
 * Wikidata (\`P610\`, \`rdfs:label\`), le sommet étant reconnu par son altitude.
 * Récolté par \`scripts/countries/harvest/highestPoints.ts\`
 * (\`pnpm harvest:highest-points\`).
 *
 * \`points\` est **généré** : ne pas l'éditer à la main. \`overrides\` est curé,
 * chaque entrée avec son motif ; il est préservé à chaque récolte et l'emporte
 * sur \`points[].label\`. L'altitude est celle du Factbook, sauf override \`peak\`
 * (autre sommet retenu, source de l'altitude dans le motif).
 *
 * \`label: null\` = point sans nom (ou donné par une position, pas un nom).
 */
export const HIGHEST_POINTS: HighestPointsSnapshot = ${JSON.stringify(snapshot, null, 2)};
`;
}
