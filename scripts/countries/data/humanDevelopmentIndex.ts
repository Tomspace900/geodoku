import type { HumanDevelopmentIndexSnapshot } from "./types";

/**
 * Indice de développement humain (IDH) : [PNUD, *Human Development Report*
 * 2025](https://hdr.undp.org/data-center/documentation-and-downloads),
 * fichier « composite indices complete time series », colonne
 * `hdi_2023` (dernière année de l'édition), lu à
 * `sourceUrl`. `category` est la catégorie que le PNUD publie (`hdicode`) :
 * elle ne sert qu'à la garde de `check:content`, la fiche la recalcule depuis
 * la valeur. Un pays absent du fichier ou sans valeur est dans `missing` avec
 * sa cause. Récolté par `scripts/countries/harvest/humanDevelopmentIndex.ts`
 * (`pnpm harvest:hdi`).
 *
 * **Généré** : ne pas l'éditer à la main.
 */
export const HUMAN_DEVELOPMENT_INDEX: HumanDevelopmentIndexSnapshot = {
  edition: 2025,
  dataYear: 2023,
  sourceUrl:
    "https://hdr.undp.org/sites/default/files/2025_HDR/HDR25_Composite_indices_complete_time_series.csv",
  harvestedAt: "2026-10-09",
  values: {
    AFG: {
      value: 0.496,
      category: "low",
    },
    AGO: {
      value: 0.616,
      category: "medium",
    },
    ALB: {
      value: 0.81,
      category: "very_high",
    },
    AND: {
      value: 0.913,
      category: "very_high",
    },
    ARE: {
      value: 0.94,
      category: "very_high",
    },
    ARG: {
      value: 0.865,
      category: "very_high",
    },
    ARM: {
      value: 0.811,
      category: "very_high",
    },
    ATG: {
      value: 0.851,
      category: "very_high",
    },
    AUS: {
      value: 0.958,
      category: "very_high",
    },
    AUT: {
      value: 0.93,
      category: "very_high",
    },
    AZE: {
      value: 0.789,
      category: "high",
    },
    BDI: {
      value: 0.439,
      category: "low",
    },
    BEL: {
      value: 0.951,
      category: "very_high",
    },
    BEN: {
      value: 0.515,
      category: "low",
    },
    BFA: {
      value: 0.459,
      category: "low",
    },
    BGD: {
      value: 0.685,
      category: "medium",
    },
    BGR: {
      value: 0.845,
      category: "very_high",
    },
    BHR: {
      value: 0.899,
      category: "very_high",
    },
    BHS: {
      value: 0.82,
      category: "very_high",
    },
    BIH: {
      value: 0.804,
      category: "very_high",
    },
    BLR: {
      value: 0.824,
      category: "very_high",
    },
    BLZ: {
      value: 0.721,
      category: "high",
    },
    BOL: {
      value: 0.733,
      category: "high",
    },
    BRA: {
      value: 0.786,
      category: "high",
    },
    BRB: {
      value: 0.811,
      category: "very_high",
    },
    BRN: {
      value: 0.837,
      category: "very_high",
    },
    BTN: {
      value: 0.698,
      category: "medium",
    },
    BWA: {
      value: 0.731,
      category: "high",
    },
    CAF: {
      value: 0.414,
      category: "low",
    },
    CAN: {
      value: 0.939,
      category: "very_high",
    },
    CHE: {
      value: 0.97,
      category: "very_high",
    },
    CHL: {
      value: 0.878,
      category: "very_high",
    },
    CHN: {
      value: 0.797,
      category: "high",
    },
    CIV: {
      value: 0.582,
      category: "medium",
    },
    CMR: {
      value: 0.588,
      category: "medium",
    },
    COD: {
      value: 0.522,
      category: "low",
    },
    COG: {
      value: 0.649,
      category: "medium",
    },
    COL: {
      value: 0.788,
      category: "high",
    },
    COM: {
      value: 0.603,
      category: "medium",
    },
    CPV: {
      value: 0.668,
      category: "medium",
    },
    CRI: {
      value: 0.833,
      category: "very_high",
    },
    CUB: {
      value: 0.762,
      category: "high",
    },
    CYP: {
      value: 0.913,
      category: "very_high",
    },
    CZE: {
      value: 0.915,
      category: "very_high",
    },
    DEU: {
      value: 0.959,
      category: "very_high",
    },
    DJI: {
      value: 0.513,
      category: "low",
    },
    DMA: {
      value: 0.761,
      category: "high",
    },
    DNK: {
      value: 0.962,
      category: "very_high",
    },
    DOM: {
      value: 0.776,
      category: "high",
    },
    DZA: {
      value: 0.763,
      category: "high",
    },
    ECU: {
      value: 0.777,
      category: "high",
    },
    EGY: {
      value: 0.754,
      category: "high",
    },
    ERI: {
      value: 0.503,
      category: "low",
    },
    ESP: {
      value: 0.918,
      category: "very_high",
    },
    EST: {
      value: 0.905,
      category: "very_high",
    },
    ETH: {
      value: 0.497,
      category: "low",
    },
    FIN: {
      value: 0.948,
      category: "very_high",
    },
    FJI: {
      value: 0.731,
      category: "high",
    },
    FRA: {
      value: 0.92,
      category: "very_high",
    },
    FSM: {
      value: 0.615,
      category: "medium",
    },
    GAB: {
      value: 0.733,
      category: "high",
    },
    GBR: {
      value: 0.946,
      category: "very_high",
    },
    GEO: {
      value: 0.844,
      category: "very_high",
    },
    GHA: {
      value: 0.628,
      category: "medium",
    },
    GIN: {
      value: 0.5,
      category: "low",
    },
    GMB: {
      value: 0.524,
      category: "low",
    },
    GNB: {
      value: 0.514,
      category: "low",
    },
    GNQ: {
      value: 0.674,
      category: "medium",
    },
    GRC: {
      value: 0.908,
      category: "very_high",
    },
    GRD: {
      value: 0.791,
      category: "high",
    },
    GTM: {
      value: 0.662,
      category: "medium",
    },
    GUY: {
      value: 0.776,
      category: "high",
    },
    HND: {
      value: 0.645,
      category: "medium",
    },
    HRV: {
      value: 0.889,
      category: "very_high",
    },
    HTI: {
      value: 0.554,
      category: "medium",
    },
    HUN: {
      value: 0.87,
      category: "very_high",
    },
    IDN: {
      value: 0.728,
      category: "high",
    },
    IND: {
      value: 0.685,
      category: "medium",
    },
    IRL: {
      value: 0.949,
      category: "very_high",
    },
    IRN: {
      value: 0.799,
      category: "high",
    },
    IRQ: {
      value: 0.695,
      category: "medium",
    },
    ISL: {
      value: 0.972,
      category: "very_high",
    },
    ISR: {
      value: 0.919,
      category: "very_high",
    },
    ITA: {
      value: 0.915,
      category: "very_high",
    },
    JAM: {
      value: 0.72,
      category: "high",
    },
    JOR: {
      value: 0.754,
      category: "high",
    },
    JPN: {
      value: 0.925,
      category: "very_high",
    },
    KAZ: {
      value: 0.837,
      category: "very_high",
    },
    KEN: {
      value: 0.628,
      category: "medium",
    },
    KGZ: {
      value: 0.72,
      category: "high",
    },
    KHM: {
      value: 0.606,
      category: "medium",
    },
    KIR: {
      value: 0.644,
      category: "medium",
    },
    KNA: {
      value: 0.84,
      category: "very_high",
    },
    KOR: {
      value: 0.937,
      category: "very_high",
    },
    KWT: {
      value: 0.852,
      category: "very_high",
    },
    LAO: {
      value: 0.617,
      category: "medium",
    },
    LBN: {
      value: 0.752,
      category: "high",
    },
    LBR: {
      value: 0.51,
      category: "low",
    },
    LBY: {
      value: 0.721,
      category: "high",
    },
    LCA: {
      value: 0.748,
      category: "high",
    },
    LIE: {
      value: 0.938,
      category: "very_high",
    },
    LKA: {
      value: 0.776,
      category: "high",
    },
    LSO: {
      value: 0.55,
      category: "medium",
    },
    LTU: {
      value: 0.895,
      category: "very_high",
    },
    LUX: {
      value: 0.922,
      category: "very_high",
    },
    LVA: {
      value: 0.889,
      category: "very_high",
    },
    MAR: {
      value: 0.71,
      category: "high",
    },
    MDA: {
      value: 0.785,
      category: "high",
    },
    MDG: {
      value: 0.487,
      category: "low",
    },
    MDV: {
      value: 0.766,
      category: "high",
    },
    MEX: {
      value: 0.789,
      category: "high",
    },
    MHL: {
      value: 0.733,
      category: "high",
    },
    MKD: {
      value: 0.815,
      category: "very_high",
    },
    MLI: {
      value: 0.419,
      category: "low",
    },
    MLT: {
      value: 0.924,
      category: "very_high",
    },
    MMR: {
      value: 0.609,
      category: "medium",
    },
    MNE: {
      value: 0.862,
      category: "very_high",
    },
    MNG: {
      value: 0.747,
      category: "high",
    },
    MOZ: {
      value: 0.493,
      category: "low",
    },
    MRT: {
      value: 0.563,
      category: "medium",
    },
    MUS: {
      value: 0.806,
      category: "very_high",
    },
    MWI: {
      value: 0.517,
      category: "low",
    },
    MYS: {
      value: 0.819,
      category: "very_high",
    },
    NAM: {
      value: 0.665,
      category: "medium",
    },
    NER: {
      value: 0.419,
      category: "low",
    },
    NGA: {
      value: 0.56,
      category: "medium",
    },
    NIC: {
      value: 0.706,
      category: "high",
    },
    NLD: {
      value: 0.955,
      category: "very_high",
    },
    NOR: {
      value: 0.97,
      category: "very_high",
    },
    NPL: {
      value: 0.622,
      category: "medium",
    },
    NRU: {
      value: 0.703,
      category: "high",
    },
    NZL: {
      value: 0.938,
      category: "very_high",
    },
    OMN: {
      value: 0.858,
      category: "very_high",
    },
    PAK: {
      value: 0.544,
      category: "low",
    },
    PAN: {
      value: 0.839,
      category: "very_high",
    },
    PER: {
      value: 0.794,
      category: "high",
    },
    PHL: {
      value: 0.72,
      category: "high",
    },
    PLW: {
      value: 0.786,
      category: "high",
    },
    PNG: {
      value: 0.576,
      category: "medium",
    },
    POL: {
      value: 0.906,
      category: "very_high",
    },
    PRT: {
      value: 0.89,
      category: "very_high",
    },
    PRY: {
      value: 0.756,
      category: "high",
    },
    PSE: {
      value: 0.674,
      category: "medium",
    },
    QAT: {
      value: 0.886,
      category: "very_high",
    },
    ROU: {
      value: 0.845,
      category: "very_high",
    },
    RUS: {
      value: 0.832,
      category: "very_high",
    },
    RWA: {
      value: 0.578,
      category: "medium",
    },
    SAU: {
      value: 0.9,
      category: "very_high",
    },
    SDN: {
      value: 0.511,
      category: "low",
    },
    SEN: {
      value: 0.53,
      category: "low",
    },
    SGP: {
      value: 0.946,
      category: "very_high",
    },
    SLB: {
      value: 0.584,
      category: "medium",
    },
    SLE: {
      value: 0.467,
      category: "low",
    },
    SLV: {
      value: 0.678,
      category: "medium",
    },
    SMR: {
      value: 0.915,
      category: "very_high",
    },
    SOM: {
      value: 0.404,
      category: "low",
    },
    SRB: {
      value: 0.833,
      category: "very_high",
    },
    SSD: {
      value: 0.388,
      category: "low",
    },
    STP: {
      value: 0.637,
      category: "medium",
    },
    SUR: {
      value: 0.722,
      category: "high",
    },
    SVK: {
      value: 0.88,
      category: "very_high",
    },
    SVN: {
      value: 0.931,
      category: "very_high",
    },
    SWE: {
      value: 0.959,
      category: "very_high",
    },
    SWZ: {
      value: 0.695,
      category: "medium",
    },
    SYC: {
      value: 0.848,
      category: "very_high",
    },
    SYR: {
      value: 0.564,
      category: "medium",
    },
    TCD: {
      value: 0.416,
      category: "low",
    },
    TGO: {
      value: 0.571,
      category: "medium",
    },
    THA: {
      value: 0.798,
      category: "high",
    },
    TJK: {
      value: 0.691,
      category: "medium",
    },
    TKM: {
      value: 0.764,
      category: "high",
    },
    TLS: {
      value: 0.634,
      category: "medium",
    },
    TON: {
      value: 0.769,
      category: "high",
    },
    TTO: {
      value: 0.807,
      category: "very_high",
    },
    TUN: {
      value: 0.746,
      category: "high",
    },
    TUR: {
      value: 0.853,
      category: "very_high",
    },
    TUV: {
      value: 0.689,
      category: "medium",
    },
    TZA: {
      value: 0.555,
      category: "medium",
    },
    UGA: {
      value: 0.582,
      category: "medium",
    },
    UKR: {
      value: 0.779,
      category: "high",
    },
    URY: {
      value: 0.862,
      category: "very_high",
    },
    USA: {
      value: 0.938,
      category: "very_high",
    },
    UZB: {
      value: 0.74,
      category: "high",
    },
    VCT: {
      value: 0.798,
      category: "high",
    },
    VEN: {
      value: 0.709,
      category: "high",
    },
    VNM: {
      value: 0.766,
      category: "high",
    },
    VUT: {
      value: 0.621,
      category: "medium",
    },
    WSM: {
      value: 0.708,
      category: "high",
    },
    YEM: {
      value: 0.47,
      category: "low",
    },
    ZAF: {
      value: 0.741,
      category: "high",
    },
    ZMB: {
      value: 0.595,
      category: "medium",
    },
    ZWE: {
      value: 0.598,
      category: "medium",
    },
  },
  missing: {
    MCO: "no_value_published",
    PRK: "no_value_published",
    TWN: "not_in_report",
    VAT: "not_in_report",
    XKX: "not_in_report",
  },
};
