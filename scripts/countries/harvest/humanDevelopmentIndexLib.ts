/**
 * Logique pure de la récolte de l'indice de développement humain (PNUD) :
 * décodage et lecture du CSV, construction du dataset, millésime, sérialisation.
 * Aucun accès réseau ici — le script `humanDevelopmentIndex.ts` fait le fetch,
 * ce module se teste hors-ligne.
 */
import {
  type HumanDevelopmentCategory,
  humanDevelopmentCategory,
} from "../../../content/countries/humanDevelopment.ts";
import type { LocalizedString } from "../../../content/type.ts";
import type {
  HumanDevelopmentIndexSnapshot,
  HumanDevelopmentMissingCause,
  HumanDevelopmentValue,
} from "../data/types.ts";

/**
 * Édition épinglée : on ne scrape pas la page du data center pour trouver la
 * dernière. Une nouvelle édition = ces trois constantes, relues en diff, puis
 * `pnpm harvest:hdi`.
 */
export const HDR_EDITION = 2025;
/** Dernière année de données de l'édition (colonne `hdi_<année>`). */
export const HDR_DATA_YEAR = 2023;
export const HDR_CSV_URL =
  "https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv";

/** Le fichier n'est pas en UTF-8 : le décodage est explicite (les noms ne servent pas). */
const HDR_CSV_ENCODING = "latin1";

/** Valeur de `hdicode` des lignes sans IDH (Monaco, Corée du Nord). */
const NO_CATEGORY_LABEL = "Other Countries or Territories";

const CATEGORY_BY_HDICODE: Readonly<Record<string, HumanDevelopmentCategory>> =
  {
    "Very High": "very_high",
    High: "high",
    Medium: "medium",
    Low: "low",
  };

export function decodeHdrCsv(bytes: ArrayBuffer): string {
  return new TextDecoder(HDR_CSV_ENCODING).decode(bytes);
}

/** CSV RFC 4180 : champs entre guillemets (« Korea, Republic of »), `""` échappé, CRLF ou LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type HdrRow = { iso3: string; hdicode: string; hdi: string };

/**
 * Extrait `iso3`, `hdicode` et `hdi_<année>` du tableau. Échoue bruyamment si
 * une colonne manque, si l'année demandée n'est pas la dernière `hdi_*` du
 * fichier (une édition plus récente aurait été publiée sous la même URL), ou si
 * un code ISO3 apparaît deux fois.
 */
export function readHdrRows(
  table: readonly (readonly string[])[],
  dataYear: number,
): HdrRow[] {
  const [header, ...body] = table;
  if (!header) throw new Error("CSV du PNUD vide");
  const column = (name: string): number => {
    const index = header.indexOf(name);
    if (index === -1)
      throw new Error(`CSV du PNUD : colonne « ${name} » absente`);
    return index;
  };
  const hdiColumns = header
    .map((name) => /^hdi_(\d{4})$/.exec(name)?.[1])
    .filter((year): year is string => year !== undefined)
    .map(Number);
  const latest = Math.max(...hdiColumns);
  if (latest !== dataYear) {
    throw new Error(
      `CSV du PNUD : dernière colonne hdi_${latest}, attendue hdi_${dataYear} — mettre à jour HDR_DATA_YEAR (et HDR_EDITION)`,
    );
  }
  const iso3Column = column("iso3");
  const codeColumn = column("hdicode");
  const hdiColumn = column(`hdi_${dataYear}`);
  const seen = new Set<string>();
  return body
    .filter((fields) => fields.length > 1)
    .map((fields) => {
      const iso3 = fields[iso3Column] ?? "";
      if (seen.has(iso3)) throw new Error(`CSV du PNUD : ${iso3} en double`);
      seen.add(iso3);
      return {
        iso3,
        hdicode: fields[codeColumn] ?? "",
        hdi: fields[hdiColumn] ?? "",
      };
    });
}

/**
 * Pour chaque ISO3 du catalogue : sa valeur et la catégorie publiée, ou sa
 * cause d'absence. Les agrégats du PNUD (`ZZA.VHHD`…) et les territoires hors
 * catalogue (HKG) sont ignorés faute d'être au catalogue. Un IDH présent avec
 * une catégorie inconnue, ou une ligne sans IDH hors « Other Countries or
 * Territories », échoue : ce serait un changement de format du fichier.
 */
