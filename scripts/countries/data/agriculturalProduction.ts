import type { AgriculturalProductionSnapshot } from "./types";

const FAOSTAT = "FAOSTAT (via constraint-explorer 221b42d)";

/**
 * Classements mondiaux de production agricole (top 10 par produit).
 *
 * Cacao, riz et blé : [FAOSTAT](https://www.fao.org/faostat/), production
 * territoriale, moyenne des campagnes 2022-2024, en tonnes. Le riz utilise le
 * « paddy » (avant décorticage). La mesure est la production, jamais les
 * exportations ni les réserves.
 *
 * **Le café fait exception** : il est sourcé sur l'USDA-FAS depuis la revue
 * métier 2026-09-10. La série FAOSTAT « Coffee, green » classait la République
 * centrafricaine au 10ᵉ rang mondial (316 kt) — une imputation de la FAO, la
 * production réelle du pays se comptant en milliers de tonnes — et écartait de
 * ce fait le Mexique du top 10. Chaque bloc porte donc sa propre source.
 *
 * Révision : reproduire chaque classement à sa source, normaliser en ISO3,
 * recalculer la moyenne triennale et les rangs, contrôler les égalités au seuil
 * du top 10, puis remplacer le bloc complet.
 */
export const AGRICULTURAL_PRODUCTION: AgriculturalProductionSnapshot = {
  products: {
    cocoa_beans: {
      source: FAOSTAT,
      referenceYears: [2022, 2023, 2024],
      unit: "tonnes",
      rankings: [
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
    },
    coffee_green: {
      source:
        "U.S. Department of Agriculture, Foreign Agricultural Service — Coffee: World Markets and Trade (juillet 2026)",
      referenceYears: [2023, 2024, 2025],
      unit: "thousand_60kg_bags",
      rankings: [
        { countryCode: "BRA", rank: 1, value: 64933.3 },
        { countryCode: "VNM", rank: 2, value: 29416.7 },
        { countryCode: "COL", rank: 3, value: 13353.3 },
        { countryCode: "ETH", rank: 4, value: 10716.7 },
        { countryCode: "IDN", rank: 5, value: 10406.7 },
        { countryCode: "UGA", rank: 6, value: 6731.7 },
        { countryCode: "IND", rank: 7, value: 6349.7 },
        { countryCode: "HND", rank: 8, value: 5260 },
        { countryCode: "PER", rank: 9, value: 4265.3 },
        { countryCode: "MEX", rank: 10, value: 3954.7 },
      ],
    },
    rice_paddy: {
      source: FAOSTAT,
      referenceYears: [2022, 2023, 2024],
      unit: "tonnes",
      rankings: [
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
    },
    wheat: {
      source: FAOSTAT,
      referenceYears: [2022, 2023, 2024],
      unit: "tonnes",
      rankings: [
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
  },
} as const satisfies AgriculturalProductionSnapshot;
