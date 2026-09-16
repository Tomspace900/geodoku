/**
 * Registre "à propos" des contraintes (source, millésime, clarification),
 * affiché par le toast joueur. Séparé de `index.ts` : Convex n'importe que
 * `index.ts`, et ce texte joueur n'a rien à faire côté serveur.
 *
 * Le type `AboutRegistry` verrouille la correspondance clé ↔ contenu, comme
 * `ANSWER_SETS` dans `index.ts`.
 */

import area_gt_2M from "./area_gt_2M/about";
import area_gt_500k from "./area_gt_500k/about";
import area_larger_france from "./area_larger_france/about";
import area_larger_india from "./area_larger_india/about";
import area_larger_mexico from "./area_larger_mexico/about";
import area_lt_1k from "./area_lt_1k/about";
import area_smaller_belgium from "./area_smaller_belgium/about";
import area_smaller_luxembourg from "./area_smaller_luxembourg/about";
import borders_brazil from "./borders_brazil/about";
import borders_china from "./borders_china/about";
import borders_india from "./borders_india/about";
import borders_min_5 from "./borders_min_5/about";
import borders_min_7 from "./borders_min_7/about";
import borders_russia from "./borders_russia/about";
import borders_solo from "./borders_solo/about";
import continent_africa from "./continent_africa/about";
import continent_asia from "./continent_asia/about";
import continent_europe from "./continent_europe/about";
import continent_north_america from "./continent_north_america/about";
import continent_oceania from "./continent_oceania/about";
import continent_south_america from "./continent_south_america/about";
import density_high from "./density_high/about";
import density_less_canada from "./density_less_canada/about";
import density_less_russia from "./density_less_russia/about";
import density_low from "./density_low/about";
import density_more_japan from "./density_more_japan/about";
import density_more_netherlands from "./density_more_netherlands/about";
import energy_coal_electricity_majority from "./energy_coal_electricity_majority/about";
import event_fifa_wc_host from "./event_fifa_wc_host/about";
import event_summer_olympics_host from "./event_summer_olympics_host/about";
import event_winter_olympics_host from "./event_winter_olympics_host/about";
import flag_has_animal from "./flag_has_animal/about";
import flag_has_crescent from "./flag_has_crescent/about";
import flag_has_cross from "./flag_has_cross/about";
import flag_has_star from "./flag_has_star/about";
import flag_two_colors from "./flag_two_colors/about";
import forest_cover_majority from "./forest_cover_majority/about";
import history_from_france from "./history_from_france/about";
import history_from_united_kingdom from "./history_from_united_kingdom/about";
import history_sovereignty_since_1990 from "./history_sovereignty_since_1990/about";
import type { ConstraintId } from "./index";
import language_arabic from "./language_arabic/about";
import language_english from "./language_english/about";
import language_french from "./language_french/about";
import language_multilingual from "./language_multilingual/about";
import language_portuguese from "./language_portuguese/about";
import language_russian from "./language_russian/about";
import language_spanish from "./language_spanish/about";
import latitude_polar from "./latitude_polar/about";
import latitude_south_hemisphere from "./latitude_south_hemisphere/about";
import nature_active_volcano from "./nature_active_volcano/about";
import nature_desert from "./nature_desert/about";
import nature_holocene_volcano from "./nature_holocene_volcano/about";
import nature_mountain_area_majority from "./nature_mountain_area_majority/about";
import nature_rainforest from "./nature_rainforest/about";
import ocean_atlantic from "./ocean_atlantic/about";
import ocean_indian from "./ocean_indian/about";
import ocean_multiple_basins from "./ocean_multiple_basins/about";
import ocean_pacific from "./ocean_pacific/about";
import physical_caribbean_coast from "./physical_caribbean_coast/about";
import physical_crosses_equator from "./physical_crosses_equator/about";
import physical_mediterranean_coast from "./physical_mediterranean_coast/about";
import physical_peak_over_5000m from "./physical_peak_over_5000m/about";
import political_commonwealth from "./political_commonwealth/about";
import political_eu from "./political_eu/about";
import political_g20 from "./political_g20/about";
import political_nato from "./political_nato/about";
import political_opec from "./political_opec/about";
import population_gt_30M from "./population_gt_30M/about";
import population_gt_100M from "./population_gt_100M/about";
import population_less_iceland from "./population_less_iceland/about";
import population_lt_1M from "./population_lt_1M/about";
import population_lt_2_5M from "./population_lt_2_5M/about";
import population_more_canada from "./population_more_canada/about";
import population_more_germany from "./population_more_germany/about";
import production_cocoa_top10 from "./production_cocoa_top10/about";
import production_coffee_top10 from "./production_coffee_top10/about";
import production_crude_oil_top15 from "./production_crude_oil_top15/about";
import production_natural_gas_top15 from "./production_natural_gas_top15/about";
import production_rice_top10 from "./production_rice_top10/about";
import production_wheat_top10 from "./production_wheat_top10/about";
import regime_monarchy from "./regime_monarchy/about";
import society_capital_not_largest from "./society_capital_not_largest/about";
import society_drives_on_left from "./society_drives_on_left/about";
import subregion_caribbean from "./subregion_caribbean/about";
import subregion_middle_east from "./subregion_middle_east/about";
import subregion_southeast_asia from "./subregion_southeast_asia/about";
import time_zones_multiple from "./time_zones_multiple/about";
import type { ConstraintAbout } from "./type";
import water_island from "./water_island/about";
import water_landlocked from "./water_landlocked/about";

