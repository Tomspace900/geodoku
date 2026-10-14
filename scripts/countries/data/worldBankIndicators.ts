import type { WorldBankIndicatorsSnapshot } from "./types";

/**
 * PIB par habitant (`NY.GDP.PCAP.CD`, dollars US courants) et espérance de vie
 * à la naissance (`SP.DYN.LE00.IN`) : [Banque mondiale, World Development
 * Indicators](https://databank.worldbank.org/source/world-development-indicators),
 * API `api.worldbank.org/v2`. Pour chaque pays, l'année non nulle la plus
 * récente de `window` ; au-delà, le pays est dans `missing` avec sa cause.
 * Récolté par `scripts/countries/harvest/worldBankIndicators.ts`
 * (`pnpm harvest:world-bank`).
 *
 * **Généré** : ne pas l'éditer à la main. `sourceUpdatedAt` est le
 * `lastupdated` de la WDI, qui révise ses séries : une nouvelle récolte peut
 * changer une valeur passée.
 */
export const WORLD_BANK_INDICATORS: WorldBankIndicatorsSnapshot = {
  harvestedAt: "2026-10-09",
  gdpPerCapita: {
    code: "NY.GDP.PCAP.CD",
    sourceUpdatedAt: "2026-10-08",
    window: {
      from: 2021,
      to: 2025,
    },
    values: {
      AFG: {
        value: 416.871146273728,
        year: 2024,
      },
      AGO: {
        value: 3129.47662331063,
        year: 2025,
      },
      ALB: {
        value: 12998.147869552,
        year: 2025,
      },
      AND: {
        value: 54291.5026031052,
        year: 2025,
      },
      ARE: {
        value: 50273.5126243239,
        year: 2024,
      },
      ARG: {
        value: 14898.0885943842,
        year: 2025,
      },
      ARM: {
        value: 9474.01849300368,
        year: 2025,
      },
      ATG: {
        value: 24819.2454680158,
        year: 2025,
      },
      AUS: {
        value: 65129.7227990563,
        year: 2025,
      },
      AUT: {
        value: 62930.0351324599,
        year: 2025,
      },
      AZE: {
        value: 7410.72281660142,
        year: 2025,
      },
      BDI: {
        value: 233.823013385395,
        year: 2025,
      },
      BEL: {
        value: 60750.2735864647,
        year: 2025,
      },
      BEN: {
        value: 1658.27312662991,
        year: 2025,
      },
      BFA: {
        value: 1147.57131635601,
        year: 2025,
      },
      BGD: {
        value: 2597.34352335275,
        year: 2025,
      },
      BGR: {
        value: 20328.1667065538,
        year: 2025,
      },
      BHR: {
        value: 30596.5794898885,
        year: 2025,
      },
      BHS: {
        value: 39455.4466548546,
        year: 2024,
      },
      BIH: {
        value: 10381.8460703874,
        year: 2025,
      },
      BLR: {
        value: 10279.2547190723,
        year: 2025,
      },
      BLZ: {
        value: 7865.47937690933,
        year: 2025,
      },
      BOL: {
        value: 5147.81081955367,
        year: 2025,
      },
      BRA: {
        value: 10713.2856869511,
        year: 2025,
      },
      BRB: {
        value: 28364.8181499736,
        year: 2025,
      },
      BRN: {
        value: 32234.6428368582,
        year: 2025,
      },
      BTN: {
        value: 4492.78400306618,
        year: 2025,
      },
      BWA: {
        value: 7778.1151090571,
        year: 2025,
      },
      CAF: {
        value: 556.131398031455,
        year: 2025,
      },
      CAN: {
        value: 55697.6639660837,
        year: 2025,
      },
      CHE: {
        value: 114769.012314293,
        year: 2025,
      },
      CHL: {
        value: 17994.5911957485,
        year: 2025,
      },
      CHN: {
        value: 13861.970224368,
        year: 2025,
      },
      CIV: {
        value: 3050.10202257321,
        year: 2025,
      },
      CMR: {
        value: 1972.3815800786,
        year: 2025,
      },
      COD: {
        value: 806.776000708534,
        year: 2025,
      },
      COG: {
        value: 2514.73393584747,
        year: 2025,
      },
      COL: {
        value: 8561.62091854449,
        year: 2025,
      },
      COM: {
        value: 2055.75921566281,
        year: 2025,
      },
      CPV: {
        value: 5796.47207860911,
        year: 2025,
      },
      CRI: {
        value: 19970.0989059622,
        year: 2025,
      },
      CYP: {
        value: 41783.08984375,
        year: 2025,
      },
      CZE: {
        value: 35917.2724081665,
        year: 2025,
      },
      DEU: {
        value: 60496.4350820414,
        year: 2025,
      },
      DJI: {
        value: 3905.604954681,
        year: 2025,
      },
      DMA: {
        value: 10989.0431185083,
        year: 2025,
      },
      DNK: {
        value: 76970.1535217919,
        year: 2025,
      },
      DOM: {
        value: 11059.2081531834,
        year: 2025,
      },
      DZA: {
        value: 6051.00322704182,
        year: 2025,
      },
      ECU: {
        value: 7125.27618527738,
        year: 2025,
      },
      EGY: {
        value: 3085.80712036204,
        year: 2025,
      },
      ESP: {
        value: 38627.2472148623,
        year: 2025,
      },
      EST: {
        value: 34417.6320815138,
        year: 2025,
      },
      ETH: {
        value: 932.729352775179,
        year: 2025,
      },
      FIN: {
        value: 56148.580949046,
        year: 2025,
      },
      FJI: {
        value: 6642.00449450523,
        year: 2025,
      },
      FRA: {
        value: 48985.7307807924,
        year: 2025,
      },
      FSM: {
        value: 4414.00737137479,
        year: 2025,
      },
      GAB: {
        value: 8263.03321595,
        year: 2025,
      },
      GBR: {
        value: 57601.9621201954,
        year: 2025,
      },
      GEO: {
        value: 9691.53472415196,
        year: 2025,
      },
      GHA: {
        value: 3257.1588903576,
        year: 2025,
      },
      GIN: {
        value: 1877.2541220972,
        year: 2025,
      },
      GMB: {
        value: 919.060423427951,
        year: 2025,
      },
      GNB: {
        value: 1123.76679992349,
        year: 2025,
      },
      GNQ: {
        value: 6615.25245207167,
        year: 2025,
      },
      GRC: {
        value: 26948.0070432791,
        year: 2025,
      },
      GRD: {
        value: 12106.8790105068,
        year: 2025,
      },
      GTM: {
        value: 6598.18032988711,
        year: 2025,
      },
      GUY: {
        value: 32413.7930757518,
        year: 2025,
      },
      HND: {
        value: 3598.21450440452,
        year: 2025,
      },
      HRV: {
        value: 27103.9116109268,
        year: 2025,
      },
      HTI: {
        value: 2694.18969101404,
        year: 2025,
      },
      HUN: {
        value: 25907.4743259406,
        year: 2025,
      },
      IDN: {
        value: 5059.62596411213,
        year: 2025,
      },
      IND: {
        value: 2702.47987141553,
        year: 2025,
      },
      IRL: {
        value: 131592.462547877,
        year: 2025,
      },
      IRN: {
        value: 3924.38017821898,
        year: 2025,
      },
      IRQ: {
        value: 5409.67899716967,
        year: 2025,
      },
      ISL: {
        value: 98323.4849517418,
        year: 2025,
      },
      ISR: {
        value: 60336.8477964194,
        year: 2025,
      },
      ITA: {
        value: 43308.6403060733,
        year: 2025,
      },
      JAM: {
        value: 8002.92104076242,
        year: 2025,
      },
      JOR: {
        value: 5347.77731384797,
        year: 2025,
      },
      JPN: {
        value: 35951.0449549304,
        year: 2025,
      },
      KAZ: {
        value: 14692.1331757237,
        year: 2025,
      },
      KEN: {
        value: 2362.86091198611,
        year: 2025,
      },
      KGZ: {
        value: 3080.96893823359,
        year: 2025,
      },
      KHM: {
        value: 2872.42926639909,
        year: 2025,
      },
      KIR: {
        value: 2558.66636011102,
        year: 2025,
      },
      KNA: {
        value: 25223.0257622185,
        year: 2025,
      },
      KOR: {
        value: 36226.9663637512,
        year: 2025,
      },
      KWT: {
        value: 32312.3119953634,
        year: 2025,
      },
      LAO: {
        value: 2324.76353098791,
        year: 2025,
      },
      LBN: {
        value: 4473.27134441128,
        year: 2024,
      },
      LBR: {
        value: 915.328972645548,
        year: 2025,
      },
      LBY: {
        value: 6448.82415074121,
        year: 2025,
      },
      LCA: {
        value: 14745.8184305461,
        year: 2025,
      },
      LIE: {
        value: 220167.225473557,
        year: 2024,
      },
      LKA: {
        value: 5002.07904353724,
        year: 2025,
      },
      LSO: {
        value: 1088.96276223185,
        year: 2025,
      },
      LTU: {
        value: 32958.6706396386,
        year: 2025,
      },
      LUX: {
        value: 147252.179121515,
        year: 2025,
      },
      LVA: {
        value: 26311.9730706362,
        year: 2025,
      },
      MAR: {
        value: 4672.46826171875,
        year: 2025,
      },
      MCO: {
        value: 288001.574856495,
        year: 2024,
      },
      MDA: {
        value: 8621.71721623786,
        year: 2025,
      },
      MDG: {
        value: 599.265294255357,
        year: 2025,
      },
      MDV: {
        value: 14614.7208116541,
        year: 2025,
      },
      MEX: {
        value: 13889.2339628708,
        year: 2025,
      },
      MHL: {
        value: 8489.05793506422,
        year: 2025,
      },
      MKD: {
        value: 10489.9255355525,
        year: 2025,
      },
      MLI: {
        value: 1193.27601004701,
        year: 2025,
      },
      MLT: {
        value: 47906.9000057635,
        year: 2025,
      },
      MMR: {
        value: 1488.87527836542,
        year: 2025,
      },
      MNE: {
        value: 14816.8380299947,
        year: 2025,
      },
      MNG: {
        value: 7108.22743246244,
        year: 2025,
      },
      MOZ: {
        value: 626.914419215727,
        year: 2025,
      },
      MRT: {
        value: 2197.51046251309,
        year: 2025,
      },
      MUS: {
        value: 12991.2935987166,
        year: 2025,
      },
      MWI: {
        value: 671.506847203876,
        year: 2025,
      },
      MYS: {
        value: 13124.5554178269,
        year: 2025,
      },
      NAM: {
        value: 4875.92558158247,
        year: 2025,
      },
      NER: {
        value: 775.353622143879,
        year: 2025,
      },
      NGA: {
        value: 1224.25410237743,
        year: 2025,
      },
      NIC: {
        value: 3173.33724815085,
        year: 2025,
      },
      NLD: {
        value: 73683.917132794,
        year: 2025,
      },
      NOR: {
        value: 94594.1929573987,
        year: 2025,
      },
      NPL: {
        value: 1535.87781246307,
        year: 2025,
      },
      NRU: {
        value: 14639.5046929186,
        year: 2025,
      },
      NZL: {
        value: 49591.0405731713,
        year: 2025,
      },
      OMN: {
        value: 19947.3966227092,
        year: 2025,
      },
      PAK: {
        value: 1595.90912252837,
        year: 2025,
      },
      PAN: {
        value: 19789.7308555826,
        year: 2025,
      },
      PER: {
        value: 9684.41170314988,
        year: 2025,
      },
      PHL: {
        value: 4170.72347271451,
        year: 2025,
      },
      PLW: {
        value: 19532.3557719527,
        year: 2025,
      },
      PNG: {
        value: 3019.5309140573,
        year: 2025,
      },
      POL: {
        value: 28419.5777395638,
        year: 2025,
      },
      PRT: {
        value: 32081.8106150292,
        year: 2025,
      },
      PRY: {
        value: 7026.61906146401,
        year: 2025,
      },
      PSE: {
        value: 3171.10844621579,
        year: 2025,
      },
      QAT: {
        value: 72524.9066385222,
        year: 2025,
      },
      ROU: {
        value: 22537.9532108047,
        year: 2025,
      },
      RUS: {
        value: 17546.609375,
        year: 2025,
      },
      RWA: {
        value: 1123.73874633225,
        year: 2025,
      },
      SAU: {
        value: 34536.6555456551,
        year: 2025,
      },
      SDN: {
        value: 1164.53991699219,
        year: 2025,
      },
      SEN: {
        value: 1954.71174194867,
        year: 2025,
      },
      SGP: {
        value: 98813.9788172877,
        year: 2025,
      },
      SLB: {
        value: 2086.18955928928,
        year: 2025,
      },
      SLE: {
        value: 846.296172499617,
        year: 2025,
      },
      SLV: {
        value: 5766.72574029107,
        year: 2025,
      },
      SMR: {
        value: 59871.3288101478,
        year: 2023,
      },
      SOM: {
        value: 661.173877723116,
        year: 2025,
      },
      SRB: {
        value: 15262.0464193413,
        year: 2025,
      },
      STP: {
        value: 4084.40062145233,
        year: 2025,
      },
      SUR: {
        value: 7069.87230892274,
        year: 2025,
      },
      SVK: {
        value: 28543.6653439813,
        year: 2025,
      },
      SVN: {
        value: 37376.2216079138,
        year: 2025,
      },
      SWE: {
        value: 63133.2126736715,
        year: 2025,
      },
      SWZ: {
        value: 4108.25221093363,
        year: 2025,
      },
      SYC: {
        value: 19449.3836346926,
        year: 2025,
      },
      SYR: {
        value: 1056.78264718197,
        year: 2022,
      },
      TCD: {
        value: 1022.33559390754,
        year: 2025,
      },
      TGO: {
        value: 1383.89974929887,
        year: 2025,
      },
      THA: {
        value: 8056.56359761558,
        year: 2025,
      },
      TJK: {
        value: 1637.2542942547,
        year: 2025,
      },
      TKM: {
        value: 6540.17876401136,
        year: 2025,
      },
      TLS: {
        value: 1340.9640193437,
        year: 2025,
      },
      TON: {
        value: 6547.18646814228,
        year: 2025,
      },
      TTO: {
        value: 18967.2704636681,
        year: 2025,
      },
      TUN: {
        value: 4656.63818386852,
        year: 2025,
      },
      TUR: {
        value: 18599.4420922378,
        year: 2025,
      },
      TUV: {
        value: 6041.44908591428,
        year: 2025,
      },
      TZA: {
        value: 1318.81921386719,
        year: 2025,
      },
      UGA: {
        value: 1206.30450825002,
        year: 2025,
      },
      UKR: {
        value: 5865.884765625,
        year: 2025,
      },
      URY: {
        value: 25215.8238152781,
        year: 2025,
      },
      USA: {
        value: 90026.5163005744,
        year: 2025,
      },
      UZB: {
        value: 3968.2720079072,
        year: 2025,
      },
      VCT: {
        value: 12561.769166789,
        year: 2025,
      },
      VEN: {
        value: 3494.8138870244,
        year: 2025,
      },
      VNM: {
        value: 5065.99091899299,
        year: 2025,
      },
      VUT: {
        value: 4038.73520713411,
        year: 2025,
      },
      WSM: {
        value: 5872.78333308796,
        year: 2025,
      },
      XKX: {
        value: 7899.41841135202,
        year: 2025,
      },
      ZAF: {
        value: 6597.71450918774,
        year: 2025,
      },
      ZMB: {
        value: 1317.87771619597,
        year: 2025,
      },
      ZWE: {
        value: 3021.43019873632,
        year: 2025,
      },
    },
    missing: {
      CUB: "no_value_in_window",
      ERI: "no_value_in_window",
      PRK: "no_value_in_window",
      SSD: "no_value_in_window",
      TWN: "not_in_wdi",
      VAT: "not_in_wdi",
      YEM: "no_value_in_window",
    },
  },
  lifeExpectancy: {
    code: "SP.DYN.LE00.IN",
    sourceUpdatedAt: "2026-10-08",
    window: {
      from: 2021,
      to: 2025,
    },
    values: {
      AFG: {
        value: 66.289,
        year: 2024,
      },
      AGO: {
        value: 64.805,
        year: 2024,
      },
      ALB: {
        value: 79.776,
        year: 2024,
      },
      AND: {
        value: 84.188,
        year: 2024,
      },
      ARE: {
        value: 83.069,
        year: 2024,
      },
      ARG: {
        value: 77.543,
        year: 2024,
      },
      ARM: {
        value: 78.319512195122,
        year: 2024,
      },
      ATG: {
        value: 77.766,
        year: 2024,
      },
      AUS: {
        value: 83.0512195121951,
        year: 2024,
      },
      AUT: {
        value: 81.9951219512195,
        year: 2024,
      },
      AZE: {
        value: 74.576,
        year: 2024,
      },
      BDI: {
        value: 63.818,
        year: 2024,
      },
      BEL: {
        value: 82.3,
        year: 2024,
      },
      BEN: {
        value: 60.961,
        year: 2024,
      },
      BFA: {
        value: 61.292,
        year: 2024,
      },
      BGD: {
        value: 74.93,
        year: 2024,
      },
      BGR: {
        value: 75.7609756097561,
        year: 2024,
      },
      BHR: {
        value: 81.423,
        year: 2024,
      },
      BHS: {
        value: 74.71,
        year: 2024,
      },
      BIH: {
        value: 78.044,
        year: 2024,
      },
      BLR: {
        value: 74.3653414634147,
        year: 2024,
      },
      BLZ: {
        value: 73.739,
        year: 2024,
      },
      BOL: {
        value: 68.739,
        year: 2024,
      },
      BRA: {
        value: 76.023,
        year: 2024,
      },
      BRB: {
        value: 76.332,
        year: 2024,
      },
      BRN: {
        value: 75.501,
        year: 2024,
      },
      BTN: {
        value: 73.262,
        year: 2024,
      },
      BWA: {
        value: 69.293,
        year: 2024,
      },
      CAF: {
        value: 57.671,
        year: 2024,
      },
      CAN: {
        value: 82.1080487804878,
        year: 2024,
      },
      CHE: {
        value: 84.4073170731707,
        year: 2024,
      },
      CHL: {
        value: 81.359,
        year: 2024,
      },
      CHN: {
        value: 78.017,
        year: 2024,
      },
      CIV: {
        value: 62.11,
        year: 2024,
      },
      CMR: {
        value: 63.968,
        year: 2024,
      },
      COD: {
        value: 62.074,
        year: 2024,
      },
      COG: {
        value: 66.001,
        year: 2024,
      },
      COL: {
        value: 77.913,
        year: 2024,
      },
      COM: {
        value: 67.023,
        year: 2024,
      },
      CPV: {
        value: 76.224,
        year: 2024,
      },
      CRI: {
        value: 80.996,
        year: 2024,
      },
      CUB: {
        value: 78.264,
        year: 2024,
      },
      CYP: {
        value: 81.821,
        year: 2024,
      },
      CZE: {
        value: 79.9780487804878,
        year: 2024,
      },
      DEU: {
        value: 80.7926829268293,
        year: 2024,
      },
      DJI: {
        value: 66.202,
        year: 2024,
      },
      DMA: {
        value: 71.294,
        year: 2024,
      },
      DNK: {
        value: 82.2536585365854,
        year: 2024,
      },
      DOM: {
        value: 73.868,
        year: 2024,
      },
      DZA: {
        value: 76.475,
        year: 2024,
      },
      ECU: {
        value: 77.579,
        year: 2024,
      },
      EGY: {
        value: 71.806,
        year: 2024,
      },
      ERI: {
        value: 68.893,
        year: 2024,
      },
      ESP: {
        value: 83.8878048780488,
        year: 2024,
      },
      EST: {
        value: 79.2951219512195,
        year: 2024,
      },
      ETH: {
        value: 67.603,
        year: 2024,
      },
      FIN: {
        value: 82.3365853658537,
        year: 2024,
      },
      FJI: {
        value: 67.463,
        year: 2024,
      },
      FRA: {
        value: 82.9804878048781,
        year: 2024,
      },
      FSM: {
        value: 67.357,
        year: 2024,
      },
      GAB: {
        value: 68.511,
        year: 2024,
      },
      GBR: {
        value: 81.3868536585366,
        year: 2024,
      },
      GEO: {
        value: 74.657,
        year: 2024,
      },
      GHA: {
        value: 65.695,
        year: 2024,
      },
      GIN: {
        value: 60.904,
        year: 2024,
      },
      GMB: {
        value: 66.057,
        year: 2024,
      },
      GNB: {
        value: 64.254,
        year: 2024,
      },
      GNQ: {
        value: 63.906,
        year: 2024,
      },
      GRC: {
        value: 81.8390243902439,
        year: 2024,
      },
      GRD: {
        value: 75.367,
        year: 2024,
      },
      GTM: {
        value: 72.746,
        year: 2024,
      },
      GUY: {
        value: 70.319,
        year: 2024,
      },
      HND: {
        value: 73.044,
        year: 2024,
      },
      HRV: {
        value: 78.9292682926829,
        year: 2024,
      },
      HTI: {
        value: 65.119,
        year: 2024,
      },
      HUN: {
        value: 76.7243902439025,
        year: 2024,
      },
      IDN: {
        value: 71.288,
        year: 2024,
      },
      IND: {
        value: 72.235,
        year: 2024,
      },
      IRL: {
        value: 83.009756097561,
        year: 2024,
      },
      IRN: {
        value: 77.854,
        year: 2024,
      },
      IRQ: {
        value: 72.424,
        year: 2024,
      },
      ISL: {
        value: 82.809756097561,
        year: 2024,
      },
      ISR: {
        value: 83.1975609756098,
        year: 2024,
      },
      ITA: {
        value: 83.9512195121951,
        year: 2024,
      },
      JAM: {
        value: 71.606,
        year: 2024,
      },
      JOR: {
        value: 77.981,
        year: 2024,
      },
      JPN: {
        value: 84.0363414634146,
        year: 2024,
      },
      KAZ: {
        value: 74.531,
        year: 2024,
      },
      KEN: {
        value: 63.834,
        year: 2024,
      },
      KGZ: {
        value: 72.4,
        year: 2024,
      },
      KHM: {
        value: 70.817,
        year: 2024,
      },
      KIR: {
        value: 66.6,
        year: 2024,
      },
      KNA: {
        value: 72.281,
        year: 2024,
      },
      KOR: {
        value: 83.6292682926829,
        year: 2024,
      },
      KWT: {
        value: 84.580487804878,
        year: 2024,
      },
      LAO: {
        value: 69.225,
        year: 2024,
      },
      LBN: {
        value: 77.945,
        year: 2024,
      },
      LBR: {
        value: 62.324,
        year: 2024,
      },
      LBY: {
        value: 71.121,
        year: 2024,
      },
      LCA: {
        value: 72.846,
        year: 2024,
      },
      LIE: {
        value: 84.2,
        year: 2024,
      },
      LKA: {
        value: 77.672,
        year: 2024,
      },
      LSO: {
        value: 57.798,
        year: 2024,
      },
      LTU: {
        value: 77.1951219512195,
        year: 2024,
      },
      LUX: {
        value: 83.1951219512195,
        year: 2024,
      },
      LVA: {
        value: 76.4292682926829,
        year: 2024,
      },
      MAR: {
        value: 75.493,
        year: 2024,
      },
      MCO: {
        value: 86.497,
        year: 2024,
      },
      MDA: {
        value: 71.332,
        year: 2024,
      },
      MDG: {
        value: 63.835,
        year: 2024,
      },
      MDV: {
        value: 81.285,
        year: 2024,
      },
      MEX: {
        value: 75.264,
        year: 2024,
      },
      MHL: {
        value: 67.075,
        year: 2024,
      },
      MKD: {
        value: 76.6165853658537,
        year: 2024,
      },
      MLI: {
        value: 60.675,
        year: 2024,
      },
      MLT: {
        value: 82.9560975609756,
        year: 2024,
      },
      MMR: {
        value: 67.095,
        year: 2024,
      },
      MNE: {
        value: 77.890243902439,
        year: 2024,
      },
      MNG: {
        value: 72.3980487804878,
        year: 2024,
      },
      MOZ: {
        value: 63.797,
        year: 2024,
      },
      MRT: {
        value: 68.713,
        year: 2024,
      },
      MUS: {
        value: 73.7890243902439,
        year: 2024,
      },
      MWI: {
        value: 67.561,
        year: 2024,
      },
      MYS: {
        value: 76.821,
        year: 2024,
      },
      NAM: {
        value: 67.516,
        year: 2024,
      },
      NER: {
        value: 61.433,
        year: 2024,
      },
      NGA: {
        value: 54.635,
        year: 2024,
      },
      NIC: {
        value: 75.1,
        year: 2024,
      },
      NLD: {
        value: 81.9658536585366,
        year: 2024,
      },
      NOR: {
        value: 83.1609756097561,
        year: 2024,
      },
      NPL: {
        value: 70.636,
        year: 2024,
      },
      NRU: {
        value: 62.279,
        year: 2024,
      },
      NZL: {
        value: 82.009756097561,
        year: 2024,
      },
      OMN: {
        value: 80.246,
        year: 2024,
      },
      PAK: {
        value: 67.799,
        year: 2024,
      },
      PAN: {
        value: 79.775,
        year: 2024,
      },
      PER: {
        value: 77.941,
        year: 2024,
      },
      PHL: {
        value: 69.946,
        year: 2024,
      },
      PLW: {
        value: 69.383,
        year: 2024,
      },
      PNG: {
        value: 66.256,
        year: 2024,
      },
      POL: {
        value: 78.409756097561,
        year: 2024,
      },
      PRK: {
        value: 73.743,
        year: 2024,
      },
      PRT: {
        value: 82.3829268292683,
        year: 2024,
      },
      PRY: {
        value: 73.982,
        year: 2024,
      },
      PSE: {
        value: 69.213,
        year: 2024,
      },
      QAT: {
        value: 82.522,
        year: 2024,
      },
      ROU: {
        value: 76.4585365853659,
        year: 2024,
      },
      RUS: {
        value: 73.4404878048781,
        year: 2024,
      },
      RWA: {
        value: 68.017,
        year: 2024,
      },
      SAU: {
        value: 78.982,
        year: 2024,
      },
      SDN: {
        value: 66.521,
        year: 2024,
      },
      SEN: {
        value: 68.924,
        year: 2024,
      },
      SGP: {
        value: 83.3463414634146,
        year: 2024,
      },
      SLB: {
        value: 70.694,
        year: 2024,
      },
      SLE: {
        value: 61.964,
        year: 2024,
      },
      SLV: {
        value: 72.302,
        year: 2024,
      },
      SMR: {
        value: 85.817,
        year: 2024,
      },
      SOM: {
        value: 58.967,
        year: 2024,
      },
      SRB: {
        value: 75.9682926829268,
        year: 2024,
      },
      SSD: {
        value: 57.738,
        year: 2024,
      },
      STP: {
        value: 69.905,
        year: 2024,
      },
      SUR: {
        value: 73.757,
        year: 2024,
      },
      SVK: {
        value: 78.3707317073171,
        year: 2024,
      },
      SVN: {
        value: 82.2853658536585,
        year: 2024,
      },
      SWE: {
        value: 84.0634146341463,
        year: 2024,
      },
      SWZ: {
        value: 64.264,
        year: 2024,
      },
      SYC: {
        value: 76.2951219512195,
        year: 2024,
      },
      SYR: {
        value: 72.56,
        year: 2024,
      },
      TCD: {
        value: 55.238,
        year: 2024,
      },
      TGO: {
        value: 62.935,
        year: 2024,
      },
      THA: {
        value: 76.564,
        year: 2024,
      },
      TJK: {
        value: 71.927,
        year: 2024,
      },
      TKM: {
        value: 70.201,
        year: 2024,
      },
      TLS: {
        value: 67.904,
        year: 2024,
      },
      TON: {
        value: 73.07,
        year: 2024,
      },
      TTO: {
        value: 73.617,
        year: 2024,
      },
      TUN: {
        value: 76.711,
        year: 2024,
      },
      TUR: {
        value: 77.421,
        year: 2024,
      },
      TUV: {
        value: 67.259,
        year: 2024,
      },
      TZA: {
        value: 67.212,
        year: 2024,
      },
      UGA: {
        value: 68.487,
        year: 2024,
      },
      UKR: {
        value: 74.692,
        year: 2024,
      },
      URY: {
        value: 78.287,
        year: 2024,
      },
      USA: {
        value: 78.890243902439,
        year: 2024,
      },
      UZB: {
        value: 72.528,
        year: 2024,
      },
      VCT: {
        value: 71.382,
        year: 2024,
      },
      VEN: {
        value: 72.673,
        year: 2024,
      },
      VNM: {
        value: 74.736,
        year: 2024,
      },
      VUT: {
        value: 71.654,
        year: 2024,
      },
      WSM: {
        value: 71.826,
        year: 2024,
      },
      XKX: {
        value: 78.222,
        year: 2024,
      },
      YEM: {
        value: 69.439,
        year: 2024,
      },
      ZAF: {
        value: 66.312,
        year: 2024,
      },
      ZMB: {
        value: 66.528,
        year: 2024,
      },
      ZWE: {
        value: 63.064,
        year: 2024,
      },
    },
    missing: {
      TWN: "not_in_wdi",
      VAT: "not_in_wdi",
    },
  },
};
