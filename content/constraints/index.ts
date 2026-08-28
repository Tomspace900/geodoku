/**
 * Registre des listes de réponses éditoriales.
 *
 * Le type `AnswerSetRegistry` verrouille la correspondance clé ↔ contenu : un
 * identifiant manquant, en trop ou branché sur le mauvais dossier est une erreur
 * de compilation, pas une dérive détectée à l'exécution.
 */

import type { CountryCode } from "../countries/countryCodes";
import area_gt_2M from "./area_gt_2M/answers";
import area_gt_500k from "./area_gt_500k/answers";
import area_larger_france from "./area_larger_france/answers";
import area_larger_india from "./area_larger_india/answers";
import area_larger_mexico from "./area_larger_mexico/answers";
import area_lt_1k from "./area_lt_1k/answers";
import area_smaller_belgium from "./area_smaller_belgium/answers";
import area_smaller_luxembourg from "./area_smaller_luxembourg/answers";
import borders_brazil from "./borders_brazil/answers";
import borders_china from "./borders_china/answers";
import borders_india from "./borders_india/answers";
import borders_min_5 from "./borders_min_5/answers";
import borders_min_7 from "./borders_min_7/answers";
import borders_russia from "./borders_russia/answers";
import borders_solo from "./borders_solo/answers";
import continent_africa from "./continent_africa/answers";
import continent_asia from "./continent_asia/answers";
import continent_europe from "./continent_europe/answers";
import continent_north_america from "./continent_north_america/answers";
import continent_oceania from "./continent_oceania/answers";
import continent_south_america from "./continent_south_america/answers";
import density_high from "./density_high/answers";
import density_less_canada from "./density_less_canada/answers";
import density_less_russia from "./density_less_russia/answers";
import density_low from "./density_low/answers";
import density_more_japan from "./density_more_japan/answers";
import density_more_netherlands from "./density_more_netherlands/answers";
import event_fifa_wc_host from "./event_fifa_wc_host/answers";
import event_summer_olympics_host from "./event_summer_olympics_host/answers";
import event_winter_olympics_host from "./event_winter_olympics_host/answers";
import flag_has_animal from "./flag_has_animal/answers";
import flag_has_crescent from "./flag_has_crescent/answers";
import flag_has_cross from "./flag_has_cross/answers";
import flag_has_star from "./flag_has_star/answers";
import flag_two_colors from "./flag_two_colors/answers";
import language_arabic from "./language_arabic/answers";
import language_english from "./language_english/answers";
import language_french from "./language_french/answers";
import language_multilingual from "./language_multilingual/answers";
import language_portuguese from "./language_portuguese/answers";
import language_russian from "./language_russian/answers";
import language_spanish from "./language_spanish/answers";
import latitude_polar from "./latitude_polar/answers";
import latitude_south_hemisphere from "./latitude_south_hemisphere/answers";
import nature_desert from "./nature_desert/answers";
import nature_rainforest from "./nature_rainforest/answers";
import ocean_atlantic from "./ocean_atlantic/answers";
import ocean_indian from "./ocean_indian/answers";
import ocean_pacific from "./ocean_pacific/answers";
import physical_caribbean_coast from "./physical_caribbean_coast/answers";
import physical_crosses_equator from "./physical_crosses_equator/answers";
import physical_mediterranean_coast from "./physical_mediterranean_coast/answers";
import physical_peak_over_5000m from "./physical_peak_over_5000m/answers";
import political_arab_league from "./political_arab_league/answers";
import political_asean from "./political_asean/answers";
import political_brics from "./political_brics/answers";
import political_commonwealth from "./political_commonwealth/answers";
import political_eu from "./political_eu/answers";
import political_eurozone from "./political_eurozone/answers";
import political_g7 from "./political_g7/answers";
import political_g20 from "./political_g20/answers";
import political_nato from "./political_nato/answers";
import political_opec from "./political_opec/answers";
import political_schengen from "./political_schengen/answers";
import population_gt_30M from "./population_gt_30M/answers";
import population_gt_100M from "./population_gt_100M/answers";
import population_less_iceland from "./population_less_iceland/answers";
import population_lt_1M from "./population_lt_1M/answers";
import population_lt_2_5M from "./population_lt_2_5M/answers";
import population_more_canada from "./population_more_canada/answers";
import population_more_germany from "./population_more_germany/answers";
import regime_monarchy from "./regime_monarchy/answers";
import society_capital_not_largest from "./society_capital_not_largest/answers";
import society_drives_on_left from "./society_drives_on_left/answers";
import subregion_caribbean from "./subregion_caribbean/answers";
import subregion_middle_east from "./subregion_middle_east/answers";
import subregion_southeast_asia from "./subregion_southeast_asia/answers";
import type { ConstraintAnswerSet } from "./type";
import water_island from "./water_island/answers";
import water_landlocked from "./water_landlocked/answers";

