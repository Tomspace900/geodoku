/**
 * Provenance de chaque **ligne de la fiche pays** (lot 2), pas de chaque champ
 * de `CountryFacts` : un champ composite (`physicalFeatures`, `geoTags`) se
 * décompose en plusieurs lignes affichées, chacune avec sa propre source —
 * une façade maritime cite l'IHO, l'équateur cite Natural Earth, un milieu
 * cite MODIS, quand `physicalFeatures` seul les confondait sous « aucune
 * source ». La provenance par produit de `productionRanks`
 * (`PRODUCTION_PROVENANCE`) et par événement de `events` (`EVENT_PROVENANCE`)
 * est séparée du reste : la fiche ne cite que les produits et événements
 * qu'elle affiche réellement pour un pays donné, jamais toutes les sources
 * de la famille en bloc.
 *
 * Union discriminée identique à `ConstraintAboutSources` (lot 1) :
 * `basis: "source"` exige au moins une source, `"convention"` peut n'en citer
 * aucune quand la revue éditoriale ne s'appuie sur aucun dataset externe.
 *
 * Chaque ligne qui recoupe une contrainte du lot 1 reprend **exactement** la
 * même provenance que son `about.ts` (façades → `ocean_*`/`physical_*_coast`,
 * équateur → `physical_crosses_equator`, milieux → `nature_desert`/
 * `nature_rainforest`, sommet → `physical_peak_over_5000m`, Moyen-Orient →
 * `subregion_middle_east`, sous-région → `subregion_caribbean`/
 * `subregion_southeast_asia`, continent → `continent_*`, capitale pas plus
 * grande ville → `society_capital_not_largest`, chaque événement → son
 * `event_*_host`, chaque produit → son `production_*`) — vérifié par
 * `content/countries/__tests__/factProvenance.test.ts`.
 *
 * Ce fichier reflète le tableau de `content/countries/SOURCE.md`, et tout
 * changement se fait dans les deux.
 */

import type { SourceId } from "../sources";
import type { CountryEvent, ProductionRankKey } from "./type";

export type FactProvenanceSources =
  | { basis: "source"; sources: readonly [SourceId, ...SourceId[]] }
  | { basis: "convention"; sources: readonly SourceId[] };

export type FactProvenance = Readonly<FactProvenanceSources>;

/** Une ligne par entrée de la table de correspondance faits → fiche (lot 2, §3). */
export type SheetRowId =
  | "capitals"
  | "capitalNotLargestNote"
  | "population"
  | "areaKm2"
  | "officialLanguages"
  | "continent"
  | "middleEast"
  | "waterAccess"
  | "borders"
  | "coastlines"
  | "equatorCrosser"
  | "timezones"
  | "peakOver5000m"
  | "mountainAreaShare"
  | "forestCoverShare"
  | "biomes"
  | "lastVolcanicEruptionYear"
  | "urbanCentresOver1M"
  | "drivingSide"
  | "coalElectricityShare"
  | "regime"
  | "formerSovereigns"
  | "memberships"
  | "flagColors"
  | "flagSymbols"
  | "flagLayout"
  | "subregion";

export const FACT_PROVENANCE: { readonly [K in SheetRowId]: FactProvenance } = {
  capitals: { basis: "source", sources: ["rest_countries"] },
  // Mention « n'est pas la plus grande ville » — même provenance que la
  // contrainte `society_capital_not_largest` : classification éditoriale,
  // aucune source à citer.
  capitalNotLargestNote: { basis: "convention", sources: [] },
  population: { basis: "source", sources: ["rest_countries"] },
  areaKm2: { basis: "source", sources: ["world_countries"] },
  officialLanguages: { basis: "source", sources: ["world_countries"] },
  // Même provenance que `continent_*` : convention éditoriale de découpage,
  // alignée sur la nomenclature ONU M49.
  continent: { basis: "convention", sources: ["un_m49"] },
  // Même provenance que `subregion_middle_east` : Moyen-Orient au sens
  // courant, pas la sous-région ONU — aucune source à citer.
  middleEast: { basis: "convention", sources: [] },
  waterAccess: { basis: "source", sources: ["world_countries"] },
  borders: { basis: "source", sources: ["world_countries", "rest_countries"] },
  // Même provenance que `ocean_*`/`physical_*_coast` : convention IHO S-23.
  coastlines: { basis: "convention", sources: ["iho_s23"] },
  // Même provenance que `physical_crosses_equator`.
  equatorCrosser: { basis: "convention", sources: ["natural_earth"] },
  timezones: { basis: "source", sources: ["iana_tz"] },
  // Même provenance que `physical_peak_over_5000m` : revue éditoriale sans
  // dataset unique nommé.
  peakOver5000m: { basis: "convention", sources: [] },
  mountainAreaShare: { basis: "source", sources: ["un_sdg_mountain_area"] },
  forestCoverShare: { basis: "source", sources: ["fao_forest_resources"] },
  // Même provenance que `nature_desert`/`nature_rainforest`.
  biomes: { basis: "convention", sources: ["nasa_modis_mcd12q1"] },
  lastVolcanicEruptionYear: {
    basis: "source",
    sources: ["smithsonian_gvp"],
  },
  urbanCentresOver1M: {
    basis: "source",
    sources: ["ghsl_urban_centre_database"],
  },
  drivingSide: { basis: "source", sources: ["rest_countries"] },
  coalElectricityShare: { basis: "source", sources: ["ember_electricity"] },
  regime: { basis: "convention", sources: ["cia_factbook_government_type"] },
  formerSovereigns: {
    basis: "source",
    sources: ["cia_factbook_independence"],
  },
  memberships: { basis: "source", sources: ["rest_countries"] },
  flagColors: { basis: "convention", sources: ["un_flags"] },
  flagSymbols: { basis: "convention", sources: ["un_flags"] },
  flagLayout: { basis: "convention", sources: ["un_flags"] },
  // Même provenance que `subregion_caribbean`/`subregion_southeast_asia` :
  // sous-région ONU M49 brute (à ne pas confondre avec `middleEast`, curée).
  subregion: { basis: "source", sources: ["un_m49"] },
};

/**
 * Provenance **par produit** de `productionRanks` — une source par produit,
 * jamais les quatre en bloc : la fiche ne cite que les produits qu'elle
 * affiche réellement (cf. `production_*_top10`/`production_*_top15`).
 */
export const PRODUCTION_PROVENANCE: {
  readonly [K in ProductionRankKey]: FactProvenance;
} = {
  cocoa: { basis: "source", sources: ["faostat_2022_2024"] },
  rice: { basis: "source", sources: ["faostat_2022_2024"] },
  wheat: { basis: "source", sources: ["faostat_2022_2024"] },
  coffee: { basis: "source", sources: ["usda_fas_coffee"] },
  crude_oil: { basis: "source", sources: ["eia_crude_oil"] },
  natural_gas: { basis: "source", sources: ["eia_natural_gas"] },
};

/**
 * Provenance **par événement** de `events` — une source par événement, jamais
 * la Coupe du monde et les Jeux olympiques en bloc : la légende ne cite que
 * les événements qu'un pays a réellement accueillis (cf. `event_*_host`).
 */
export const EVENT_PROVENANCE: {
  readonly [K in CountryEvent]: FactProvenance;
} = {
  fifa_wc_host: { basis: "source", sources: ["fifa_world_cup"] },
  summer_olympics_host: { basis: "source", sources: ["ioc_olympic_hosts"] },
  winter_olympics_host: { basis: "source", sources: ["ioc_olympic_hosts"] },
};
