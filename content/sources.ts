/**
 * Registre des sources externes citées par les contraintes (`about.ts`) et,
 * à partir du lot 2, par la provenance des faits pays (`factProvenance.ts`).
 *
 * Une entrée = une source et un millésime. Deux jeux d'un même éditeur à
 * millésimes différents (`eia_crude_oil` / `eia_natural_gas`) font deux
 * entrées. `vintage` porte la période que décrit la donnée, jamais la date de
 * regen ni `checked_at` ; `null` quand la source n'a pas de millésime
 * (nomenclature, drapeaux, frontières).
 */

import type { LocalizedString } from "./type";

export type SourceReference = Readonly<{
  name: LocalizedString;
  url: string;
  vintage: LocalizedString | null;
}>;

export const SOURCES = {
  un_m49: {
    name: { fr: "Nomenclature ONU M49", en: "UN M49 nomenclature" },
    url: "https://unstats.un.org/unsd/methodology/m49/",
    vintage: null,
  },
  world_countries: {
    name: { fr: "world-countries", en: "world-countries" },
    url: "https://github.com/mledoze/countries",
    vintage: null,
  },
  rest_countries: {
    name: { fr: "REST Countries", en: "REST Countries" },
    url: "https://restcountries.com/",
    vintage: null,
  },
  un_flags: {
    name: { fr: "Drapeaux officiels — ONU", en: "Official flags — UN" },
    url: "https://www.un.org/en/about-us/member-states",
    vintage: null,
  },
  iana_tz: {
    name: { fr: "IANA Time Zone Database", en: "IANA Time Zone Database" },
    url: "https://www.iana.org/time-zones",
    vintage: { fr: "au 15 janvier 2026", en: "as of 15 January 2026" },
  },
  fifa_world_cup: {
    name: { fr: "FIFA — Coupe du monde", en: "FIFA — World Cup" },
    url: "https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup",
    vintage: null,
  },
  ioc_olympic_hosts: {
    name: {
      fr: "CIO — villes hôtes olympiques",
      en: "IOC — Olympic host cities",
    },
    url: "https://www.olympics.com/ioc/olympic-games",
    vintage: null,
  },
  cia_factbook_government_type: {
    name: {
      fr: "CIA World Factbook — Régime",
      en: "CIA World Factbook — Government type",
    },
    url: "https://www.cia.gov/the-world-factbook/field/government-type/",
    vintage: null,
  },
  cia_factbook_independence: {
    name: {
      fr: "CIA World Factbook — Indépendance",
      en: "CIA World Factbook — Independence",
    },
    url: "https://www.cia.gov/the-world-factbook/field/independence/",
    vintage: null,
  },
  natural_earth: {
    name: { fr: "Natural Earth", en: "Natural Earth" },
    url: "https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson",
    vintage: null,
  },
  iho_s23: {
    name: {
      fr: "IHO S-23 — Limites des océans et des mers",
      en: "IHO S-23 — Limits of Oceans and Seas",
    },
    url: "https://iho.int/uploads/user/pubs/standards/s-23/S-23_Ed3_1953_EN.pdf",
    vintage: null,
  },
  nasa_modis_mcd12q1: {
    name: { fr: "NASA MODIS MCD12Q1", en: "NASA MODIS MCD12Q1" },
    url: "https://doi.org/10.5067/MODIS/MCD12Q1.061",
    vintage: null,
  },
  smithsonian_gvp: {
    name: {
      fr: "Smithsonian Global Volcanism Program",
      en: "Smithsonian Global Volcanism Program",
    },
    url: "https://volcano.si.edu/",
    vintage: null,
  },
  un_sdg_mountain_area: {
    name: {
      fr: "ODD 15.4.2 — Aire montagneuse",
      en: "SDG 15.4.2 — Mountain area",
    },
    url: "https://unstats.un.org/sdgs/metadata/?Text=&Goal=15&Target=15.4",
    vintage: { fr: "2021", en: "2021" },
  },
  fao_forest_resources: {
    name: {
      fr: "FAO — Évaluation des ressources forestières",
      en: "FAO Forest Resources Assessment",
    },
    url: "https://datacatalog.worldbank.org/search/dataset/0037712/world-development-indicators",
    vintage: { fr: "2023", en: "2023" },
  },
  faostat_2022_2024: {
    name: { fr: "FAOSTAT", en: "FAOSTAT" },
    url: "https://www.fao.org/faostat/",
    vintage: { fr: "moyenne 2022-2024", en: "2022–2024 average" },
  },
  usda_fas_coffee: {
    name: {
      fr: "USDA FAS — Coffee: World Markets and Trade",
      en: "USDA FAS — Coffee: World Markets and Trade",
    },
    url: "https://apps.fas.usda.gov/psdonline/circulars/coffee.pdf",
    vintage: {
      fr: "campagnes 2023/24 à 2025/26",
      en: "2023/24–2025/26 seasons",
    },
  },
  eia_crude_oil: {
    name: { fr: "U.S. EIA — Pétrole brut", en: "U.S. EIA — Crude oil" },
    url: "https://www.eia.gov/international/data/world",
    vintage: { fr: "2025", en: "2025" },
  },
  eia_natural_gas: {
    name: { fr: "U.S. EIA — Gaz naturel", en: "U.S. EIA — Natural gas" },
    url: "https://www.eia.gov/international/data/world",
    vintage: { fr: "2024", en: "2024" },
  },
  ember_electricity: {
    name: { fr: "Ember Data Explorer", en: "Ember Data Explorer" },
    url: "https://ember-energy.org/data/data-tools/data-explorer/",
    vintage: { fr: "2024", en: "2024" },
  },
  ghsl_urban_centre_database: {
    name: {
      fr: "GHSL Urban Centre Database",
      en: "GHSL Urban Centre Database",
    },
    url: "https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php",
    vintage: { fr: "2025", en: "2025" },
  },
} as const satisfies Record<string, SourceReference>;

export type SourceId = keyof typeof SOURCES;
