/**
 * Logique pure de la récolte de la couverture forestière (WDI
 * `AG.LND.FRST.ZS`, d'après la FAO) : choix de l'année de référence, valeurs
 * hors WDI, millésime, sérialisation. Le fetch vit dans `forestCover.ts`.
 */
import type { LocalizedString } from "../../../content/type.ts";
import type { ForestCoverSnapshot } from "../data/types.ts";
import type { WdiPage } from "./worldBankIndicatorsLib.ts";

export const FOREST_AREA_CODE = "AG.LND.FRST.ZS";

/**
 * Pays du catalogue absents de la WDI : valeur d'une autre source, motif
 * écrit. Une entrée pour un pays que la WDI couvre fait échouer la récolte —
 * une valeur de repli ne masque jamais la source.
 */
export const NON_WDI_FOREST_COVER: Readonly<
  Record<string, { value: number; reason: string }>
> = {
  TWN: {
    value: 60.71,
    reason:
      "absent de la WDI ; étude forestière nationale de Taïwan (2008-2014)",
  },
  VAT: { value: 0, reason: "absent de la WDI ; FAO FRA 2010, aucune forêt" },
  XKX: {
    value: 44.7,
    reason: "absent de la WDI ; stratégie forestière du Kosovo 2022-2030",
  },
};

function valuesByYear(
  page: WdiPage,
  codes: readonly string[],
): Map<number, Map<string, number>> {
  const catalog = new Set(codes);
  const byYear = new Map<number, Map<string, number>>();
  page.rows.forEach((row) => {
    const iso3 = row.countryiso3code;
    if (!iso3 || !catalog.has(iso3) || typeof row.value !== "number") return;
    const year = Number(row.date);
    const values = byYear.get(year) ?? new Map<string, number>();
    values.set(iso3, row.value);
    byYear.set(year, values);
  });
  return byYear;
}

/**
 * Année de référence : la plus récente dont la couverture égale la meilleure
 * de la fenêtre. Un seul millésime pour tous les pays (`SOURCES.md` : une
 * comparaison quantitative emploie un même millésime) — au 2026-10-09, 2024
 * laisse MCO, NIC et NRU sans valeur, 2023 n'en laisse aucun.
 */
export function selectReferenceYear(
  byYear: ReadonlyMap<number, ReadonlyMap<string, number>>,
): number {
  const best = Math.max(
    0,
    ...[...byYear.values()].map((values) => values.size),
  );
  const year = [...byYear.keys()]
    .sort((a, b) => b - a)
    .find((candidate) => byYear.get(candidate)?.size === best);
  if (year === undefined || best === 0) {
    throw new Error(`${FOREST_AREA_CODE}: aucune valeur dans la fenêtre`);
  }
  return year;
}

export function buildForestCover(
  page: WdiPage,
  codes: readonly string[],
  nonWdi: typeof NON_WDI_FOREST_COVER = NON_WDI_FOREST_COVER,
): ForestCoverSnapshot {
  const byYear = valuesByYear(page, codes);
  const referenceYear = selectReferenceYear(byYear);
  const wdi = byYear.get(referenceYear) ?? new Map<string, number>();
  const countries: Record<string, number> = {};
  codes.forEach((iso3) => {
    const fromWdi = wdi.get(iso3);
    const fallback = nonWdi[iso3];
    if (fromWdi !== undefined && fallback) {
      throw new Error(
        `${iso3}: la WDI couvre désormais ce pays (${fromWdi} en ${referenceYear}) — retirer sa valeur de NON_WDI_FOREST_COVER`,
      );
    }
    const value = fromWdi ?? fallback?.value;
    if (value === undefined) {
      throw new Error(
        `${iso3}: aucune couverture forestière en ${referenceYear} — l'ajouter à NON_WDI_FOREST_COVER avec sa source`,
      );
    }
    countries[iso3] = value;
  });
  return {
    source: `Banque mondiale, WDI ${FOREST_AREA_CODE} (d'après la FAO)`,
    referenceYear,
    sourceUpdatedAt: page.lastUpdated,
    countries,
  };
}

/** Millésime de `fao_forest_resources` dans `content/sources.ts` : l'année de référence. */
export function forestVintage(snapshot: ForestCoverSnapshot): LocalizedString {
  const year = String(snapshot.referenceYear);
  return { fr: year, en: year };
}

/** Garde : le millésime écrit à la main dit l'année du dataset. */
export function validateForestVintage(
  sourceVintage: LocalizedString | null,
  snapshot: ForestCoverSnapshot,
): string[] {
  const expected = forestVintage(snapshot);
  if (sourceVintage?.fr === expected.fr && sourceVintage?.en === expected.en) {
    return [];
  }
  return [
    `sources.fao_forest_resources: millésime ${JSON.stringify(sourceVintage)} désaccordé du dataset (année ${snapshot.referenceYear}) — mettre à jour content/sources.ts`,
  ];
}

/** Sérialise le dataset (le fichier est ensuite normalisé par Biome). */
export function renderForestCoverModule(snapshot: ForestCoverSnapshot): string {
  return `import type { ForestCoverSnapshot } from "./types";

/**
 * Part de superficie forestière par pays (pourcentage 0–100) : [Banque mondiale,
 * WDI \`${FOREST_AREA_CODE}\`](https://data.worldbank.org/indicator/${FOREST_AREA_CODE}),
 * d'après la FAO, pour une **année unique** (la plus récente à couverture
 * complète). Récolté par \`scripts/countries/harvest/forestCover.ts\`
 * (\`pnpm harvest:forest\`).
 *
 * **Généré** : ne pas l'éditer à la main. Les pays absents de la WDI (Taïwan,
 * Saint-Siège, Kosovo) prennent la valeur motivée de \`NON_WDI_FOREST_COVER\`
 * (\`forestCoverLib.ts\`). \`sourceUpdatedAt\` est le \`lastupdated\` de la WDI,
 * qui révise ses séries.
 */
export const FOREST_COVER: ForestCoverSnapshot = ${JSON.stringify(snapshot, null, 2)};
`;
}