type AboutRegistry = { [K in ConstraintId]: ConstraintAbout<K> };

const ABOUTS = {
  area_gt_2M,
  area_gt_500k,
  area_larger_france,
  area_larger_india,
  area_larger_mexico,
  area_lt_1k,
  area_smaller_belgium,
  area_smaller_luxembourg,
  borders_brazil,
  borders_china,
  borders_india,
  borders_min_5,
  borders_min_7,
  borders_russia,
  borders_solo,
  continent_africa,
  continent_asia,
  continent_europe,
  continent_north_america,
  continent_oceania,
  continent_south_america,
  density_high,
  density_less_canada,
  density_less_russia,
  density_low,
  density_more_japan,
  density_more_netherlands,
  energy_coal_electricity_majority,
  event_fifa_wc_host,
  event_summer_olympics_host,
  event_winter_olympics_host,
  flag_has_animal,
  flag_has_crescent,
  flag_has_cross,
  flag_has_star,
  flag_two_colors,
  forest_cover_majority,
  history_from_france,
  history_from_united_kingdom,
  history_sovereignty_since_1990,
  language_arabic,
  language_english,
  language_french,
  language_multilingual,
  language_portuguese,
  language_russian,
  language_spanish,
  latitude_polar,
  latitude_south_hemisphere,
  nature_active_volcano,
  nature_desert,
  nature_holocene_volcano,
  nature_mountain_area_majority,
  nature_rainforest,
  ocean_atlantic,
  ocean_indian,
  ocean_multiple_basins,
  ocean_pacific,
  physical_caribbean_coast,
  physical_crosses_equator,
  physical_mediterranean_coast,
  physical_peak_over_5000m,
  political_commonwealth,
  political_eu,
  political_g20,
  political_nato,
  political_opec,
  population_gt_100M,
  population_gt_30M,
  population_less_iceland,
  population_lt_1M,
  population_lt_2_5M,
  population_more_canada,
  population_more_germany,
  production_cocoa_top10,
  production_coffee_top10,
  production_crude_oil_top15,
  production_natural_gas_top15,
  production_rice_top10,
  production_wheat_top10,
  regime_monarchy,
  society_capital_not_largest,
  society_drives_on_left,
  subregion_caribbean,
  subregion_middle_east,
  subregion_southeast_asia,
  time_zones_multiple,
  water_island,
  water_landlocked,
} satisfies AboutRegistry;

/** Contenu "à propos" (sources, millésime, clarification) d'une contrainte active ou archivée. */
export function aboutForConstraint(
  constraintId: ConstraintId,
): ConstraintAbout<ConstraintId> {
  return ABOUTS[constraintId];
}
