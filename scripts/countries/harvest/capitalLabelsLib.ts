/**
 * Logique pure de la récolte des libellés de capitales (`capitalLabels.ts`) :
 * requête SPARQL, lecture de la réponse, correspondance des noms. Séparée du
 * script pour être testable sans réseau.
 */
import type {
  CapitalLabel,
  CapitalLabelOverride,
  CapitalLabelsSnapshot,
} from "../data/types.ts";

export type WikidataCapitalRow = {
  iso3: string;
  qid: string;
  fr: string | null;
  en: string | null;
};

type SparqlBinding = Record<string, { value: string } | undefined>;

export type SparqlResponse = {
  results: { bindings: SparqlBinding[] };
};

/** Le Kosovo n'a pas de `P298` : il se récolte par son identifiant. */
export const KOSOVO_ISO3 = "XKX";
export const KOSOVO_QID = "Q1246";

const CAPITAL_LABELS_SELECT = `?iso3 ?capital ?fr ?en`;
const LABEL_OPTIONALS = `OPTIONAL { ?capital rdfs:label ?fr FILTER(lang(?fr) = "fr") }
  OPTIONAL { ?capital rdfs:label ?en FILTER(lang(?en) = "en") }`;

/**
 * Même requête que celle validée sur `query.wikidata.org`, bornée aux codes du
 * jeu par `VALUES` : non bornée, elle dépasse le délai de 60 s du service.
 */
export function buildCapitalLabelsQuery(iso3Codes: readonly string[]): string {
  const values = iso3Codes.map((code) => `"${code}"`).join(" ");
  return `SELECT ${CAPITAL_LABELS_SELECT} WHERE {
  VALUES ?iso3 { ${values} }
  ?country wdt:P298 ?iso3 ; wdt:P36 ?capital .
  ${LABEL_OPTIONALS}
}`;
}

export function buildKosovoQuery(): string {
  return `SELECT ?capital ?fr ?en WHERE {
  wd:${KOSOVO_QID} wdt:P36 ?capital .
  ${LABEL_OPTIONALS}
}`;
}

function qidFromUri(uri: string): string {
  return uri.slice(uri.lastIndexOf("/") + 1);
}

export function parseCapitalRows(
  response: SparqlResponse,
  fallbackIso3?: string,
): WikidataCapitalRow[] {
  return response.results.bindings.flatMap((binding) => {
    const iso3 = binding.iso3?.value ?? fallbackIso3;
    const capital = binding.capital?.value;
    if (!iso3 || !capital) return [];
    return [
      {
        iso3,
        qid: qidFromUri(capital),
        fr: binding.fr?.value ?? null,
        en: binding.en?.value ?? null,
      },
    ];
  });
}

const APOSTROPHE_LIKE = /[ʻʼ’‘`′ʹ]/g;

/**
 * Forme de comparaison d'un nom de ville : NFD sans accents, minuscules,
 * apostrophes typographiques ramenées à l'apostrophe droite.
 */
export function normalizeCityName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(APOSTROPHE_LIKE, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type SourceCapitalNames = Readonly<Record<string, readonly string[]>>;

export type CapitalMatchResult = {
  labels: Record<string, Record<string, CapitalLabel>>;
  /** Noms source sans libellé fr+en exploitable, hors overrides. */
  unresolved: { iso3: string; name: string; reason: string }[];
};

/**
 * Rapproche chaque nom source d'une capitale Wikidata du même pays, par
 * libellé anglais normalisé. Ne traduit que ce qui existe déjà : une capitale
 * Wikidata sans nom source correspondant est ignorée, jamais ajoutée.
 */
export function matchCapitalLabels(
  sourceNames: SourceCapitalNames,
  rows: readonly WikidataCapitalRow[],
  overrides: CapitalLabelsSnapshot["overrides"],
): CapitalMatchResult {
  const labels: CapitalMatchResult["labels"] = {};
  const unresolved: CapitalMatchResult["unresolved"] = [];

  Object.entries(sourceNames).forEach(([iso3, names]) => {
    const countryRows = rows.filter((row) => row.iso3 === iso3);
    names.forEach((name) => {
      if (overrides[iso3]?.[name]) return;
      const wanted = normalizeCityName(name);
      const matches = countryRows.filter(
        (row) => row.en !== null && normalizeCityName(row.en) === wanted,
      );
      const match = matches[0];
      if (!match) {
        unresolved.push({
          iso3,
          name,
          reason: "aucune capitale Wikidata au libellé anglais correspondant",
        });
        return;
      }
      if (new Set(matches.map((row) => row.qid)).size > 1) {
        unresolved.push({
          iso3,
          name,
          reason: `plusieurs capitales Wikidata correspondent (${matches.map((row) => row.qid).join(", ")})`,
        });
        return;
      }
      if (!match.fr || !match.en) {
        unresolved.push({
          iso3,
          name,
          reason: `libellé fr absent sur Wikidata (${match.qid})`,
        });
        return;
      }
      labels[iso3] = {
        ...labels[iso3],
        [name]: { fr: match.fr, en: match.en },
      };
    });
  });

  return { labels, unresolved };
}

/** Sérialise le dataset (le fichier est ensuite normalisé par Biome). */
export function renderCapitalLabelsModule(
  snapshot: CapitalLabelsSnapshot,
): string {
  return `import type { CapitalLabelsSnapshot } from "./types";

/**
 * Libellés fr/en des capitales — Wikidata (\`P36\`, \`rdfs:label\`), récoltés par
 * \`scripts/countries/harvest/capitalLabels.ts\` (\`pnpm harvest:capitals\`).
 *
 * \`labels\` est **généré** : ne pas l'éditer à la main. \`overrides\` est curé, chaque
 * entrée avec son motif ; il est préservé à chaque récolte et l'emporte sur \`labels\`.
 * La liste des capitales reste celle de REST Countries, ce dataset ne fait que la
 * traduire (indexé par ISO3 puis par nom source).
 */
export const CAPITAL_LABELS: CapitalLabelsSnapshot = ${JSON.stringify(snapshot, null, 2)};
`;
}

export type { CapitalLabelOverride };
