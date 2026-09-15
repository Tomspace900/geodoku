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

/**
 * Volcans dont une éruption est connue pendant l'Holocène (Smithsonian GVP),
 * restreints au territoire pleinement intégré de chaque État. `lastEruptionYear`
 * est l'année brute (négative avant notre ère, `null` si aucune éruption datée) :
 * le seuil d'activité vit dans la dérivation, pas dans la donnée.
 */
export type HoloceneVolcanoSnapshot = {
  source: string;
  extractedAt: string;
  countries: Record<
    string,
    { name: string; lastEruptionYear: number | null }[]
  >;
};

/**
 * Part de territoire montagneux en pourcentage (ODD 15.4.2, méthode
 * FAO/UNEP-WCMC). `source` n'est renseigné que pour les quelques pays **absents
 * de la série onusienne**, dont la valeur est curée ailleurs : elle n'est alors
 * pas issue de la même mesure, et n'est retenue que si l'écart au seuil de 50 %
 * rend le choix de délimitation indifférent. Voir le `SOURCE.md` de
 * `nature_mountain_area_majority`.
 */
export type MountainAreaSnapshot = Record<
  string,
  { value: number; year: number; source?: string }
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
  /** Volume source, dans l'`unit` de son bloc ; conservé pour la révision. */
  value: number;
};

/**
 * Classements de production agricole. Un bloc `top N` par produit, trié par rang
 * croissant, **avec sa propre source** : la revue métier 2026-09-10 a re-sourcé
 * le café sur l'USDA-FAS (la série FAOSTAT plaçait la République centrafricaine
 * au 10ᵉ rang mondial par imputation), et les sources ne sont donc plus
 * homogènes entre produits. Même forme que `EnergyProductionSnapshot`.
 */
export type AgriculturalProductionSnapshot = {
  products: Record<
    string,
    {
      source: string;
      referenceYears: number[];
      unit: string;
      rankings: ProductionRankingRow[];
    }
  >;
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
