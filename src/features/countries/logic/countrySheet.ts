import type { TKey } from "@/i18n/types";
import { isCountryCode } from "../../../../content/countries/countryCodes";
import {
  EVENT_PROVENANCE,
  FACT_PROVENANCE,
  PRODUCTION_PROVENANCE,
} from "../../../../content/countries/factProvenance";
import type { CountryFacts } from "../../../../content/countries/type";
import type { SourceId } from "../../../../content/sources";
import type { ContentBasis } from "../../../../content/type";
import type { PhysicalFeature } from "../types";
import {
  BIOME_FEATURES,
  CAPITAL_ROLE_LABELS,
  COASTLINE_FEATURES,
  CONTINENT_LABELS,
  DRIVING_SIDE_LABELS,
  EVENT_LABELS,
  FLAG_COLOR_LABELS,
  FLAG_LAYOUT_LABELS,
  FLAG_SYMBOL_LABELS,
  FORMER_SOVEREIGN_LABELS,
  PHYSICAL_FEATURE_LABELS,
  POLITICAL_GROUP_LABELS,
  POLITICAL_GROUP_ORDER,
  PRODUCTION_LABELS,
  PRODUCTION_ORDER,
  REGIME_LABELS,
  SUBREGION_LABELS,
  WATER_ACCESS_LABELS,
} from "./countrySheetLabels";

export type CountrySheetCapital = Readonly<{
  name: string;
  roleLabelKeys: readonly TKey[];
}>;

export type CountrySheetProduction = Readonly<{
  productLabelKey: TKey;
  rank: number;
}>;

export type CountrySheetValue =
  | { kind: "enum"; labelKey: TKey }
  | { kind: "enumList"; labelKeys: readonly TKey[] }
  | { kind: "count"; value: number }
  | { kind: "countWithZeroLabel"; value: number; zeroLabelKey: TKey }
  | { kind: "area"; km2: number }
  | { kind: "density"; value: number }
  | { kind: "percent"; value: number }
  | { kind: "year"; value: number }
  | { kind: "utcOffsets"; count: number; labelKey: TKey }
  | {
      kind: "countries";
      iso3: readonly string[];
      emptyLabelKey?: TKey;
    }
  | { kind: "languages"; codes: readonly string[] }
  | {
      kind: "capitals";
      capitals: readonly CountrySheetCapital[];
      capitalNotLargestCity: boolean;
    }
  | { kind: "productions"; entries: readonly CountrySheetProduction[] };

export type CountrySheetRow = Readonly<{
  labelKey: TKey;
  value: CountrySheetValue;
  basis: ContentBasis;
  sources: readonly SourceId[];
}>;

export type CountrySheetCategory = Readonly<{
  titleKey: TKey;
  rows: readonly CountrySheetRow[];
  sources: readonly SourceId[];
}>;

export type CountrySheetModel = Readonly<{
  iso3: string;
  subregionLabelKey: TKey | null;
  subregionRaw: string;
  categories: readonly CountrySheetCategory[];
}>;

function dedupeSources(
  groups: readonly (readonly SourceId[])[],
): readonly SourceId[] {
  return [...new Set(groups.flat())];
}

/** Union pragmatique : "convention" dès qu'une composante l'est, sinon "source". */
function mergeBasis(bases: readonly ContentBasis[]): ContentBasis {
  return bases.includes("convention") ? "convention" : "source";
}

function physicalFeatureLabels(
  facts: CountryFacts,
  members: readonly PhysicalFeature[],
): readonly TKey[] {
  return members
    .filter((feature) => facts.physicalFeatures.includes(feature))
    .map((feature) => PHYSICAL_FEATURE_LABELS[feature]);
}

function buildLandmarksRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  // La liste des capitales reste « source » (REST Countries) même quand la
  // mention « n'est pas la plus grande ville » (convention, sans source)
  // s'y ajoute : les deux ont leur propre provenance, la ligne ne prend pas
  // la moyenne des deux (cf. lot 2, correctif « capitales »).
  rows.push({
    labelKey: "countrySheet.field.capitals",
    value: {
      kind: "capitals",
      capitals: facts.capitals.map((capital) => ({
        name: capital.name,
        roleLabelKeys: capital.roles.map((role) => CAPITAL_ROLE_LABELS[role]),
      })),
      capitalNotLargestCity: facts.geoTags.includes("capital_not_largest"),
    },
    basis: FACT_PROVENANCE.capitals.basis,
    sources: FACT_PROVENANCE.capitals.sources,
  });

  rows.push({
    labelKey: "countrySheet.field.population",
    value: { kind: "count", value: facts.population },
    basis: FACT_PROVENANCE.population.basis,
    sources: FACT_PROVENANCE.population.sources,
  });

  rows.push({
    labelKey: "countrySheet.field.area",
    value: { kind: "area", km2: facts.areaKm2 },
    basis: FACT_PROVENANCE.areaKm2.basis,
    sources: FACT_PROVENANCE.areaKm2.sources,
  });

  rows.push({
    labelKey: "countrySheet.field.density",
    value: {
      kind: "density",
      value: facts.areaKm2 > 0 ? facts.population / facts.areaKm2 : 0,
    },
    basis: mergeBasis([
      FACT_PROVENANCE.population.basis,
      FACT_PROVENANCE.areaKm2.basis,
    ]),
    sources: dedupeSources([
      FACT_PROVENANCE.population.sources,
      FACT_PROVENANCE.areaKm2.sources,
    ]),
  });

  if (facts.officialLanguages.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.officialLanguages",
      value: { kind: "languages", codes: facts.officialLanguages },
      basis: FACT_PROVENANCE.officialLanguages.basis,
      sources: FACT_PROVENANCE.officialLanguages.sources,
    });
  }

  return rows;
}

function buildGeographyRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  rows.push({
    labelKey: "countrySheet.field.continent",
    value: { kind: "enum", labelKey: CONTINENT_LABELS[facts.continent] },
    basis: FACT_PROVENANCE.continent.basis,
    sources: FACT_PROVENANCE.continent.sources,
  });

  if (facts.geoTags.includes("middle_east")) {
    rows.push({
      labelKey: "countrySheet.field.middleEast",
      value: { kind: "enum", labelKey: "countrySheet.value.yes" },
      basis: FACT_PROVENANCE.middleEast.basis,
      sources: FACT_PROVENANCE.middleEast.sources,
    });
  }

  rows.push({
    labelKey: "countrySheet.field.waterAccess",
    value: { kind: "enum", labelKey: WATER_ACCESS_LABELS[facts.waterAccess] },
    basis: FACT_PROVENANCE.waterAccess.basis,
    sources: FACT_PROVENANCE.waterAccess.sources,
  });

  // Seuls les pays du catalogue joueur sont cités : un territoire non jouable
  // (ESH, HKG, MAC…) présent dans la donnée `borders` brute serait un pays
  // sans fiche possible. La donnée `borders` elle-même reste inchangée.
  rows.push({
    labelKey: "countrySheet.field.borders",
    value: {
      kind: "countries",
      iso3: facts.borders.filter((code) => isCountryCode(code)),
      emptyLabelKey: "countrySheet.value.none",
    },
    basis: FACT_PROVENANCE.borders.basis,
    sources: FACT_PROVENANCE.borders.sources,
  });

  const coastlineLabels = physicalFeatureLabels(facts, COASTLINE_FEATURES);
  if (coastlineLabels.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.coastlines",
      value: { kind: "enumList", labelKeys: coastlineLabels },
      basis: FACT_PROVENANCE.coastlines.basis,
      sources: FACT_PROVENANCE.coastlines.sources,
    });
  }

  if (facts.physicalFeatures.includes("equator_crosser")) {
    rows.push({
      labelKey: "countrySheet.field.equatorCrosser",
      value: { kind: "enum", labelKey: "countrySheet.value.yes" },
      basis: FACT_PROVENANCE.equatorCrosser.basis,
      sources: FACT_PROVENANCE.equatorCrosser.sources,
    });
  }

  rows.push({
    labelKey: "countrySheet.field.timezones",
    value: {
      kind: "utcOffsets",
      count: facts.utcOffsetCount,
      labelKey:
        facts.utcOffsetCount === 1
          ? "countrySheet.value.utcOffsetsCountSingular"
          : "countrySheet.value.utcOffsetsCountPlural",
    },
    basis: FACT_PROVENANCE.timezones.basis,
    sources: FACT_PROVENANCE.timezones.sources,
  });

  return rows;
}

function buildNatureRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  if (facts.physicalFeatures.includes("peak_over_5000m")) {
    rows.push({
      labelKey: "countrySheet.field.peakOver5000m",
      value: { kind: "enum", labelKey: "countrySheet.value.yes" },
      basis: FACT_PROVENANCE.peakOver5000m.basis,
      sources: FACT_PROVENANCE.peakOver5000m.sources,
    });
  }

  if (facts.mountainAreaShare !== null) {
    rows.push({
      labelKey: "countrySheet.field.mountainAreaShare",
      value: { kind: "percent", value: facts.mountainAreaShare },
      basis: FACT_PROVENANCE.mountainAreaShare.basis,
      sources: FACT_PROVENANCE.mountainAreaShare.sources,
    });
  }

  if (facts.forestCoverShare !== null) {
    rows.push({
      labelKey: "countrySheet.field.forestCoverShare",
      value: { kind: "percent", value: facts.forestCoverShare },
      basis: FACT_PROVENANCE.forestCoverShare.basis,
      sources: FACT_PROVENANCE.forestCoverShare.sources,
    });
  }

  const biomeLabels = physicalFeatureLabels(facts, BIOME_FEATURES);
  if (biomeLabels.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.biomes",
      value: { kind: "enumList", labelKeys: biomeLabels },
      basis: FACT_PROVENANCE.biomes.basis,
      sources: FACT_PROVENANCE.biomes.sources,
    });
  }

  if (facts.lastVolcanicEruptionYear !== null) {
    rows.push({
      labelKey: "countrySheet.field.lastVolcanicEruption",
      value: { kind: "year", value: facts.lastVolcanicEruptionYear },
      basis: FACT_PROVENANCE.lastVolcanicEruptionYear.basis,
      sources: FACT_PROVENANCE.lastVolcanicEruptionYear.sources,
    });
  }

  return rows;
}

function buildSocietyRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  rows.push({
    labelKey: "countrySheet.field.urbanCentres",
    value: {
      kind: "countWithZeroLabel",
      value: facts.urbanCentresOver1M,
      zeroLabelKey: "countrySheet.value.noneFeminine",
    },
    basis: FACT_PROVENANCE.urbanCentresOver1M.basis,
    sources: FACT_PROVENANCE.urbanCentresOver1M.sources,
  });

  rows.push({
    labelKey: "countrySheet.field.drivingSide",
    value: {
      kind: "enum",
      labelKey: DRIVING_SIDE_LABELS[facts.drivingSide],
    },
    basis: FACT_PROVENANCE.drivingSide.basis,
    sources: FACT_PROVENANCE.drivingSide.sources,
  });

  const displayedProducts = PRODUCTION_ORDER.filter(
    (product) => facts.productionRanks[product] !== undefined,
  );
  if (displayedProducts.length > 0) {
    // Une source par produit affiché, jamais les quatre sources de la
    // catégorie « productions » en bloc (cf. lot 2, correctif C) : un pays qui
    // n'a qu'un rang blé ne cite que FAOSTAT, pas aussi l'USDA et l'EIA.
    rows.push({
      labelKey: "countrySheet.field.productions",
      value: {
        kind: "productions",
        entries: displayedProducts.map((product) => ({
          productLabelKey: PRODUCTION_LABELS[product],
          rank: facts.productionRanks[product] as number,
        })),
      },
      basis: mergeBasis(
        displayedProducts.map(
          (product) => PRODUCTION_PROVENANCE[product].basis,
        ),
      ),
      sources: dedupeSources(
        displayedProducts.map(
          (product) => PRODUCTION_PROVENANCE[product].sources,
        ),
      ),
    });
  }

  if (facts.coalElectricityShare !== null) {
    rows.push({
      labelKey: "countrySheet.field.coalElectricity",
      value: { kind: "percent", value: facts.coalElectricityShare },
      basis: FACT_PROVENANCE.coalElectricityShare.basis,
      sources: FACT_PROVENANCE.coalElectricityShare.sources,
    });
  }

  return rows;
}

function buildHistoryRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  rows.push({
    labelKey: "countrySheet.field.regime",
    value: { kind: "enum", labelKey: REGIME_LABELS[facts.regime] },
    basis: FACT_PROVENANCE.regime.basis,
    sources: FACT_PROVENANCE.regime.sources,
  });

  // La ligne « Souveraineté » (nature + année) reste masquée jusqu'au lot 4 :
  // `sovereigntyKind` n'a jamais été relu avant 1990 (il ne servait qu'à
  // dériver `history_sovereignty_since_1990`), et plusieurs entrées sont
  // fausses une fois affichées telles quelles (France « Indépendance (1789) »,
  // Royaume-Uni « Indépendance (1284) »…) — cf. lot 2, annexe A du dossier de
  // corrections. `formerSovereigns` reste affiché : c'est une liste de slugs
  // relue à la main, indépendante de `sovereigntyKind`/`sovereigntyYear`.

  if (facts.formerSovereigns.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.formerSovereigns",
      value: {
        kind: "enumList",
        labelKeys: facts.formerSovereigns.map(
          (power) => FORMER_SOVEREIGN_LABELS[power],
        ),
      },
      basis: FACT_PROVENANCE.formerSovereigns.basis,
      sources: FACT_PROVENANCE.formerSovereigns.sources,
    });
  }

  const memberships = POLITICAL_GROUP_ORDER.filter((group) =>
    facts.memberships.includes(group),
  );
  if (memberships.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.memberships",
      value: {
        kind: "enumList",
        labelKeys: memberships.map((group) => POLITICAL_GROUP_LABELS[group]),
      },
      basis: FACT_PROVENANCE.memberships.basis,
      sources: FACT_PROVENANCE.memberships.sources,
    });
  }

  if (facts.events.length > 0) {
    // Une source par événement affiché, jamais la Coupe du monde et les Jeux
    // olympiques en bloc (cf. lot 2, correctif du 2026-09-18) : un pays qui n'a
    // accueilli que la Coupe du monde ne cite que la FIFA, pas aussi le CIO.
    rows.push({
      labelKey: "countrySheet.field.events",
      value: {
        kind: "enumList",
        labelKeys: facts.events.map((event) => EVENT_LABELS[event]),
      },
      basis: mergeBasis(
        facts.events.map((event) => EVENT_PROVENANCE[event].basis),
      ),
      sources: dedupeSources(
        facts.events.map((event) => EVENT_PROVENANCE[event].sources),
      ),
    });
  }

  return rows;
}

function buildFlagRows(facts: CountryFacts): CountrySheetRow[] {
  const rows: CountrySheetRow[] = [];

  if (facts.flagColors.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.flagColors",
      value: {
        kind: "enumList",
        labelKeys: facts.flagColors.map((color) => FLAG_COLOR_LABELS[color]),
      },
      basis: FACT_PROVENANCE.flagColors.basis,
      sources: FACT_PROVENANCE.flagColors.sources,
    });
  }

  if (facts.flagSymbols.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.flagSymbols",
      value: {
        kind: "enumList",
        labelKeys: facts.flagSymbols.map(
          (symbol) => FLAG_SYMBOL_LABELS[symbol],
        ),
      },
      basis: FACT_PROVENANCE.flagSymbols.basis,
      sources: FACT_PROVENANCE.flagSymbols.sources,
    });
  }

  if (facts.flagLayout.length > 0) {
    rows.push({
      labelKey: "countrySheet.field.flagLayout",
      value: {
        kind: "enumList",
        labelKeys: facts.flagLayout.map((layout) => FLAG_LAYOUT_LABELS[layout]),
      },
      basis: FACT_PROVENANCE.flagLayout.basis,
      sources: FACT_PROVENANCE.flagLayout.sources,
    });
  }

  return rows;
}

function category(
  titleKey: TKey,
  rows: readonly CountrySheetRow[],
): CountrySheetCategory | null {
  if (rows.length === 0) return null;
  return {
    titleKey,
    rows,
    sources: dedupeSources(rows.map((row) => row.sources)),
  };
}

/**
 * Modèle pur de la fiche pays : catégories → lignes (libellé, valeur typée,
 * provenance). Aucun appel à `t()` ni à `Intl` ici — la traduction et le
 * formatage locale-dépendant vivent dans `CountrySheet.tsx` et
 * `countrySheetFormat.ts`. Une ligne masquée (valeur `null`/liste vide, hors
 * `borders`/`urbanCentresOver1M` qui ont leur propre texte de repli) est
 * absente du tableau plutôt que présente avec une valeur creuse ; une
 * catégorie sans ligne visible est elle-même absente.
 */
export function buildCountrySheet(
  iso3: string,
  facts: CountryFacts,
): CountrySheetModel {
  const categories = [
    category("countrySheet.category.landmarks", buildLandmarksRows(facts)),
    category("countrySheet.category.geography", buildGeographyRows(facts)),
    category("countrySheet.category.natureRelief", buildNatureRows(facts)),
    category("countrySheet.category.societyEconomy", buildSocietyRows(facts)),
    category("countrySheet.category.historyPolitics", buildHistoryRows(facts)),
    category("countrySheet.category.flag", buildFlagRows(facts)),
  ].filter((entry): entry is CountrySheetCategory => entry !== null);

  return {
    iso3,
    subregionLabelKey: SUBREGION_LABELS[facts.subregion] ?? null,
    subregionRaw: facts.subregion,
    categories,
  };
}
