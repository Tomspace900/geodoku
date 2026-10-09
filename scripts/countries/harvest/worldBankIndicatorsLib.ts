/**
 * Logique pure de la récolte des indicateurs de la Banque mondiale (WDI) :
 * URL, lecture de la réponse, choix de l'année la plus récente, plage d'années
 * du millésime, sérialisation du dataset. Aucun accès réseau ici — le script
 * `worldBankIndicators.ts` fait le fetch, ce module se teste hors-ligne.
 */
import type { LocalizedString } from "../../../content/type.ts";
import type {
  WorldBankIndicator,
  WorldBankIndicatorsSnapshot,
  WorldBankMissingCause,
  WorldBankValue,
} from "../data/types.ts";

export const GDP_PER_CAPITA_CODE = "NY.GDP.PCAP.CD";
export const LIFE_EXPECTANCY_CODE = "SP.DYN.LE00.IN";

/** Nombre d'années de la fenêtre de récolte, la plus récente étant l'année précédente. */
export const WINDOW_YEARS = 5;

export type HarvestWindow = { from: number; to: number };

/**
 * Fenêtre des `WINDOW_YEARS` dernières années **révolues** avant la récolte :
 * l'année en cours n'a jamais de valeur annuelle publiée.
 */
export function harvestWindow(harvestedAt: string): HarvestWindow {
  const year = Number(harvestedAt.slice(0, 4));
  if (!Number.isInteger(year)) {
    throw new Error(
      `harvestedAt doit être une date YYYY-MM-DD : « ${harvestedAt} »`,
    );
  }
  return { from: year - WINDOW_YEARS, to: year - 1 };
}

export function buildIndicatorUrl(code: string, window: HarvestWindow): string {
  return `https://api.worldbank.org/v2/country/all/indicator/${code}?format=json&per_page=20000&date=${window.from}:${window.to}`;
}

export type WdiRow = {
  indicator?: { id?: string };
  countryiso3code?: string;
  date?: string;
  value?: number | null;
};

export type WdiPage = { lastUpdated: string; rows: readonly WdiRow[] };

/**
 * Lit la réponse brute `[meta, rows]`. Échoue bruyamment si la forme diverge ou
 * si la réponse tient sur plus d'une page : une page tronquée ferait passer des
 * pays pour « absents de la WDI ».
 */
export function parseWdiResponse(json: unknown, code: string): WdiPage {
  const [meta, rows] = Array.isArray(json) ? json : [];
  if (
    typeof meta !== "object" ||
    meta === null ||
    !Array.isArray(rows) ||
    typeof (meta as { lastupdated?: unknown }).lastupdated !== "string"
  ) {
    throw new Error(
      `${code}: réponse WDI illisible — ${JSON.stringify(json).slice(0, 200)}`,
    );
  }
  const { pages, lastupdated } = meta as {
    pages?: number;
    lastupdated: string;
  };
  if (pages !== 1) {
    throw new Error(
      `${code}: la réponse WDI tient sur ${pages} pages, une seule est lue`,
    );
  }
  const foreign = (rows as WdiRow[]).find((row) => row.indicator?.id !== code);
  if (foreign) {
    throw new Error(
      `${code}: ligne d'un autre indicateur (${foreign.indicator?.id})`,
    );
  }
  return { lastUpdated: lastupdated, rows: rows as WdiRow[] };
}

/**
 * Pour chaque ISO3 du catalogue, l'année non nulle la plus récente de la
 * fenêtre. Les agrégats régionaux (WLD, EUU…) sont ignorés faute d'être au
 * catalogue. Sans valeur : `not_in_wdi` si le code n'a aucune ligne,
 * `no_value_in_window` sinon.
 */
