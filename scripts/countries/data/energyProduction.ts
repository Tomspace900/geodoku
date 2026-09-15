import type { EnergyProductionSnapshot } from "./types";

/**
 * Classements mondiaux de production d'énergie (pétrole brut, gaz naturel sec).
 *
 * Source : [U.S. EIA International Data](https://www.eia.gov/international/data/world).
 * Porté du snapshot `energy-production` de la branche `constraint-explorer`
 * (commit 221b42d). `value` = volume source : pétrole en milliers de barils par
 * jour (référence 2025), gaz sec en milliards de m³ (référence 2024).
 *
 * **Trim de curation** : la source classe ~190 pays, dont la longue traîne de
 * producteurs quasi nuls. On conserve le **top 18 par produit** — deux crans
 * au-delà du seuil de la contrainte la plus large (top 15) — et on écarte le
 * reste : hors de portée de toute contrainte, et 2 500 lignes de `value: 0`.
 *
 * Révision : reproduire chaque classement mondial séparément, garder les volumes
 * sources, normaliser en ISO3, contrôler les égalités au seuil du top 15. Ne pas
 * substituer réserves ou exportations à la production.
 */
export const ENERGY_PRODUCTION: EnergyProductionSnapshot = {
  source: "U.S. EIA International (via constraint-explorer 221b42d)",
  sourceUpdatedAt: "2026-07-02T16:19:06-04:00",
  products: {
    crude_oil: {
      referenceYear: 2025,
      unit: "thousand_barrels_per_day",
      rankings: [
        { countryCode: "USA", rank: 1, value: 13586.086904109588 },
        { countryCode: "RUS", rank: 2, value: 9885.10903296257 },
        { countryCode: "SAU", rank: 3, value: 9556.054035616438 },
        { countryCode: "CAN", rank: 4, value: 4963.934906849316 },
        { countryCode: "IRQ", rank: 5, value: 4388.068493150685 },
        { countryCode: "CHN", rank: 6, value: 4324.684931506849 },
        { countryCode: "IRN", rank: 7, value: 4051.4246575342468 },
        { countryCode: "ARE", rank: 8, value: 3771.219178082192 },
        { countryCode: "BRA", rank: 9, value: 3769.407010164946 },
        { countryCode: "KWT", rank: 10, value: 2583.5479452054797 },
        { countryCode: "KAZ", rank: 11, value: 2046.610159015274 },
        { countryCode: "NOR", rank: 12, value: 1858.4642345479451 },
        { countryCode: "MEX", rank: 13, value: 1726.046087671233 },
        { countryCode: "NGA", rank: 14, value: 1605.4142781736975 },
        { countryCode: "LBY", rank: 15, value: 1363.041095890411 },
        { countryCode: "QAT", rank: 16, value: 1297.384436580822 },
        { countryCode: "DZA", rank: 17, value: 1142.958904109589 },
        { countryCode: "AGO", rank: 18, value: 1030.8147238615236 },
      ],
    },
    dry_natural_gas: {
      referenceYear: 2024,
      unit: "billion_cubic_meters",
      rankings: [
        { countryCode: "USA", rank: 1, value: 1069.4311709782937 },
        { countryCode: "RUS", rank: 2, value: 642.0409745112812 },
        { countryCode: "IRN", rank: 3, value: 279.00145892607986 },
        { countryCode: "CHN", rank: 4, value: 258.4436224064633 },
        { countryCode: "CAN", rank: 5, value: 198.95219361392827 },
        { countryCode: "QAT", rank: 6, value: 169.95443088929267 },
        { countryCode: "AUS", rank: 7, value: 152.17628088921506 },
        { countryCode: "NOR", rank: 8, value: 130.91798200357718 },
        { countryCode: "SAU", rank: 9, value: 123.38515474590736 },
        { countryCode: "DZA", rank: 10, value: 98.80507972803824 },
        { countryCode: "MYS", rank: 11, value: 80.5776454368299 },
        { countryCode: "TKM", rank: 12, value: 77.60007314770155 },
        { countryCode: "IDN", rank: 13, value: 69.79688711592816 },
        { countryCode: "ARE", rank: 14, value: 59.411250179407254 },
        { countryCode: "EGY", rank: 15, value: 47.47230389274829 },
        { countryCode: "ARG", rank: 16, value: 46.78011811623545 },
        { countryCode: "UZB", rank: 17, value: 46.19846063755099 },
        { countryCode: "OMN", rank: 18, value: 44.349334903661116 },
      ],
    },
  },
} as const satisfies EnergyProductionSnapshot;
