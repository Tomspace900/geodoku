/**
 * Types des datasets de faits curés consommés par `build-countries`.
 *
 * Repris des snapshots de la branche `constraint-explorer` (`content/facts/type.ts`
 * au commit 221b42d) et gardés **locaux au pipeline** : ces datasets sont des
 * entrées de curation (versionnées, datées, révisées à la main), pas du contenu
 * runtime. `build-countries` les fusionne dans `content/countries/facts.ts` sous
 * forme de scalaires dérivés (`utcOffsetCount`, `mountainAreaShare`, …).
 *
 * Provenance et millésime : `content/countries/SOURCE.md` (famille « faits
 * quantitatifs dérivés ») et les `SOURCE.md` des contraintes concernées.
 */

import type {
  FormerSovereign,
  ProductionRankKey,
  SovereigntyKind,
} from "../../../content/countries/type.ts";

export type { FormerSovereign, ProductionRankKey, SovereigntyKind };

/** Décalages UTC civils distincts observés simultanément à `referenceDate`. */
export type CivilTimeOffsetsSnapshot = Record<
  string,
  { value: string[]; year: number; referenceDate: string }
>;

/** Volcans dont une éruption est connue pendant l'Holocène (Smithsonian GVP). */
export type HoloceneVolcanoSnapshot = Record<
  string,
  { names: string[]; databaseVersion: string }
>;

/** Part de territoire montagneux en pourcentage (ODD 15.4.2, méthode FAO/UNEP-WCMC). */
export type MountainAreaSnapshot = Record<
  string,
  { value: number; year: number }
>;

export type UrbanCentre = {
  name: string;
  population: number;
  referenceYear: number;
};

/** Centres urbains GHSL dépassant strictement le seuil de population. */
export type UrbanCentresSnapshot = {
  sourceVersion: string;
  referenceYear: number;
  populationThreshold: number;
  countries: Record<string, UrbanCentre[]>;
};

/** Part de superficie forestière en pourcentage (FAO FRA, via country-core v1). */
export type ForestCoverSnapshot = {
  source: string;
  referenceYear: number;
  /** Pourcentage 0–100 par ISO3 ; couverture complète des 197 pays jouables. */
  countries: Record<string, number>;
};

/** Une ligne de classement mondial (rang 1 = premier producteur). */
export type ProductionRankingRow = {
  countryCode: string;
  rank: number;
  /** Volume source (tonnes agricoles / kb·j⁻¹ pétrole / Gm³ gaz) ; conservé pour la révision. */
  value: number;
};

/**
 * Classements de production agricole (FAOSTAT, moyenne triennale). Un tableau
 * `top N` par produit, trié par rang croissant.
 */
export type AgriculturalProductionSnapshot = {
  source: string;
  referenceYears: number[];
  products: Record<string, ProductionRankingRow[]>;
};

/**
 * Classements de production d'énergie (U.S. EIA International). `top N` par
 * produit ; les rangs marginaux (producteurs quasi nuls) sont écartés à la
 * curation — hors de portée de toute contrainte.
 */
export type EnergyProductionSnapshot = {
  source: string;
  sourceUpdatedAt: string;
  products: Record<
    string,
    { referenceYear: number; unit: string; rankings: ProductionRankingRow[] }
  >;
};

/** Part du charbon dans la production d'électricité, en pourcentage (Ember). */
export type CoalElectricitySnapshot = {
  source: string;
  referenceYear: number;
  /** Pourcentage 0–100 par ISO3 ; un pays absent de la source reste absent (jamais 0). */
  countries: Record<string, number>;
};

/**
 * Événement de souveraineté retenu pour un pays (CIA World Factbook, champ
 * *Independence*). L'éligibilité de `history_sovereignty_since_1990` se dérive
 * du `kind` (`independence` / `restoration` / `dissolution_successor`) — le
 * snapshot ne porte pas de drapeau d'éligibilité, qui n'en serait que la copie.
 */
export type SovereigntyEvent = Readonly<{
  kind: SovereigntyKind;
  year: number;
  date?: string;
  formerSovereigns: readonly FormerSovereign[];
  sourceDescription: string;
}>;

/** Snapshot des événements de souveraineté par ISO3 (couverture partielle assumée). */
export type SovereigntySnapshot = Readonly<{
  sourceCommit: string;
  countries: Readonly<Record<string, SovereigntyEvent>>;
}>;
