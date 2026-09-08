import type { AgriculturalProductionSnapshot } from "./types";

/**
 * Classements mondiaux de production agricole (top 10 par produit).
 *
 * Source : [FAOSTAT](https://www.fao.org/faostat/), production territoriale par
 * produit et par pays. `value` = moyenne des campagnes 2022-2024, en tonnes.
 * Porté du snapshot `agricultural-production` de la branche `constraint-explorer`
 * (commit 221b42d), lui-même moissonné de FAOSTAT.
 *
 * Le café utilise l'item FAOSTAT « Coffee, green » (série mondiale comparable) et
 * le riz le « paddy » (avant décorticage). La mesure est la production, jamais
 * les exportations ni les réserves.
 *
 * Révision : réexporter les mêmes produits et unités, normaliser en ISO3,
 * recalculer la moyenne triennale et les rangs, contrôler les égalités au seuil
 * du top 10, puis remplacer le bloc complet.
 */
export const AGRICULTURAL_PRODUCTION: AgriculturalProductionSnapshot = {
  source: "FAOSTAT (via constraint-explorer 221b42d)",
  referenceYears: [2022, 2023, 2024],
  products: {
    cocoa_beans: [
      { countryCode: "CIV", rank: 1, value: 2023958 },
      { countryCode: "IDN", rank: 2, value: 638477 },
      { countryCode: "GHA", rank: 3, value: 622333 },
      { countryCode: "ECU", rank: 4, value: 372189 },
      { countryCode: "NGA", rank: 5, value: 333333 },
      { countryCode: "CMR", rank: 6, value: 305000 },
      { countryCode: "BRA", rank: 7, value: 298216 },
      { countryCode: "PER", rank: 8, value: 165631 },
      { countryCode: "DOM", rank: 9, value: 64391 },
      { countryCode: "COL", rank: 10, value: 63222 },
    ],
    coffee_green: [
      { countryCode: "BRA", rank: 1, value: 3305192 },
      { countryCode: "VNM", rank: 2, value: 1975354 },
      { countryCode: "IDN", rank: 3, value: 780421 },
      { countryCode: "COL", rank: 4, value: 728573 },
      { countryCode: "ETH", rank: 5, value: 560221 },
      { countryCode: "UGA", rank: 6, value: 459000 },
      { countryCode: "PER", rank: 7, value: 361093 },
      { countryCode: "IND", rank: 8, value: 358500 },
      { countryCode: "HND", rank: 9, value: 346162 },
      { countryCode: "CAF", rank: 10, value: 315977 },
    ],
    rice_paddy: [
      { countryCode: "CHN", rank: 1, value: 207542667 },
      { countryCode: "IND", rank: 2, value: 206364902 },
      { countryCode: "BGD", rank: 3, value: 59649218 },
      { countryCode: "IDN", rank: 4, value: 53957566 },
      { countryCode: "VNM", rank: 5, value: 43202957 },
      { countryCode: "THA", rank: 6, value: 33428616 },
      { countryCode: "MMR", rank: 7, value: 27094367 },
      { countryCode: "PHL", rank: 8, value: 19634404 },
      { countryCode: "PAK", rank: 9, value: 13452388 },
      { countryCode: "KHM", rank: 10, value: 13079367 },
    ],
    wheat: [
      { countryCode: "CHN", rank: 1, value: 138136700 },
      { countryCode: "IND", rank: 2, value: 110529371 },
      { countryCode: "RUS", rank: 3, value: 93197315 },
      { countryCode: "USA", rank: 4, value: 49287260 },
      { countryCode: "CAN", rank: 5, value: 34741740 },
      { countryCode: "AUS", rank: 6, value: 34445972 },
      { countryCode: "FRA", rank: 7, value: 32411630 },
      { countryCode: "PAK", rank: 8, value: 28727881 },
      { countryCode: "UKR", rank: 9, value: 21598507 },
      { countryCode: "DEU", rank: 10, value: 20883300 },
    ],
  },
} as const satisfies AgriculturalProductionSnapshot;
