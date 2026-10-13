import type { TKey } from "@/i18n/types";
import type {
  FlagColor,
  FlagSymbol,
  PhysicalFeature,
  ProductionRankKey,
  SovereigntyKind,
} from "../types";

/**
 * Libellés d'énumération des valeurs de contrainte — tables exhaustives
 * (`Record<Enum, TKey>`) : une clé manquante échoue au typecheck. Distincts des
 * libellés `constraint.*`, formulés comme des contraintes joueur
 * (« Pays d'Afrique ») plutôt que comme des valeurs (« Afrique »).
 */

/** Les membres de `PhysicalFeature` : façades maritimes (océans) ; les autres ne servent pas de valeur. */
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

export const EVENT_LABELS: Record<string, TKey> = {
  fifa_wc_host: "countrySheet.enum.event.fifaWcHost",
  summer_olympics_host: "countrySheet.enum.event.summerOlympicsHost",
  winter_olympics_host: "countrySheet.enum.event.winterOlympicsHost",
};

export const SOVEREIGNTY_KIND_LABELS: Record<SovereigntyKind, TKey> = {
  independence: "countrySheet.enum.sovereigntyKind.independence",
  restoration: "countrySheet.enum.sovereigntyKind.restoration",
  separation: "countrySheet.enum.sovereigntyKind.separation",
  dissolution_successor:
    "countrySheet.enum.sovereigntyKind.dissolution_successor",
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