/** Contraintes générables. L'ordre fait foi pour `CONSTRAINTS` côté runtime. */
export const CONSTRAINT_IDS = [
  "continent_africa",
  "continent_asia",
  "continent_europe",
  "continent_north_america",
  "continent_south_america",
  "continent_oceania",
  "water_island",
  "water_landlocked",
  "borders_solo",
  "borders_min_5",
  "borders_min_7",
  "borders_russia",
  "borders_china",
  "borders_brazil",
  "borders_india",
  "area_larger_india",
  "area_larger_mexico",
  "area_larger_france",
  "area_smaller_belgium",
  "area_smaller_luxembourg",
  "population_more_germany",
  "population_more_canada",
  "population_less_iceland",
  "language_french",
  "language_arabic",
  "language_spanish",
  "language_english",
  "language_portuguese",
  "language_russian",
  "flag_has_star",
  "flag_has_crescent",
  "flag_has_cross",
  "flag_has_animal",
  "latitude_south_hemisphere",
  "latitude_polar",
  "subregion_middle_east",
  "subregion_caribbean",
  "subregion_southeast_asia",
  "event_fifa_wc_host",
  "event_summer_olympics_host",
  "event_winter_olympics_host",
  "political_eu",
  "political_g20",
  "political_nato",
  "political_commonwealth",
  "political_arab_league",
  "political_asean",
  "political_brics",
  "political_eurozone",
  "political_g7",
  "political_opec",
  "political_schengen",
  "regime_monarchy",
  "physical_crosses_equator",
  "physical_mediterranean_coast",
  "physical_caribbean_coast",
  "physical_peak_over_5000m",
  "density_more_netherlands",
  "density_more_japan",
  "density_less_russia",
  "density_less_canada",
  "nature_desert",
  "nature_rainforest",
  "ocean_atlantic",
  "ocean_pacific",
  "ocean_indian",
  "society_drives_on_left",
  "society_capital_not_largest",
] as const;

/** Contraintes hors génération, conservées pour rejouer les anciennes grilles. */
export const ARCHIVED_CONSTRAINT_IDS = [
  "flag_two_colors",
  "area_gt_2M",
  "area_gt_500k",
  "area_lt_1k",
  "density_high",
  "density_low",
  "language_multilingual",
  "population_gt_100M",
  "population_gt_30M",
  "population_lt_1M",
  "population_lt_2_5M",
] as const;

/** Contrainte générable — clé de `DERIVATIONS`. */
export type ActiveConstraintId = (typeof CONSTRAINT_IDS)[number];

/** Identifiant stable possédé par le contenu, actif ou archivé. */
export type ConstraintId =
  | (typeof CONSTRAINT_IDS)[number]
  | (typeof ARCHIVED_CONSTRAINT_IDS)[number];

type AnswerSetRegistry = { [K in ConstraintId]: ConstraintAnswerSet<K> };

const ANSWER_SETS = {
  continent_africa,
  continent_asia,
  continent_europe,
  continent_north_america,
  continent_south_america,
  continent_oceania,
  water_island,
  water_landlocked,
  borders_solo,
  borders_min_5,
  borders_min_7,
  borders_russia,
  borders_china,
  borders_brazil,
  borders_india,
  area_larger_india,
  area_larger_mexico,
  area_larger_france,
  area_smaller_belgium,
  area_smaller_luxembourg,
  population_more_germany,
  population_more_canada,
  population_less_iceland,
  language_french,
  language_arabic,
  language_spanish,
  language_english,
  language_portuguese,
  language_russian,
  flag_has_star,
  flag_has_crescent,
  flag_has_cross,
  flag_has_animal,
  latitude_south_hemisphere,
  latitude_polar,
  subregion_middle_east,
  subregion_caribbean,
  subregion_southeast_asia,
  event_fifa_wc_host,
  event_summer_olympics_host,
  event_winter_olympics_host,
  political_eu,
  political_g20,
  political_nato,
  political_commonwealth,
  political_arab_league,
  political_asean,
  political_brics,
  political_eurozone,
  political_g7,
  political_opec,
  political_schengen,
  regime_monarchy,
  physical_crosses_equator,
  physical_mediterranean_coast,
  physical_caribbean_coast,
  physical_peak_over_5000m,
  density_more_netherlands,
  density_more_japan,
  density_less_russia,
  density_less_canada,
  nature_desert,
  nature_rainforest,
  ocean_atlantic,
  ocean_pacific,
  ocean_indian,
  society_drives_on_left,
  society_capital_not_largest,
  flag_two_colors,
  area_gt_2M,
  area_gt_500k,
  area_lt_1k,
  density_high,
  density_low,
  language_multilingual,
  population_gt_100M,
  population_gt_30M,
  population_lt_1M,
  population_lt_2_5M,
} satisfies AnswerSetRegistry;

/** Listes éditoriales dans l'ordre du catalogue : actives d'abord, archivées ensuite. */
export const CONSTRAINT_ANSWER_SETS: readonly ConstraintAnswerSet<ConstraintId>[] =
  [...CONSTRAINT_IDS, ...ARCHIVED_CONSTRAINT_IDS].map((id) => ANSWER_SETS[id]);

/** Accès partagé aux listes éditoriales, sans dépendance au modèle applicatif. */
export function answersForConstraint(
  constraintId: ConstraintId,
): readonly CountryCode[] {
  return ANSWER_SETS[constraintId].answers;
}