export function buildSnapshot(
  rows: readonly HdrRow[],
  codes: readonly string[],
  harvestedAt: string,
): HumanDevelopmentIndexSnapshot {
  const byCode = new Map(rows.map((row) => [row.iso3, row]));
  const values: Record<string, HumanDevelopmentValue> = {};
  const missing: Record<string, HumanDevelopmentMissingCause> = {};
  [...codes].sort().forEach((iso3) => {
    const row = byCode.get(iso3);
    if (!row) {
      missing[iso3] = "not_in_report";
      return;
    }
    if (row.hdi.trim() === "") {
      if (row.hdicode !== NO_CATEGORY_LABEL) {
        throw new Error(
          `${iso3}: IDH vide mais catégorie « ${row.hdicode} » (attendu « ${NO_CATEGORY_LABEL} »)`,
        );
      }
      missing[iso3] = "no_value_published";
      return;
    }
    const category = CATEGORY_BY_HDICODE[row.hdicode];
    const value = Number(row.hdi);
    if (!category || !Number.isFinite(value)) {
      throw new Error(
        `${iso3}: IDH « ${row.hdi} » / catégorie « ${row.hdicode} » illisibles`,
      );
    }
    values[iso3] = { value, category };
  });
  return {
    edition: HDR_EDITION,
    dataYear: HDR_DATA_YEAR,
    sourceUrl: HDR_CSV_URL,
    harvestedAt,
    values,
    missing,
  };
}

/** Millésime de `content/sources.ts` : « Rapport 2025 (données 2023) ». */
export function editionVintageLabel(
  snapshot: Pick<HumanDevelopmentIndexSnapshot, "edition" | "dataYear">,
): LocalizedString {
  return {
    fr: `Rapport ${snapshot.edition} (données ${snapshot.dataYear})`,
    en: `${snapshot.edition} Report (${snapshot.dataYear} data)`,
  };
}

/**
 * Garde : le millésime de `content/sources.ts` (écrit à la main, affiché au
 * joueur) doit dire exactement l'édition et l'année du dataset, que seule la
 * récolte met à jour. Comparaison exacte.
 */
export function validateEditionVintage(
  sourceId: string,
  sourceVintage: LocalizedString | null,
  snapshot: Pick<HumanDevelopmentIndexSnapshot, "edition" | "dataYear">,
): string[] {
  const expected = editionVintageLabel(snapshot);
  if (sourceVintage?.fr === expected.fr && sourceVintage?.en === expected.en) {
    return [];
  }
  return [
    `sources.${sourceId}: millésime ${JSON.stringify(sourceVintage)} désaccordé de la récolte (attendu ${JSON.stringify(expected)}) — mettre à jour content/sources.ts`,
  ];
}

/**
 * Garde : la catégorie calculée avec nos seuils égale celle que le PNUD publie
 * (`hdicode`), pour chaque pays. Un écart signale des seuils périmés (nouvelle
 * édition) ou une erreur de lecture.
 */
export function validateCategoryAgainstPublished(
  snapshot: Pick<HumanDevelopmentIndexSnapshot, "values">,
): string[] {
  return Object.entries(snapshot.values)
    .filter(
      ([, { value, category }]) => humanDevelopmentCategory(value) !== category,
    )
    .map(
      ([iso3, { value, category }]) =>
        `${iso3}: IDH ${value} → « ${humanDevelopmentCategory(value)} » avec nos seuils, mais le PNUD publie « ${category} » — seuils à revoir (content/countries/humanDevelopment.ts)`,
    );
}

/** Sérialise le dataset (le fichier est ensuite normalisé par Biome). */
export function renderHumanDevelopmentModule(
  snapshot: HumanDevelopmentIndexSnapshot,
): string {
  return `import type { HumanDevelopmentIndexSnapshot } from "./types";

/**
 * Indice de développement humain (IDH) : [PNUD, *Human Development Report*
 * ${snapshot.edition}](https://hdr.undp.org/data-center/documentation-and-downloads),
 * fichier « composite indices complete time series », colonne
 * \`hdi_${snapshot.dataYear}\` (dernière année de l'édition), lu à
 * \`sourceUrl\`. \`category\` est la catégorie que le PNUD publie (\`hdicode\`) :
 * elle ne sert qu'à la garde de \`check:content\`, la fiche la recalcule depuis
 * la valeur. Un pays absent du fichier ou sans valeur est dans \`missing\` avec
 * sa cause. Récolté par \`scripts/countries/harvest/humanDevelopmentIndex.ts\`
 * (\`pnpm harvest:hdi\`).
 *
 * **Généré** : ne pas l'éditer à la main.
 */
export const HUMAN_DEVELOPMENT_INDEX: HumanDevelopmentIndexSnapshot = ${JSON.stringify(snapshot, null, 2)};
`;
}
