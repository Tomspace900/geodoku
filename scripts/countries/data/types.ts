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