export function selectLatestValues(
  rows: readonly WdiRow[],
  codes: readonly string[],
  window: HarvestWindow,
): {
  values: Record<string, WorldBankValue>;
  missing: Record<string, WorldBankMissingCause>;
} {
  const catalog = new Set(codes);
  const seen = new Set<string>();
  const best = new Map<string, WorldBankValue>();
  rows.forEach((row) => {
    const iso3 = row.countryiso3code;
    if (!iso3 || !catalog.has(iso3)) return;
    seen.add(iso3);
    const year = Number(row.date);
    if (
      !Number.isInteger(year) ||
      year < window.from ||
      year > window.to ||
      typeof row.value !== "number" ||
      !Number.isFinite(row.value)
    ) {
      return;
    }
    const current = best.get(iso3);
    if (!current || year > current.year) {
      best.set(iso3, { value: row.value, year });
    }
  });
  const values: Record<string, WorldBankValue> = {};
  const missing: Record<string, WorldBankMissingCause> = {};
  [...codes].sort().forEach((iso3) => {
    const found = best.get(iso3);
    if (found) values[iso3] = found;
    else missing[iso3] = seen.has(iso3) ? "no_value_in_window" : "not_in_wdi";
  });
  return { values, missing };
}

export function buildIndicator(
  code: string,
  page: WdiPage,
  catalogCodes: readonly string[],
  window: HarvestWindow,
): WorldBankIndicator {
  return {
    code,
    sourceUpdatedAt: page.lastUpdated,
    window,
    ...selectLatestValues(page.rows, catalogCodes, window),
  };
}

const EN_DASH = "–";

/**
 * Plage d'années effectivement retenues, pour le millésime de `sources.ts` :
 * « 2022–2025 », ou « 2024 » quand toutes les valeurs ont la même année.
 */
export function yearRangeLabel(indicator: WorldBankIndicator): LocalizedString {
  const years = Object.values(indicator.values).map(({ year }) => year);
  if (years.length === 0) {
    throw new Error(`${indicator.code}: aucune valeur, pas de plage d'années`);
  }
  const min = Math.min(...years);
  const max = Math.max(...years);
  const label = min === max ? String(min) : `${min}${EN_DASH}${max}`;
  return { fr: label, en: label };
}

/**
 * Garde : le millésime de `content/sources.ts` (écrit à la main, affiché au
 * joueur) doit dire exactement la plage que donne le dataset, que seule la
 * récolte met à jour. Comparaison exacte.
 */
export function validateYearRangeVintage(
  sourceId: string,
  sourceVintage: LocalizedString | null,
  indicator: WorldBankIndicator,
): string[] {
  const expected = yearRangeLabel(indicator);
  if (sourceVintage?.fr === expected.fr && sourceVintage?.en === expected.en) {
    return [];
  }
  return [
    `sources.${sourceId}: millésime ${JSON.stringify(sourceVintage)} désaccordé de la récolte (plage attendue ${JSON.stringify(expected)}) — mettre à jour content/sources.ts`,
  ];
}

/** Sérialise le dataset (le fichier est ensuite normalisé par Biome). */
export function renderWorldBankModule(
  snapshot: WorldBankIndicatorsSnapshot,
): string {
  return `import type { WorldBankIndicatorsSnapshot } from "./types";

/**
 * PIB par habitant (\`NY.GDP.PCAP.CD\`, dollars US courants) et espérance de vie
 * à la naissance (\`SP.DYN.LE00.IN\`) : [Banque mondiale, World Development
 * Indicators](https://databank.worldbank.org/source/world-development-indicators),
 * API \`api.worldbank.org/v2\`. Pour chaque pays, l'année non nulle la plus
 * récente de \`window\` ; au-delà, le pays est dans \`missing\` avec sa cause.
 * Récolté par \`scripts/countries/harvest/worldBankIndicators.ts\`
 * (\`pnpm harvest:world-bank\`).
 *
 * **Généré** : ne pas l'éditer à la main. \`sourceUpdatedAt\` est le
 * \`lastupdated\` de la WDI, qui révise ses séries : une nouvelle récolte peut
 * changer une valeur passée.
 */
export const WORLD_BANK_INDICATORS: WorldBankIndicatorsSnapshot = ${JSON.stringify(snapshot, null, 2)};
`;
}
