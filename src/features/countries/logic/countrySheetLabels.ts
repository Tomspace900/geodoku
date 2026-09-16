import type { TKey } from "@/i18n/types";
import type {
  CapitalRole,
  Continent,
  DrivingSide,
  FlagColor,
  FlagLayout,
  FlagSymbol,
  FormerSovereign,
  PhysicalFeature,
  PoliticalGroup,
  ProductionRankKey,
  Regime,
  SovereigntyKind,
  WaterAccess,
} from "../types";

/**
 * Libellés d'énumération pour la fiche pays — tables exhaustives
 * (`Record<Enum, TKey>`) : une clé manquante échoue au typecheck. Distincts
 * des libellés `constraint.*`, formulés comme des contraintes joueur
 * (« Pays d'Afrique ») plutôt que comme des valeurs de fiche (« Afrique »).
 */

export const CONTINENT_LABELS: Record<Continent, TKey> = {
  africa: "countrySheet.enum.continent.africa",
  asia: "countrySheet.enum.continent.asia",
  europe: "countrySheet.enum.continent.europe",
  north_america: "countrySheet.enum.continent.northAmerica",
  south_america: "countrySheet.enum.continent.southAmerica",
  oceania: "countrySheet.enum.continent.oceania",
};

export const WATER_ACCESS_LABELS: Record<WaterAccess, TKey> = {
  landlocked: "countrySheet.enum.waterAccess.landlocked",
  coastal: "countrySheet.enum.waterAccess.coastal",
  island: "countrySheet.enum.waterAccess.island",
};

/**
 * Les 24 sous-régions ONU observées dans le snapshot (`world-countries`).
 * Champ source (`CountryFacts.subregion`) en chaîne libre, pas en union TS :
 * cette table n'est donc exhaustive que sur les valeurs **actuellement**
 * présentes — une 25ᵉ sous-région introduite par une regen échouerait
 * silencieusement au lookup (repli sur le code brut, cf. `countrySheet.ts`).
 */
export const SUBREGION_LABELS: Record<string, TKey> = {
  "Australia and New Zealand":
    "countrySheet.enum.subregion.australiaNewZealand",
  Caribbean: "countrySheet.enum.subregion.caribbean",
  "Central America": "countrySheet.enum.subregion.centralAmerica",
  "Central Asia": "countrySheet.enum.subregion.centralAsia",
  "Central Europe": "countrySheet.enum.subregion.centralEurope",
  "Eastern Africa": "countrySheet.enum.subregion.easternAfrica",
  "Eastern Asia": "countrySheet.enum.subregion.easternAsia",
  "Eastern Europe": "countrySheet.enum.subregion.easternEurope",
  Melanesia: "countrySheet.enum.subregion.melanesia",
  Micronesia: "countrySheet.enum.subregion.micronesia",
  "Middle Africa": "countrySheet.enum.subregion.middleAfrica",
  "North America": "countrySheet.enum.subregion.northAmerica",
  "Northern Africa": "countrySheet.enum.subregion.northernAfrica",
  "Northern Europe": "countrySheet.enum.subregion.northernEurope",
  Polynesia: "countrySheet.enum.subregion.polynesia",
  "South America": "countrySheet.enum.subregion.southAmerica",
  "South-Eastern Asia": "countrySheet.enum.subregion.southEasternAsia",
  "Southeast Europe": "countrySheet.enum.subregion.southeastEurope",
  "Southern Africa": "countrySheet.enum.subregion.southernAfrica",
  "Southern Asia": "countrySheet.enum.subregion.southernAsia",
  "Southern Europe": "countrySheet.enum.subregion.southernEurope",
  "Western Africa": "countrySheet.enum.subregion.westernAfrica",
  "Western Asia": "countrySheet.enum.subregion.westernAsia",
  "Western Europe": "countrySheet.enum.subregion.westernEurope",
};

/** Les 10 membres de `PhysicalFeature`, réutilisés par façades/milieux/équateur/sommet. */
export const PHYSICAL_FEATURE_LABELS: Record<PhysicalFeature, TKey> = {
  equator_crosser: "countrySheet.enum.physicalFeature.equatorCrosser",
  mediterranean_coast: "countrySheet.enum.physicalFeature.mediterraneanCoast",
  caribbean_coast: "countrySheet.enum.physicalFeature.caribbeanCoast",
  peak_over_5000m: "countrySheet.enum.physicalFeature.peakOver5000m",
  has_desert: "countrySheet.enum.physicalFeature.hasDesert",
  rainforest: "countrySheet.enum.physicalFeature.rainforest",
  atlantic_coast: "countrySheet.enum.physicalFeature.atlanticCoast",
  pacific_coast: "countrySheet.enum.physicalFeature.pacificCoast",
  indian_ocean_coast: "countrySheet.enum.physicalFeature.indianOceanCoast",
  arctic_coast: "countrySheet.enum.physicalFeature.arcticCoast",
};

/** Façades maritimes : sous-ensemble de `PhysicalFeature`, ordre d'affichage fixe. */
export const COASTLINE_FEATURES: readonly PhysicalFeature[] = [
  "atlantic_coast",
  "pacific_coast",
  "indian_ocean_coast",
  "arctic_coast",
  "mediterranean_coast",
  "caribbean_coast",
];

/** Milieux notables : sous-ensemble de `PhysicalFeature`, ordre d'affichage fixe. */
export const BIOME_FEATURES: readonly PhysicalFeature[] = [
  "has_desert",
  "rainforest",
];

export const FLAG_COLOR_LABELS: Record<FlagColor, TKey> = {
  red: "countrySheet.enum.flagColor.red",
  blue: "countrySheet.enum.flagColor.blue",
  green: "countrySheet.enum.flagColor.green",
  yellow: "countrySheet.enum.flagColor.yellow",
  white: "countrySheet.enum.flagColor.white",
  black: "countrySheet.enum.flagColor.black",
  orange: "countrySheet.enum.flagColor.orange",
};

