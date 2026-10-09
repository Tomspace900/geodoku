import type { HighestPointsSnapshot } from "./types";

/**
 * Points culminants — altitude et nom : [CIA World Factbook, *Elevation › highest
 * point*](https://www.cia.gov/the-world-factbook/field/elevation/), via le miroir
 * figé `factbook.json` (même commit que `sovereignty.ts`). Libellés fr/en :
 * Wikidata (`P610`, `rdfs:label`), le sommet étant reconnu par son altitude.
 * Récolté par `scripts/countries/harvest/highestPoints.ts`
 * (`pnpm harvest:highest-points`).
 *
 * `points` est **généré** : ne pas l'éditer à la main. `overrides` est curé,
 * chaque entrée avec son motif ; il est préservé à chaque récolte et l'emporte
 * sur `points[].label`. L'altitude est celle du Factbook, sauf override `peak`
 * (autre sommet retenu, source de l'altitude dans le motif).
 *
 * `label: null` = point sans nom (ou donné par une position, pas un nom).
 */
export const HIGHEST_POINTS: HighestPointsSnapshot = {
  factbookCommit: "8662a8b17a784841ab4528631b04090eb2f183eb",
  harvestedAt: "2026-10-09",
  points: {
    AFG: {
      sourceName: "Noshak",
      elevationM: 7492,
      label: {
        fr: "Nowshak",
        en: "Noshaq",
      },
      wikidata: "Q271700",
    },
    AGO: {
      sourceName: "Moco",
      elevationM: 2620,
      label: {
        fr: "Morro de Môco",
        en: "Mount Moco",
      },
      wikidata: "Q1348116",
    },
    ALB: {
      sourceName: "Maja e Korabit",
      elevationM: 2764,
      label: {
        fr: "mont Korab",
        en: "Korab",
      },
      wikidata: "Q912579",
    },
    AND: {
      sourceName: "Pic de Coma Pedrosa",
      elevationM: 2946,
      label: {
        fr: "pic de Coma Pedrosa",
        en: "Coma Pedrosa",
      },
      wikidata: "Q62467",
    },
    ARE: {
      sourceName: "Jabal Bil 'Ays",
      elevationM: 1905,
      label: {
        fr: "Jabal Bil Ays",
        en: "Jebel Jais",
      },
      wikidata: "Q3492099",
    },
    ARG: {
      sourceName: "Cerro Aconcagua",
      elevationM: 6962,
      label: {
        fr: "Aconcagua",
        en: "Aconcagua",
      },
      wikidata: "Q39739",
    },
    ARM: {
      sourceName: "Aragats Lerrnagagat'",
      elevationM: 4090,
      label: {
        fr: "Aragats",
        en: "Mount Aragats",
      },
      wikidata: "Q203568",
    },
    ATG: {
      sourceName: "Mount Obama",
      elevationM: 402,
      label: {
        fr: "mont Obama",
        en: "Mount Obama",
      },
      wikidata: "Q1718336",
    },
    AUS: {
      sourceName: "Mount Kosciuszko",
      elevationM: 2228,
      label: null,
      wikidata: null,
    },
    AUT: {
      sourceName: "Grossglockner",
      elevationM: 3798,
      label: {
        fr: "Grossglockner",
        en: "Grossglockner",
      },
      wikidata: "Q3388",
    },
    AZE: {
      sourceName: "Bazarduzu Dagi",
      elevationM: 4466,
      label: {
        fr: "Bazardüzü",
        en: "Mount Bazardüzü",
      },
      wikidata: "Q725591",
    },
    BDI: {
      sourceName: "unnamed elevation on Mukike Range",
      elevationM: 2685,
      label: null,
      wikidata: null,
    },
    BEL: {
      sourceName: "Botrange",
      elevationM: 694,
      label: {
        fr: "signal de Botrange",
        en: "Signal de Botrange",
      },
      wikidata: "Q322824",
    },
    BEN: {
      sourceName: "unnamed elevation",
      elevationM: 675,
      label: null,
      wikidata: null,
    },
    BFA: {
      sourceName: "Tena Kourou",
      elevationM: 749,
      label: {
        fr: "Tenakourou",
        en: "Mount Tenakourou",
      },
      wikidata: "Q116675",
    },
    BGD: {
      sourceName: "Mowdok Taung",
      elevationM: 1060,
      label: {
        fr: "Mowdok Mual",
        en: "Mowdok tiang",
      },
      wikidata: "Q2696459",
    },
    BGR: {
      sourceName: "Musala",
      elevationM: 2925,
      label: {
        fr: "Moussala",
        en: "Musala",
      },
      wikidata: "Q209341",
    },
    BHR: {
      sourceName: "Jabal ad Dukhan",
      elevationM: 135,
      label: {
        fr: "Djébel ad Dukhan",
        en: "Mountain of Smoke",
      },
      wikidata: "Q1032812",
    },
    BHS: {
      sourceName: "1.3 km NE of Old Bight on Cat Island",
      elevationM: 64,
      label: {
        fr: "mont Alvernia",
        en: "Mount Alvernia",
      },
      wikidata: "Q746274",
    },
    BIH: {
      sourceName: "Maglic",
      elevationM: 2386,
      label: {
        fr: "Maglić",
        en: "Maglić",
      },
      wikidata: "Q837723",
    },
    BLR: {
      sourceName: "Dzyarzhynskaya Hara",
      elevationM: 346,
      label: {
        fr: "Mont Dzerjinski",
        en: "Dziaržynkaja hara",
      },
      wikidata: "Q921447",
    },
    BLZ: {
      sourceName: "Doyle's Delight",
      elevationM: 1124,
      label: {
        fr: "Doyle's Delight",
        en: "Doyle's Delight",
      },
      wikidata: "Q47490",
    },
    BOL: {
      sourceName: "Nevado Sajama",
      elevationM: 6542,
      label: {
        fr: "Nevado Sajama",
        en: "Nevado Sajama",
      },
      wikidata: "Q272593",
    },
    BRA: {
      sourceName: "Pico da Neblina",
      elevationM: 2994,
      label: {
        fr: "Pico da Neblina",
        en: "Pico da Neblina",
      },
      wikidata: "Q739484",
    },
    BRB: {
      sourceName: "Mount Hillaby",
      elevationM: 336,
      label: {
        fr: "mont Hillaby",
        en: "Mount Hillaby",
      },
      wikidata: "Q1854502",
    },
    BRN: {
      sourceName: "Bukit Pagon",
      elevationM: 1850,
      label: {
        fr: "Bukit Pagon",
        en: "Bukit Pagon",
      },
      wikidata: "Q1003282",
    },
    BTN: {
      sourceName: "Gangkar Puensum",
      elevationM: 7570,
      label: {
        fr: "Gangkhar Puensum",
        en: "Gangkhar Puensum",
      },
      wikidata: "Q219986",
    },
    BWA: {
      sourceName: "Manyelanong Hill",
      elevationM: 1495,
      label: {
        fr: "Otse Hill",
        en: "Otse Hill",
      },
      wikidata: "Q3491942",
    },
    CAF: {
      sourceName: "Mont Ngaoui",
      elevationM: 1410,
      label: {
        fr: "mont Ngaoui",
        en: "Mont Ngaoui",
      },
      wikidata: "Q2422162",
    },
    CAN: {
      sourceName: "Mount Logan",
      elevationM: 5959,
      label: {
        fr: "mont Logan",
        en: "Mount Logan",
      },
      wikidata: "Q120306",
    },
    CHE: {
      sourceName: "Dufourspitze on Monte Rosa",
      elevationM: 4634,
      label: {
        fr: "pointe Dufour",
        en: "Dufourspitze",
      },
      wikidata: "Q3403",
    },
    CHL: {
      sourceName: "Nevado Ojos del Salado",
      elevationM: 6893,
      label: {
        fr: "Nevado Ojos del Salado",
        en: "Ojos del Salado",
      },
      wikidata: "Q233836",
    },
    CHN: {
      sourceName: "Mount Everest",
      elevationM: 8849,
      label: {
        fr: "Everest",
        en: "Mount Everest",
      },
      wikidata: "Q513",
    },
    CIV: {
      sourceName: "Monts Nimba",
      elevationM: 1752,
      label: {
        fr: "mont Nimba",
        en: "Mount Richard-Molard",
      },
      wikidata: "Q849129",
    },
    CMR: {
      sourceName: "Fako on Mont Cameroun",
      elevationM: 4045,
      label: null,
      wikidata: null,
    },
    COD: {
      sourceName: "Pic Marguerite on Mont Ngaliema",
      elevationM: 5110,
      label: {
        fr: "mont Stanley",
        en: "Mount Stanley",
      },
      wikidata: "Q221666",
    },
    COG: {
      sourceName: "Mont Nabeba",
      elevationM: 1020,
      label: {
        fr: "mont Nabemba",
        en: "Mont Nabemba",
      },
      wikidata: "Q3113296",
    },
    COL: {
      sourceName: "Pico Cristobal Colon",
      elevationM: 5730,
      label: null,
      wikidata: null,
    },
    COM: {
      sourceName: "Karthala",
      elevationM: 2360,
      label: {
        fr: "Karthala",
        en: "Mount Karthala",
      },
      wikidata: "Q527548",
    },
    CPV: {
      sourceName: "Mt. Fogo",
      elevationM: 2829,
      label: {
        fr: "Pico do Fogo",
        en: "Pico do Fogo",
      },
      wikidata: "Q499108",
    },
    CRI: {
      sourceName: "Cerro Chirripo",
      elevationM: 3819,
      label: {
        fr: "Cerro Chirripó",
        en: "Cerro Chirripó",
      },
      wikidata: "Q252362",
    },
    CUB: {
      sourceName: "Pico Turquino",
      elevationM: 1974,
      label: {
        fr: "Pico Turquino",
        en: "Pico Turquino",
      },
      wikidata: "Q1145743",
    },
    CYP: {
      sourceName: "Mount Olympus",
      elevationM: 1951,
      label: {
        fr: "mont Olympe",
        en: "Mount Olympus",
      },
      wikidata: "Q819979",
    },
    CZE: {
      sourceName: "Snezka",
      elevationM: 1602,
      label: {
        fr: "Sniejka",
        en: "Sněžka",
      },
      wikidata: "Q617511",
    },
    DEU: {
      sourceName: "Zugspitze",
      elevationM: 2963,
      label: {
        fr: "Zugspitze",
        en: "Zugspitze",
      },
      wikidata: "Q3375",
    },
    DJI: {
      sourceName: "Moussa Ali",
      elevationM: 2021,
      label: {
        fr: "Mousa Alli",
        en: "Mousa Ali",
      },
      wikidata: "Q1951029",
    },
    DMA: {
      sourceName: "Morne Diablotins",
      elevationM: 1447,
      label: {
        fr: "Morne Diablotins",
        en: "Morne Diablotins",
      },
      wikidata: "Q1638549",
    },
    DNK: {
      sourceName: "Store Mollehoj",
      elevationM: 171,
      label: {
        fr: "Møllehøj",
        en: "Møllehøj",
      },
      wikidata: "Q689106",
    },
    DOM: {
      sourceName: "Pico Duarte",
      elevationM: 3098,
      label: {
        fr: "Pico Duarte",
        en: "Pico Duarte",
      },
      wikidata: "Q783742",
    },
    DZA: {
      sourceName: "Tahat",
      elevationM: 2908,
      label: {
        fr: "Tahat",
        en: "Mount Tahat",
      },
      wikidata: "Q822326",
    },
    ECU: {
      sourceName: "Chimborazo",
      elevationM: 6267,
      label: {
        fr: "Chimborazo",
        en: "Chimborazo",
      },
      wikidata: "Q14081",
    },
    EGY: {
      sourceName: "Mount Catherine",
      elevationM: 2629,
      label: {
        fr: "mont Sainte-Catherine",
        en: "Mount Catherine",
      },
      wikidata: "Q1140642",
    },
    ERI: {
      sourceName: "Soira",
      elevationM: 3018,
      label: {
        fr: "mont Soira",
        en: "Emba Soira",
      },
      wikidata: "Q1753730",
    },
    ESP: {
      sourceName: "Pico de Teide on Canary Islands",
      elevationM: 3718,
      label: {
        fr: "Teide",
        en: "Teide",
      },
      wikidata: "Q38954",
    },
    EST: {
      sourceName: "Suur Munamagi",
      elevationM: 318,
      label: {
        fr: "Suur Munamägi",
        en: "Suur Munamägi",
      },
      wikidata: "Q504991",
    },
    ETH: {
      sourceName: "Ras Dejen",
      elevationM: 4550,
      label: {
        fr: "Ras Dashan",
        en: "Ras Dashen",
      },
      wikidata: "Q275435",
    },
    FIN: {
      sourceName: "Halti",
      elevationM: 1328,
      label: null,
      wikidata: null,
    },
    FJI: {
      sourceName: "Tomanivi",
      elevationM: 1324,
      label: {
        fr: "mont Tomanivi",
        en: "Mount Tomanivi",
      },
      wikidata: "Q1513944",
    },
    FRA: {
      sourceName: "Mont Blanc",
      elevationM: 4810,
      label: {
        fr: "mont Blanc",
        en: "Mont Blanc",
      },
      wikidata: "Q583",
    },
    FSM: {
      sourceName: "Nanlaud on Pohnpei",
      elevationM: 782,
      label: {
        fr: "Dolohmwar",
        en: "Dolohmwar",
      },
      wikidata: "Q1236265",
    },
    GAB: {
      sourceName: "Mont Bengoue",
      elevationM: 1050,
      label: {
        fr: "mont Bengoué",
        en: "Mont Bengoué",
      },
      wikidata: "Q3210770",
    },
    GBR: {
      sourceName: "Ben Nevis",
      elevationM: 1345,
      label: {
        fr: "Ben Nevis",
        en: "Ben Nevis",
      },
      wikidata: "Q104674",
    },
    GEO: {
      sourceName: "Mt'a Shkhara",
      elevationM: 5193,
      label: {
        fr: "Chkhara",
        en: "Shkhara",
      },
      wikidata: "Q217457",
    },
    GHA: {
      sourceName: "Mount Afadjato",
      elevationM: 885,
      label: {
        fr: "mont Afadjato",
        en: "Mount Afadja",
      },
      wikidata: "Q635179",
    },
    GIN: {
      sourceName: "Mont Nimba",
      elevationM: 1752,
      label: {
        fr: "mont Nimba",
        en: "Mount Richard-Molard",
      },
      wikidata: "Q849129",
    },
    GMB: {
      sourceName: "unnamed elevation",
      elevationM: 63,
      label: null,
      wikidata: null,
    },
    GNB: {
      sourceName: "Dongol Ronde",
      elevationM: 277,
      label: {
        fr: "mont Torin",
        en: "Monte Torin",
      },
      wikidata: "Q109837809",
    },
    GNQ: {
      sourceName: "Pico Basile",
      elevationM: 3008,
      label: {
        fr: "Pico Basilé",
        en: "Pico Basilé",
      },
      wikidata: "Q1518286",
    },
    GRC: {
      sourceName: "Mount Olympus",
      elevationM: 2917,
      label: {
        fr: "mont Olympe",
        en: "Mount Olympus",
      },
      wikidata: "Q80344",
    },
    GRD: {
      sourceName: "Mount Saint Catherine",
      elevationM: 840,
      label: {
        fr: "mont Sainte-Catherine",
        en: "Mount Saint Catherine",
      },
      wikidata: "Q525281",
    },
    GTM: {
      sourceName: "Volcan Tajumulco",
      elevationM: 4220,
      label: {
        fr: "Tajumulco",
        en: "Volcán Tajumulco",
      },
      wikidata: "Q818467",
    },
    GUY: {
      sourceName: "Laberintos del Norte on Mount Roraima",
      elevationM: 2775,
      label: null,
      wikidata: null,
    },
    HND: {
      sourceName: "Cerro Las Minas",
      elevationM: 2870,
      label: {
        fr: "Cerro Las Minas",
        en: "Cerro Las Minas",
      },
      wikidata: "Q1055875",
    },
    HRV: {
      sourceName: "Dinara",
      elevationM: 1831,
      label: {
        fr: "Dinara",
        en: "Dinara",
      },
      wikidata: "Q3183447",
    },
    HTI: {
      sourceName: "Pic la Selle",
      elevationM: 2674,
      label: {
        fr: "pic la Selle",
        en: "Peak la Selle",
      },
      wikidata: "Q1971319",
    },
    HUN: {
      sourceName: "Kekes",
      elevationM: 1014,
      label: {
        fr: "Kékes",
        en: "Kékes",
      },
      wikidata: "Q747618",
    },
    IDN: {
      sourceName: "Puncak Jaya",
      elevationM: 4884,
      label: {
        fr: "Puncak Jaya",
        en: "Puncak Jaya",
      },
      wikidata: "Q1045888",
    },
    IND: {
      sourceName: "Kanchenjunga",
      elevationM: 8586,
      label: {
        fr: "Kangchenjunga",
        en: "Kanchenjunga",
      },
      wikidata: "Q82019",
    },
    IRL: {
      sourceName: "Carrauntoohil",
      elevationM: 1041,
      label: {
        fr: "Carrauntuohill",
        en: "Carrauntoohil",
      },
      wikidata: "Q503368",
    },
    IRN: {
      sourceName: "Kuh-e Damavand",
      elevationM: 5625,
      label: {
        fr: "mont Damavand",
        en: "Damavand",
      },
      wikidata: "Q40758",
    },
    IRQ: {
      sourceName: "Cheekha Dar",
      elevationM: 3611,
      label: {
        fr: "Cheekha Dar",
        en: "Cheekha Dar",
      },
      wikidata: "Q1068860",
    },
    ISL: {
      sourceName: "Hvannadalshnukur",
      elevationM: 2110,
      label: {
        fr: "Hvannadalshnjúkur",
        en: "Hvannadalshnúkur",
      },
      wikidata: "Q140084",
    },
    ISR: {
      sourceName: "Mitspe Shlagim",
      elevationM: 2224,
      label: null,
      wikidata: null,
    },
    ITA: {
      sourceName: "Mont Blanc de Courmayeur",
      elevationM: 4748,
      label: null,
      wikidata: null,
    },
    JAM: {
      sourceName: "Blue Mountain Peak",
      elevationM: 2256,
      label: {
        fr: "pic Blue Mountain",
        en: "Blue Mountain Peak",
      },
      wikidata: "Q885798",
    },
    JOR: {
      sourceName: "Jabal Umm ad Dami",
      elevationM: 1854,
      label: {
        fr: "djebel Umm ad Dami",
        en: "Jabal Umm ad Dami",
      },
      wikidata: "Q1261902",
    },
    JPN: {
      sourceName: "Mount Fuji",
      elevationM: 3776,
      label: {
        fr: "mont Fuji",
        en: "Mount Fuji",
      },
      wikidata: "Q39231",
    },
    KAZ: {
      sourceName: "Pik Khan-Tengri",
      elevationM: 7010,
      label: {
        fr: "Khan Tengri",
        en: "Khan Tengri",
      },
      wikidata: "Q211529",
    },
    KEN: {
      sourceName: "Mount Kenya",
      elevationM: 5199,
      label: {
        fr: "mont Kenya",
        en: "Mount Kenya",
      },
      wikidata: "Q172070",
    },
    KGZ: {
      sourceName: "Jengish Chokusu",
      elevationM: 7439,
      label: {
        fr: "Jengish Chokusu",
        en: "Jengish Chokusu",
      },
      wikidata: "Q332762",
    },
    KHM: {
      sourceName: "Phnum Aoral",
      elevationM: 1810,
      label: {
        fr: "Phnum Aoral",
        en: "Phnom Aural",
      },
      wikidata: "Q539772",
    },
    KIR: {
      sourceName: "unnamed elevation on Banaba",
      elevationM: 81,
      label: null,
      wikidata: null,
    },
    KNA: {
      sourceName: "Mount Liamuiga",
      elevationM: 1156,
      label: {
        fr: "mont Liamuiga",
        en: "Mount Liamuiga",
      },
      wikidata: "Q1269774",
    },
    KOR: {
      sourceName: "Halla-san",
      elevationM: 1950,
      label: {
        fr: "Hallasan",
        en: "Hallasan",
      },
      wikidata: "Q494645",
    },
    KWT: {
      sourceName: "3.6 km W. of Al-Salmi Border Post",
      elevationM: 300,
      label: null,
      wikidata: null,
    },
    LAO: {
      sourceName: "Phu Bia",
      elevationM: 2817,
      label: {
        fr: "Phou Bia",
        en: "Phou Bia",
      },
      wikidata: "Q239485",
    },
    LBN: {
      sourceName: "Qornet es Saouda",
      elevationM: 3088,
      label: {
        fr: "Qurnat as Sawda'",
        en: "Qurnat as Sawda'",
      },
      wikidata: "Q311330",
    },
    LBR: {
      sourceName: "Mount Wuteve",
      elevationM: 1447,
      label: {
        fr: "mont Wuteve",
        en: "Mount Wuteve",
      },
      wikidata: "Q1950836",
    },
    LBY: {
      sourceName: "Bikku Bitti",
      elevationM: 2267,
      label: {
        fr: "Bikku Bitti",
        en: "Bikku Bitti",
      },
      wikidata: "Q860146",
    },
    LCA: {
      sourceName: "Mount Gimie",
      elevationM: 948,
      label: {
        fr: "mont Gimie",
        en: "Mount Gimie",
      },
      wikidata: "Q1811114",
    },
    LIE: {
      sourceName: "Vorder-Grauspitz",
      elevationM: 2599,
      label: {
        fr: "Grauspitz",
        en: "Grauspitz",
      },
      wikidata: "Q665000",
    },
    LKA: {
      sourceName: "Pidurutalagala",
      elevationM: 2524,
      label: {
        fr: "Pidurutalagala",
        en: "Pidurutalagala",
      },
      wikidata: "Q1146327",
    },
    LSO: {
      sourceName: "Thabana Ntlenyana",
      elevationM: 3482,
      label: {
        fr: "Thabana Ntlenyana",
        en: "Thabana Ntlenyana",
      },
      wikidata: "Q733132",
    },
    LTU: {
      sourceName: "Aukstojas",
      elevationM: 294,
      label: {
        fr: "Aukštojas",
        en: "Aukštojas Hill",
      },
      wikidata: "Q771431",
    },
    LUX: {
      sourceName: "Buurgplaatz",
      elevationM: 559,
      label: {
        fr: "Kneiff",
        en: "Kneiff",
      },
      wikidata: "Q24457",
    },
    LVA: {
      sourceName: "Gaizina Kalns",
      elevationM: 312,
      label: {
        fr: "Gaiziņkalns",
        en: "Gaiziņkalns",
      },
      wikidata: "Q1122342",
    },
    MAR: {
      sourceName: "Jebel Toubkal",
      elevationM: 4165,
      label: {
        fr: "djebel Toubkal",
        en: "Jbel Toubkal",
      },
      wikidata: "Q503433",
    },
    MCO: {
      sourceName: "Chemin des Revoires on Mont Agel",
      elevationM: 162,
      label: {
        fr: "chemin des Révoires",
        en: "Chemin des Révoires",
      },
      wikidata: "Q1069352",
    },
    MDA: {
      sourceName: "Dealul Balanesti",
      elevationM: 430,
      label: {
        fr: "Dealul Bălănești",
        en: "Bălănești Hill",
      },
      wikidata: "Q47940",
    },
    MDG: {
      sourceName: "Maromokotro",
      elevationM: 2876,
      label: {
        fr: "Maromokotro",
        en: "Maromokotro",
      },
      wikidata: "Q1147144",
    },
    MDV: {
      sourceName: "8th tee, golf course, Villingi Island",
      elevationM: 5,
      label: null,
      wikidata: null,
    },
    MEX: {
      sourceName: "Volcan Pico de Orizaba",
      elevationM: 5636,
      label: {
        fr: "pic d'Orizaba",
        en: "Citlaltepetl",
      },
      wikidata: "Q238147",
    },
    MHL: {
      sourceName: "East-central Airik Island, Maloelap Atoll",
      elevationM: 14,
      label: {
        fr: "Likiep",
        en: "Likiep Atoll",
      },
      wikidata: "Q518353",
    },
    MKD: {
      sourceName: "Golem Korab",
      elevationM: 2764,
      label: {
        fr: "mont Korab",
        en: "Korab",
      },
      wikidata: "Q912579",
    },
    MLI: {
      sourceName: "Hombori Tondo",
      elevationM: 1155,
      label: {
        fr: "monts Hombori",
        en: "Mount Hombori",
      },
      wikidata: "Q1454300",
    },
    MLT: {
      sourceName: "Ta'Dmejrek on Dingli Cliffs",
      elevationM: 253,
      label: {
        fr: "Ta' Dmejrek",
        en: "Ta' Dmejrek",
      },
      wikidata: "Q1850604",
    },
    MMR: {
      sourceName: "Gamlang Razi",
      elevationM: 5870,
      label: {
        fr: "Hkakabo Razi",
        en: "Hkakabo Razi",
      },
      wikidata: "Q870063",
    },
    MNE: {
      sourceName: "Zia Kolata",
      elevationM: 2534,
      label: {
        fr: "Zla Kolata",
        en: "Zla Kolata",
      },
      wikidata: "Q2720697",
    },
    MNG: {
      sourceName: "Nayramadlin Orgil",
      elevationM: 4374,
      label: {
        fr: "Kujten Uul",
        en: "Hüiten Peak",
      },
      wikidata: "Q1091113",
    },
    MOZ: {
      sourceName: "Monte Binga",
      elevationM: 2436,
      label: {
        fr: "mont Binga",
        en: "Monte Binga",
      },
      wikidata: "Q1353678",
    },
    MRT: {
      sourceName: "Kediet Ijill",
      elevationM: 915,
      label: {
        fr: "Kedia d'Idjil",
        en: "Kediet ej Jill",
      },
      wikidata: "Q2595789",
    },
    MUS: {
      sourceName: "Mont Piton",
      elevationM: 828,
      label: {
        fr: "piton de la Petite Rivière Noire",
        en: "Piton de la Petite Rivière Noire",
      },
      wikidata: "Q1760978",
    },
    MWI: {
      sourceName: "Sapitwa",
      elevationM: 3002,
      label: {
        fr: "Massif Mulanje",
        en: "Mulanje Massif",
      },
      wikidata: "Q1510436",
    },
    MYS: {
      sourceName: "Gunung Kinabalu",
      elevationM: 4095,
      label: {
        fr: "mont Kinabalu",
        en: "Mount Kinabalu",
      },
      wikidata: "Q60967",
    },
    NAM: {
      sourceName: "Konigstein on Brandberg",
      elevationM: 2573,
      label: {
        fr: "massif du Brandberg",
        en: "Brandberg",
      },
      wikidata: "Q897834",
    },
    NER: {
      sourceName: "Idoukal-n-Taghes",
      elevationM: 2022,
      label: {
        fr: "mont Indoukat-n-Taglès",
        en: "Mont Idoukal-n-Taghès",
      },
      wikidata: "Q3042286",
    },
    NGA: {
      sourceName: "Chappal Waddi",
      elevationM: 2419,
      label: {
        fr: "Chappal Waddi",
        en: "Chappal Waddi",
      },
      wikidata: "Q976055",
    },
    NIC: {
      sourceName: "Mogoton",
      elevationM: 2085,
      label: {
        fr: "Cerro Mogotón",
        en: "Cerro Mogotón",
      },
      wikidata: "Q2092378",
    },
    NLD: {
      sourceName: "Mount Scenery",
      elevationM: 862,
      label: {
        fr: "mont Scenery",
        en: "Mount Scenery",
      },
      wikidata: "Q1301834",
    },
    NOR: {
      sourceName: "Galdhopiggen",
      elevationM: 2469,
      label: {
        fr: "Galdhøpiggen",
        en: "Galdhøpiggen",
      },
      wikidata: "Q203942",
    },
    NPL: {
      sourceName: "Mount Everest",
      elevationM: 8849,
      label: {
        fr: "Everest",
        en: "Mount Everest",
      },
      wikidata: "Q513",
    },
    NRU: {
      sourceName: "Command Ridge",
      elevationM: 70,
      label: {
        fr: "Command Ridge",
        en: "Command Ridge",
      },
      wikidata: "Q2667931",
    },
    NZL: {
      sourceName: "Aoraki/Mount Cook",
      elevationM: 3724,
      label: {
        fr: "Aoraki/Mont Cook",
        en: "Aoraki / Mount Cook",
      },
      wikidata: "Q5059",
    },
    OMN: {
      sourceName: "Jabal Shams",
      elevationM: 3004,
      label: {
        fr: "djebel Shams",
        en: "Jebel Shams",
      },
      wikidata: "Q1261915",
    },
    PAK: {
      sourceName: "K2",
      elevationM: 8611,
      label: {
        fr: "K2",
        en: "K2",
      },
      wikidata: "Q43512",
    },
    PAN: {
      sourceName: "Volcan Baru",
      elevationM: 3475,
      label: {
        fr: "Barú",
        en: "Volcan Baru",
      },
      wikidata: "Q594726",
    },
    PER: {
      sourceName: "Nevado Huascaran",
      elevationM: 6746,
      label: {
        fr: "Huascarán",
        en: "Huascarán",
      },
      wikidata: "Q200935",
    },
    PHL: {
      sourceName: "Mount Apo",
      elevationM: 2954,
      label: {
        fr: "mont Apo",
        en: "Mount Apo",
      },
      wikidata: "Q455963",
    },
    PLW: {
      sourceName: "Mount Ngerchelchuus",
      elevationM: 242,
      label: {
        fr: "mont Ngerchelchuus",
        en: "Mount Ngerchelchuus",
      },
      wikidata: "Q1191219",
    },
    PNG: {
      sourceName: "Mount Wilhelm",
      elevationM: 4509,
      label: {
        fr: "mont Wilhelm",
        en: "Mount Wilhelm",
      },
      wikidata: "Q277441",
    },
    POL: {
      sourceName: "Rysy",
      elevationM: 2499,
      label: {
        fr: "Rysy",
        en: "Rysy",
      },
      wikidata: "Q672936",
    },
    PRK: {
      sourceName: "Paektu-san",
      elevationM: 2744,
      label: {
        fr: "mont Paektu",
        en: "Baekdu Mountain",
      },
      wikidata: "Q107635",
    },
    PRT: {
      sourceName: "Ponta do Pico on Ilha do Pico in the Azores",
      elevationM: 2351,
      label: {
        fr: "Ponta do Pico",
        en: "Mount Pico",
      },
      wikidata: "Q928681",
    },
    PRY: {
      sourceName: "Cerro Pero",
      elevationM: 842,
      label: {
        fr: "Cerro Peró",
        en: "Cerro Tres Kandú",
      },
      wikidata: "Q1055965",
    },
    PSE: {
      sourceName: "Khallat al Batrakh",
      elevationM: 1020,
      label: {
        fr: "mont Nabi Yunis",
        en: "Mount Nabi Yunis",
      },
      wikidata: "Q6922335",
    },
    QAT: {
      sourceName: "Tuwayyir al Hamir",
      elevationM: 103,
      label: {
        fr: "Qurayn Abu al Bawl",
        en: "Qurayn Abu al Bawl",
      },
      wikidata: "Q1633034",
    },
    ROU: {
      sourceName: "Moldoveanu",
      elevationM: 2544,
      label: {
        fr: "Moldoveanu",
        en: "Moldoveanu Peak",
      },
      wikidata: "Q746524",
    },
    RUS: {
      sourceName: "Gora El'brus",
      elevationM: 5642,
      label: {
        fr: "Elbrouz",
        en: "Mount Elbrus",
      },
      wikidata: "Q43105",
    },
    RWA: {
      sourceName: "Volcan Karisimbi",
      elevationM: 4519,
      label: {
        fr: "mont Karisimbi",
        en: "Mount Karisimbi",
      },
      wikidata: "Q737859",
    },
    SAU: {
      sourceName: "As Sarawat range",
      elevationM: 3000,
      label: null,
      wikidata: null,
    },
    SDN: {
      sourceName: "Jabal Marrah",
      elevationM: 3042,
      label: {
        fr: "lac Marra Deriba",
        en: "Deriba Caldera",
      },
      wikidata: "Q2520348",
    },
    SEN: {
      sourceName: "unnamed elevation 2.8 km southeast of Nepen Diaka",
      elevationM: 648,
      label: null,
      wikidata: null,
    },
    SGP: {
      sourceName: "Bukit Timah",
      elevationM: 166,
      label: {
        fr: "Bukit Timah",
        en: "Bukit Timah",
      },
      wikidata: "Q720209",
    },
    SLB: {
      sourceName: "Mount Popomanaseu",
      elevationM: 2335,
      label: {
        fr: "mont Popomanaseu",
        en: "Mount Popomanaseu",
      },
      wikidata: "Q760819",
    },
    SLE: {
      sourceName: "Loma Mansa",
      elevationM: 1948,
      label: {
        fr: "Loma Mansa",
        en: "Mount Bintumani",
      },
      wikidata: "Q769525",
    },
    SLV: {
      sourceName: "Cerro El Pital",
      elevationM: 2730,
      label: {
        fr: "Cerro El Pital",
        en: "Cerro El Pital",
      },
      wikidata: "Q74214",
    },
    SMR: {
      sourceName: "Monte Titano",
      elevationM: 739,
      label: {
        fr: "mont Titano",
        en: "Monte Titano",
      },
      wikidata: "Q158526",
    },
    SOM: {
      sourceName: "Mount Shimbiris",
      elevationM: 2460,
      label: {
        fr: "Shimbiris",
        en: "Shimbiris",
      },
      wikidata: "Q649162",
    },
    SRB: {
      sourceName: "Midzor",
      elevationM: 2169,
      label: null,
      wikidata: null,
    },
    SSD: {
      sourceName: "Kinyeti",
      elevationM: 3187,
      label: {
        fr: "Kinyeti",
        en: "Kinyeti",
      },
      wikidata: "Q948298",
    },
    STP: {
      sourceName: "Pico de Sao Tome",
      elevationM: 2024,
      label: {
        fr: "Pico de São Tomé",
        en: "Pico de São Tomé",
      },
      wikidata: "Q1471391",
    },
    SUR: {
      sourceName: "Juliana Top",
      elevationM: 1230,
      label: null,
      wikidata: null,
    },
    SVK: {
      sourceName: "Gerlachovsky Stit",
      elevationM: 2655,
      label: {
        fr: "Gerlachovský štít",
        en: "Gerlachovský štít",
      },
      wikidata: "Q81213",
    },
    SVN: {
      sourceName: "Triglav",
      elevationM: 2864,
      label: {
        fr: "Triglav",
        en: "Triglav",
      },
      wikidata: "Q1024",
    },
    SWE: {
      sourceName: "Kebnekaise South",
      elevationM: 2100,
      label: {
        fr: "Kebnekaise",
        en: "Kebnekaise",
      },
      wikidata: "Q214011",
    },
    SWZ: {
      sourceName: "Emlembe",
      elevationM: 1862,
      label: {
        fr: "Emlembe",
        en: "Emlembe",
      },
      wikidata: "Q1337951",
    },
    SYC: {
      sourceName: "Morne Seychellois",
      elevationM: 905,
      label: {
        fr: "Morne Seychellois",
        en: "Morne Seychellois",
      },
      wikidata: "Q1579060",
    },
    SYR: {
      sourceName: "Mount Hermon",
      elevationM: 2814,
      label: {
        fr: "mont Hermon",
        en: "Mount Hermon",
      },
      wikidata: "Q215471",
    },
    TCD: {
      sourceName: "Emi Koussi",
      elevationM: 3445,
      label: {
        fr: "Emi Koussi",
        en: "Emi Koussi",
      },
      wikidata: "Q257441",
    },
    TGO: {
      sourceName: "Mont Agou",
      elevationM: 986,
      label: {
        fr: "mont Agou",
        en: "Mount Agou",
      },
      wikidata: "Q1753509",
    },
    THA: {
      sourceName: "Doi Inthanon",
      elevationM: 2565,
      label: {
        fr: "Doi Inthanon",
        en: "Doi Inthanon",
      },
      wikidata: "Q1140075",
    },
    TJK: {
      sourceName: "Qullai Somoniyon",
      elevationM: 7495,
      label: {
        fr: "pic Ismail Samani",
        en: "Ismoil Somoni Peak",
      },
      wikidata: "Q41413",
    },
    TKM: {
      sourceName: "Gora Ayribaba",
      elevationM: 3139,
      label: {
        fr: "Aýrybaba",
        en: "Aýrybaba",
      },
      wikidata: "Q794684",
    },
    TLS: {
      sourceName: "Foho Tatamailau",
      elevationM: 2963,
      label: {
        fr: "mont Ramelau",
        en: "Tatamailau",
      },
      wikidata: "Q1539961",
    },
    TON: {
      sourceName: "Kao Volcano on Kao Island",
      elevationM: 1046,
      label: {
        fr: "Kao",
        en: "Kao",
      },
      wikidata: "Q1520405",
    },
    TTO: {
      sourceName: "El Cerro del Aripo",
      elevationM: 940,
      label: {
        fr: "Cerro del Aripo",
        en: "El Cerro del Aripo",
      },
      wikidata: "Q1056103",
    },
    TUN: {
      sourceName: "Jebel ech Chambi",
      elevationM: 1544,
      label: {
        fr: "djebel Chambi",
        en: "Jebel ech Chambi",
      },
      wikidata: "Q1232136",
    },
    TUR: {
      sourceName: "Mount Ararat",
      elevationM: 5137,
      label: {
        fr: "mont Ararat",
        en: "Mount Ararat",
      },
      wikidata: "Q72303",
    },
    TUV: {
      sourceName: "unnamed location",
      elevationM: 5,
      label: null,
      wikidata: null,
    },
    TWN: {
      sourceName: "Yu Shan",
      elevationM: 3952,
      label: {
        fr: "Yu Shan",
        en: "Yushan Main Peak",
      },
      wikidata: "Q500275",
    },
    TZA: {
      sourceName: "Kilimanjaro",
      elevationM: 5895,
      label: {
        fr: "Kibo",
        en: "Mount Kibo",
      },
      wikidata: "Q1394606",
    },
    UGA: {
      sourceName: "Margherita Peak on Mount Stanley",
      elevationM: 5110,
      label: {
        fr: "mont Stanley",
        en: "Mount Stanley",
      },
      wikidata: "Q221666",
    },
    UKR: {
      sourceName: "Hora Hoverla",
      elevationM: 2061,
      label: {
        fr: "Hoverla",
        en: "Hoverla",
      },
      wikidata: "Q627508",
    },
    URY: {
      sourceName: "Cerro Catedral",
      elevationM: 514,
      label: {
        fr: "Cerro Catedral",
        en: "Cerro Catedral",
      },
      wikidata: "Q1055837",
    },
    USA: {
      sourceName: "Mount McKinley",
      elevationM: 6190,
      label: null,
      wikidata: null,
    },
    UZB: {
      sourceName: "Xazrat Sulton Tog'",
      elevationM: 4643,
      label: {
        fr: "Khazret Sultan",
        en: "Khazret Sultan",
      },
      wikidata: "Q519822",
    },
    VAT: {
      sourceName: "Vatican Gardens",
      elevationM: 78,
      label: {
        fr: "colline du Vatican",
        en: "Vatican Hill",
      },
      wikidata: "Q1053000",
    },
    VCT: {
      sourceName: "La Soufriere",
      elevationM: 1234,
      label: {
        fr: "la Soufrière",
        en: "La Soufrière",
      },
      wikidata: "Q26544",
    },
    VEN: {
      sourceName: "Pico Bolivar",
      elevationM: 4978,
      label: {
        fr: "Pico Bolívar",
        en: "Pico Bolívar",
      },
      wikidata: "Q213704",
    },
    VNM: {
      sourceName: "Fan Si Pan",
      elevationM: 3144,
      label: {
        fr: "Fansipan",
        en: "Fansipan",
      },
      wikidata: "Q123782",
    },
    VUT: {
      sourceName: "Tabwemasana",
      elevationM: 1877,
      label: {
        fr: "mont Tabwemasana",
        en: "Mount Tabwemasana",
      },
      wikidata: "Q1542459",
    },
    WSM: {
      sourceName: "Mount Silisili",
      elevationM: 1857,
      label: {
        fr: "Mauga Silisili",
        en: "Silisili",
      },
      wikidata: "Q1147814",
    },
    XKX: {
      sourceName: "Gjeravica/Deravica",
      elevationM: 2656,
      label: {
        fr: "Djeravica",
        en: "Gjeravica",
      },
      wikidata: "Q341983",
    },
    YEM: {
      sourceName: "Jabal an Nabi Shu'ayb",
      elevationM: 3666,
      label: {
        fr: "Jabal an Nabi Shu'ayb",
        en: "Jabal an Nabi Shu'ayb",
      },
      wikidata: "Q1261935",
    },
    ZAF: {
      sourceName: "Ntheledi",
      elevationM: 3450,
      label: {
        fr: "Mafadi",
        en: "Mafadi",
      },
      wikidata: "Q1883683",
    },
    ZMB: {
      sourceName: "Mafinga Central",
      elevationM: 2330,
      label: {
        fr: "Mafinga Central",
        en: "Mafinga Central",
      },
      wikidata: "Q18351462",
    },
    ZWE: {
      sourceName: "Inyangani",
      elevationM: 2592,
      label: {
        fr: "Inyangani",
        en: "Mount Nyangani",
      },
      wikidata: "Q152294",
    },
  },
  overrides: {
    AUS: {
      kind: "label",
      label: {
        fr: "mont Kosciuszko",
        en: "Mount Kosciuszko",
      },
      reason:
        "Wikidata P610 donne le pic Mawson (île Heard), exclue du périmètre territorial ; le Factbook donne le Kosciuszko, point culminant du territoire intégré.",
    },
    SRB: {
      kind: "label",
      label: {
        fr: "Midžor",
        en: "Midžor",
      },
      reason:
        "Wikidata P610 donne la Velika Rudoka, située au Kosovo (jouable à part) ; le Factbook donne le Midžor, point culminant de la Serbie.",
    },
    MMR: {
      kind: "label",
      label: {
        fr: "Gamlang Razi",
        en: "Gamlang Razi",
      },
      reason:
        "Mesure disputée : le Factbook donne le Gamlang Razi (5 870 m), Wikidata le Hkakabo Razi (5 881 m). Le Factbook reste la source de l'altitude et du nom.",
    },
    ITA: {
      kind: "label",
      label: {
        fr: "Mont Blanc de Courmayeur",
        en: "Mont Blanc de Courmayeur",
      },
      reason:
        "Wikidata P610 donne le Mont Blanc (sommet franco-italien, 4 808 m) ; le Factbook donne le Mont Blanc de Courmayeur (4 748 m), point culminant strictement italien.",
    },
    CMR: {
      kind: "label",
      label: {
        fr: "mont Cameroun",
        en: "Mount Cameroon",
      },
      reason:
        "Même sommet (Fako sur le mont Cameroun) : le Factbook donne 4 045 m, Wikidata 4 095 m, au-delà de la tolérance de 25 m. L'altitude reste celle du Factbook.",
    },
    GUY: {
      kind: "label",
      label: {
        fr: "mont Roraima",
        en: "Mount Roraima",
      },
      reason:
        "Même sommet (Laberintos del Norte sur le Roraima) : le Factbook donne 2 775 m, Wikidata 2 810 m. L'altitude reste celle du Factbook.",
    },
    FIN: {
      kind: "label",
      label: {
        fr: "Halti",
        en: "Halti",
      },
      reason:
        "Le Factbook donne le point finlandais du Halti (1 328 m) ; Wikidata mesure le sommet du Halti, situé en Norvège (1 361 m). L'altitude reste celle du Factbook.",
    },
    COL: {
      kind: "label",
      label: {
        fr: "pic Cristóbal Colón",
        en: "Pico Cristóbal Colón",
      },
      reason:
        "Wikidata porte deux sommets à 5 775 m (Simón Bolívar, Cristóbal Colón) ; le Factbook donne le Cristóbal Colón à 5 730 m, hors tolérance.",
    },
    SUR: {
      kind: "label",
      label: {
        fr: "Juliana Top",
        en: "Julianatop",
      },
      reason:
        "Même sommet : le Factbook donne 1 230 m, Wikidata 1 280 m, hors tolérance. L'altitude reste celle du Factbook ; le libellé fr est celui de Wikidata.",
    },
    BWA: {
      kind: "label",
      label: {
        fr: "Manyelanong Hill",
        en: "Manyelanong Hill",
      },
      reason:
        "Wikidata P610 donne l'Otse Hill ; le Factbook donne le Manyelanong Hill (1 495 m). On suit le Factbook.",
    },
    GNB: {
      kind: "label",
      label: {
        fr: "Dongol Ronde",
        en: "Dongol Ronde",
      },
      reason:
        "Wikidata P610 donne le mont Torin (Monte Torin, 262 m) ; le Factbook donne le Dongol Ronde (277 m). On suit le Factbook, sans libellé Wikidata.",
    },
    KWT: {
      kind: "label",
      label: null,
      reason:
        "Le Factbook donne une position (« 3.6 km W. of Al-Salmi Border Post »), pas un nom ; Wikidata P610 donne la crête de Mutla (140 m), incompatible avec les 300 m du Factbook.",
    },
    MDV: {
      kind: "label",
      label: null,
      reason:
        "Le Factbook donne une position (« 8th tee, golf course, Villingi Island »), pas un nom ; Wikidata porte deux îles (Addu City, Villingili), pas un sommet.",
    },
    MHL: {
      kind: "label",
      label: null,
      reason:
        "Le Factbook donne une position (« East-central Airik Island, Maloelap Atoll ») ; la correspondance par altitude tombait sur l'atoll de Likiep, qui n'est pas ce point.",
    },
    SAU: {
      kind: "peak",
      label: {
        fr: "Jabal Sawda",
        en: "Jabal Sawda",
      },
      elevationM: 3133,
      reason:
        "Décision du gate du lot 5 (2026-10-09) : le Factbook désigne une chaîne (« As Sarawat range, 3,000 m »), pas un sommet. Jabal Sawda, sommet de cette chaîne ; altitude : Wikidata (Q1261892, P2044).",
    },
    FSM: {
      kind: "label",
      label: {
        fr: "Nanlaud",
        en: "Nanlaud",
      },
      reason:
        "Wikidata P610 donne le Dolohmwar ; le Factbook donne le Nanlaud (782 m), sur Pohnpei. On suit le Factbook.",
    },
    LUX: {
      kind: "label",
      label: {
        fr: "Buurgplaatz",
        en: "Buurgplaatz",
      },
      reason:
        "Wikidata P610 donne le Kneiff (560 m), voisin immédiat ; le Factbook donne le Buurgplaatz (559 m). On suit le Factbook.",
    },
    QAT: {
      kind: "label",
      label: {
        fr: "Tuwayyir al Hamir",
        en: "Tuwayyir al Hamir",
      },
      reason:
        "Wikidata P610 donne le Qurayn Abu al Bawl (103 m) ; le Factbook donne le Tuwayyir al Hamir (103 m). On suit le Factbook.",
    },
    PSE: {
      kind: "label",
      label: {
        fr: "Khallat al Batrakh",
        en: "Khallat al Batrakh",
      },
      reason:
        "Le Factbook découpe la Palestine : on retient le plus haut des deux points (Cisjordanie 1 020 m, Gaza 105 m). Wikidata P610 donne le mont Nabi Yunis ; on suit le nom du Factbook.",
    },
    CIV: {
      kind: "label",
      label: {
        fr: "mont Nimba",
        en: "Mount Nimba",
      },
      reason:
        "Même sommet partagé avec la Guinée : le libellé Wikidata en (Mount Richard-Molard) n'est pas le nom usuel, le Factbook dit Monts Nimba.",
    },
    TZA: {
      kind: "label",
      label: {
        fr: "Kilimandjaro",
        en: "Kilimanjaro",
      },
      reason:
        "Wikidata P610 donne le Kibo, sommet du massif ; le nom usuel du point culminant de la Tanzanie est le Kilimandjaro (nom du Factbook).",
    },
    MWI: {
      kind: "label",
      label: {
        fr: "Sapitwa",
        en: "Sapitwa",
      },
      reason:
        "Wikidata P610 donne le massif du Mulanje ; le sommet est le Sapitwa (nom du Factbook).",
    },
    SDN: {
      kind: "label",
      label: {
        fr: "djebel Marra",
        en: "Jebel Marra",
      },
      reason:
        "Wikidata P610 donne la caldeira Deriba (lac Marra Deriba), pas le sommet ; le Factbook dit Jabal Marrah.",
    },
    MEX: {
      kind: "label",
      label: {
        fr: "pic d'Orizaba",
        en: "Pico de Orizaba",
      },
      reason:
        "Le libellé Wikidata en est Citlaltepetl ; le nom usuel anglais est Pico de Orizaba (nom du Factbook).",
    },
    MLI: {
      kind: "label",
      label: {
        fr: "Hombori Tondo",
        en: "Hombori Tondo",
      },
      reason:
        "Les libellés Wikidata désignent le massif des monts Hombori ; le point culminant est le Hombori Tondo (nom du Factbook).",
    },
    NAM: {
      kind: "label",
      label: {
        fr: "Königstein",
        en: "Königstein",
      },
      reason:
        "Les libellés Wikidata désignent le massif du Brandberg ; le point culminant est le Königstein (nom du Factbook).",
    },
    ISR: {
      kind: "peak",
      label: {
        fr: "mont Méron",
        en: "Mount Meron",
      },
      elevationM: 1208,
      reason:
        "Décision du gate du lot 5 (2026-10-09) : sommet du territoire reconnu. Le Factbook donne le Mitspe Shlagim (2 224 m), sur le mont Hermon, dans le Golan, hors du périmètre « territoire pleinement intégré ». Altitude du mont Méron : Wikidata (Q540520, P2044).",
    },
    USA: {
      kind: "label",
      label: {
        fr: "Denali",
        en: "Denali",
      },
      reason:
        "Décision du gate du lot 5 (2026-10-09) : Denali, le nom de l'usage courant et cartographique. Le Factbook (commit figé) dit Mount McKinley, nom fédéral rétabli en 2025 ; Wikidata dit Denali (sans libellé en).",
    },
  },
};
