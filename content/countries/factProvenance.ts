/**
 * Provenance de chaque champ de `CountryFacts`, affichée en légende de
 * catégorie sur la fiche pays (lot 2). Union discriminée identique à
 * `ConstraintAboutSources` (lot 1) : `basis: "source"` exige au moins une
 * source, `"convention"` peut n'en citer aucune quand la revue éditoriale ne
 * s'appuie sur aucun dataset externe (cf. `content/countries/SOURCE.md`).
 *
 * Le type est exhaustif sur `keyof CountryFacts` : un champ ajouté sans
 * provenance ne compile pas. Ce fichier reflète le tableau de
 * `content/countries/SOURCE.md`, et tout changement se fait dans les deux.
 */

import type { SourceId } from "../sources";
import type { CountryFacts } from "./type";

export type FactProvenanceSources =
  | { basis: "source"; sources: readonly [SourceId, ...SourceId[]] }
  | { basis: "convention"; sources: readonly SourceId[] };

export type FactProvenance = Readonly<FactProvenanceSources>;

export const FACT_PROVENANCE: {
  readonly [K in keyof CountryFacts]: FactProvenance;
} = {
  continent: { basis: "convention", sources: ["un_m49"] },
  waterAccess: { basis: "source", sources: ["world_countries"] },
  borders: { basis: "source", sources: ["world_countries", "rest_countries"] },
  areaKm2: { basis: "source", sources: ["world_countries"] },
  population: { basis: "source", sources: ["rest_countries"] },
  officialLanguages: { basis: "source", sources: ["world_countries"] },
  latitude: { basis: "source", sources: ["world_countries"] },
  subregion: { basis: "source", sources: ["world_countries"] },
  flagColors: { basis: "convention", sources: ["un_flags"] },
  flagSymbols: { basis: "convention", sources: ["un_flags"] },
  flagLayout: { basis: "convention", sources: ["un_flags"] },
  events: { basis: "source", sources: ["fifa_world_cup", "ioc_olympic_hosts"] },
  memberships: { basis: "source", sources: ["rest_countries"] },
  capitals: { basis: "source", sources: ["rest_countries"] },
  drivingSide: { basis: "source", sources: ["rest_countries"] },
  // Tags curés sans dataset unique (Moyen-Orient perçu, capitale ≠ plus
  // grande ville…) : aucune source à citer, cf. la règle « convention sans
  // source » actée au gate du lot 1.
  geoTags: { basis: "convention", sources: [] },
  regime: { basis: "convention", sources: ["cia_factbook_government_type"] },
  // Façades, équateur, milieux et sommet : revue éditoriale cartographique
  // sans dataset unique nommé par `content/countries/SOURCE.md` — même
  // principe que `geoTags`.
  physicalFeatures: { basis: "convention", sources: [] },
  utcOffsetCount: { basis: "source", sources: ["iana_tz"] },
  lastVolcanicEruptionYear: { basis: "source", sources: ["smithsonian_gvp"] },
  mountainAreaShare: { basis: "source", sources: ["un_sdg_mountain_area"] },
  forestCoverShare: { basis: "source", sources: ["fao_forest_resources"] },
  urbanCentresOver1M: {
    basis: "source",
    sources: ["ghsl_urban_centre_database"],
  },
  productionRanks: {
    basis: "source",
    sources: [
      "faostat_2022_2024",
      "usda_fas_coffee",
      "eia_crude_oil",
      "eia_natural_gas",
    ],
  },
  coalElectricityShare: { basis: "source", sources: ["ember_electricity"] },
  formerSovereigns: { basis: "source", sources: ["cia_factbook_independence"] },
  sovereigntyYear: { basis: "source", sources: ["cia_factbook_independence"] },
  sovereigntyKind: { basis: "source", sources: ["cia_factbook_independence"] },
};