export const FLAG_SYMBOL_LABELS: Record<FlagSymbol, TKey> = {
  star: "countrySheet.enum.flagSymbol.star",
  crescent: "countrySheet.enum.flagSymbol.crescent",
  cross: "countrySheet.enum.flagSymbol.cross",
  sun: "countrySheet.enum.flagSymbol.sun",
  circle: "countrySheet.enum.flagSymbol.circle",
  triangle: "countrySheet.enum.flagSymbol.triangle",
  animal: "countrySheet.enum.flagSymbol.animal",
  plant: "countrySheet.enum.flagSymbol.plant",
};

export const FLAG_LAYOUT_LABELS: Record<FlagLayout, TKey> = {
  vertical_stripes: "countrySheet.enum.flagLayout.verticalStripes",
  horizontal_stripes: "countrySheet.enum.flagLayout.horizontalStripes",
};

export const EVENT_LABELS: Record<string, TKey> = {
  fifa_wc_host: "countrySheet.enum.event.fifaWcHost",
  summer_olympics_host: "countrySheet.enum.event.summerOlympicsHost",
  winter_olympics_host: "countrySheet.enum.event.winterOlympicsHost",
};

export const POLITICAL_GROUP_LABELS: Record<PoliticalGroup, TKey> = {
  arab_league: "countrySheet.enum.politicalGroup.arabLeague",
  asean: "countrySheet.enum.politicalGroup.asean",
  brics: "countrySheet.enum.politicalGroup.brics",
  commonwealth: "countrySheet.enum.politicalGroup.commonwealth",
  eu: "countrySheet.enum.politicalGroup.eu",
  eurozone: "countrySheet.enum.politicalGroup.eurozone",
  g20: "countrySheet.enum.politicalGroup.g20",
  g7: "countrySheet.enum.politicalGroup.g7",
  nato: "countrySheet.enum.politicalGroup.nato",
  oecd: "countrySheet.enum.politicalGroup.oecd",
  opec: "countrySheet.enum.politicalGroup.opec",
  schengen: "countrySheet.enum.politicalGroup.schengen",
  african_union: "countrySheet.enum.politicalGroup.africanUnion",
};

/** Ordre d'affichage fixe des adhésions, plutôt que l'ordre d'insertion du dataset. */
export const POLITICAL_GROUP_ORDER: readonly PoliticalGroup[] = [
  "eu",
  "eurozone",
  "schengen",
  "nato",
  "g7",
  "g20",
  "brics",
  "oecd",
  "opec",
  "commonwealth",
  "african_union",
  "arab_league",
  "asean",
];

export const FORMER_SOVEREIGN_LABELS: Record<FormerSovereign, TKey> = {
  belgium: "countrySheet.enum.formerSovereign.belgium",
  france: "countrySheet.enum.formerSovereign.france",
  netherlands: "countrySheet.enum.formerSovereign.netherlands",
  portugal: "countrySheet.enum.formerSovereign.portugal",
  soviet_union: "countrySheet.enum.formerSovereign.sovietUnion",
  spain: "countrySheet.enum.formerSovereign.spain",
  united_kingdom: "countrySheet.enum.formerSovereign.unitedKingdom",
  united_states: "countrySheet.enum.formerSovereign.unitedStates",
  yugoslavia: "countrySheet.enum.formerSovereign.yugoslavia",
};

export const SOVEREIGNTY_KIND_LABELS: Record<SovereigntyKind, TKey> = {
  independence: "countrySheet.enum.sovereigntyKind.independence",
  restoration: "countrySheet.enum.sovereigntyKind.restoration",
  separation: "countrySheet.enum.sovereigntyKind.separation",
  dissolution_successor:
    "countrySheet.enum.sovereigntyKind.dissolutionSuccessor",
  continuation: "countrySheet.enum.sovereigntyKind.continuation",
  foundation: "countrySheet.enum.sovereigntyKind.foundation",
  unification: "countrySheet.enum.sovereigntyKind.unification",
};

export const PRODUCTION_LABELS: Record<ProductionRankKey, TKey> = {
  cocoa: "countrySheet.enum.production.cocoa",
  coffee: "countrySheet.enum.production.coffee",
  rice: "countrySheet.enum.production.rice",
  wheat: "countrySheet.enum.production.wheat",
  crude_oil: "countrySheet.enum.production.crudeOil",
  natural_gas: "countrySheet.enum.production.naturalGas",
};

/** Ordre d'affichage fixe des productions. */
export const PRODUCTION_ORDER: readonly ProductionRankKey[] = [
  "wheat",
  "rice",
  "cocoa",
  "coffee",
  "crude_oil",
  "natural_gas",
];

export const DRIVING_SIDE_LABELS: Record<DrivingSide, TKey> = {
  left: "countrySheet.enum.drivingSide.left",
  right: "countrySheet.enum.drivingSide.right",
};

export const CAPITAL_ROLE_LABELS: Record<CapitalRole, TKey> = {
  administrative: "countrySheet.enum.capitalRole.administrative",
  constitutional: "countrySheet.enum.capitalRole.constitutional",
  executive: "countrySheet.enum.capitalRole.executive",
  judicial: "countrySheet.enum.capitalRole.judicial",
  legislative: "countrySheet.enum.capitalRole.legislative",
  primary: "countrySheet.enum.capitalRole.primary",
};

export const REGIME_LABELS: Record<Regime, TKey> = {
  monarchy: "countrySheet.enum.regime.monarchy",
  republic: "countrySheet.enum.regime.republic",
};
