import type { CapitalLabelsSnapshot } from "./types";

/**
 * Libellés fr/en des capitales — Wikidata (`P36`, `rdfs:label`), récoltés par
 * `scripts/countries/harvest/capitalLabels.ts` (`pnpm harvest:capitals`).
 *
 * `labels` est **généré** : ne pas l'éditer à la main. `overrides` est curé, chaque
 * entrée avec son motif ; il est préservé à chaque récolte et l'emporte sur `labels`.
 * La liste des capitales reste celle de REST Countries, ce dataset ne fait que la
 * traduire (indexé par ISO3 puis par nom source).
 */
export const CAPITAL_LABELS: CapitalLabelsSnapshot = {
  harvestedAt: "2026-09-23",
  labels: {
    AFG: {
      Kabul: {
        fr: "Kaboul",
        en: "Kabul",
      },
    },
    AGO: {
      Luanda: {
        fr: "Luanda",
        en: "Luanda",
      },
    },
    ALB: {
      Tirana: {
        fr: "Tirana",
        en: "Tirana",
      },
    },
    AND: {
      "Andorra la Vella": {
        fr: "Andorre-la-Vieille",
        en: "Andorra la Vella",
      },
    },
    ARE: {
      "Abu Dhabi": {
        fr: "Abou Dabi",
        en: "Abu Dhabi",
      },
    },
    ARG: {
      "Buenos Aires": {
        fr: "Buenos Aires",
        en: "Buenos Aires",
      },
    },
    ARM: {
      Yerevan: {
        fr: "Erevan",
        en: "Yerevan",
      },
    },
    AUS: {
      Canberra: {
        fr: "Canberra",
        en: "Canberra",
      },
    },
    AUT: {
      Vienna: {
        fr: "Vienne",
        en: "Vienna",
      },
    },
    AZE: {
      Baku: {
        fr: "Bakou",
        en: "Baku",
      },
    },
    BDI: {
      Gitega: {
        fr: "Gitega",
        en: "Gitega",
      },
    },
    BEL: {
      Brussels: {
        fr: "Bruxelles",
        en: "Brussels",
      },
    },
    BEN: {
      "Porto-Novo": {
        fr: "Porto-Novo",
        en: "Porto-Novo",
      },
    },
    BFA: {
      Ouagadougou: {
        fr: "Ouagadougou",
        en: "Ouagadougou",
      },
    },
    BGD: {
      Dhaka: {
        fr: "Dacca",
        en: "Dhaka",
      },
    },
    BGR: {
      Sofia: {
        fr: "Sofia",
        en: "Sofia",
      },
    },
    BHR: {
      Manama: {
        fr: "Manama",
        en: "Manama",
      },
    },
    BHS: {
      Nassau: {
        fr: "Nassau",
        en: "Nassau",
      },
    },
    BIH: {
      Sarajevo: {
        fr: "Sarajevo",
        en: "Sarajevo",
      },
    },
    BLR: {
      Minsk: {
        fr: "Minsk",
        en: "Minsk",
      },
    },
    BLZ: {
      Belmopan: {
        fr: "Belmopan",
        en: "Belmopan",
      },
    },
    BOL: {
      Sucre: {
        fr: "Sucre",
        en: "Sucre",
      },
      "La Paz": {
        fr: "La Paz",
        en: "La Paz",
      },
    },
    BRA: {
      Brasília: {
        fr: "Brasilia",
        en: "Brasília",
      },
    },
    BRB: {
      Bridgetown: {
        fr: "Bridgetown",
        en: "Bridgetown",
      },
    },
    BRN: {
      "Bandar Seri Begawan": {
        fr: "Bandar Seri Begawan",
        en: "Bandar Seri Begawan",
      },
    },
    BTN: {
      Thimphu: {
        fr: "Thimphou",
        en: "Thimphu",
      },
    },
    BWA: {
      Gaborone: {
        fr: "Gaborone",
        en: "Gaborone",
      },
    },
    CAF: {
      Bangui: {
        fr: "Bangui",
        en: "Bangui",
      },
    },
    CAN: {
      Ottawa: {
        fr: "Ottawa",
        en: "Ottawa",
      },
    },
    CHE: {
      Bern: {
        fr: "Berne",
        en: "Bern",
      },
    },
    CHL: {
      Santiago: {
        fr: "Santiago",
        en: "Santiago",
      },
    },
    CHN: {
      Beijing: {
        fr: "Pékin",
        en: "Beijing",
      },
    },
    CIV: {
      Yamoussoukro: {
        fr: "Yamoussoukro",
        en: "Yamoussoukro",
      },
    },
    CMR: {
      Yaoundé: {
        fr: "Yaoundé",
        en: "Yaoundé",
      },
    },
    COD: {
      Kinshasa: {
        fr: "Kinshasa",
        en: "Kinshasa",
      },
    },
    COG: {
      Brazzaville: {
        fr: "Brazzaville",
        en: "Brazzaville",
      },
    },
    COL: {
      Bogotá: {
        fr: "Bogota",
        en: "Bogotá",
      },
    },
    COM: {
      Moroni: {
        fr: "Moroni",
        en: "Moroni",
      },
    },
    CPV: {
      Praia: {
        fr: "Praia",
        en: "Praia",
      },
    },
    CRI: {
      "San José": {
        fr: "San José",
        en: "San José",
      },
    },
    CUB: {
      Havana: {
        fr: "La Havane",
        en: "Havana",
      },
    },
    CYP: {
      Nicosia: {
        fr: "Nicosie",
        en: "Nicosia",
      },
    },
    CZE: {
      Prague: {
        fr: "Prague",
        en: "Prague",
      },
    },
    DEU: {
      Berlin: {
        fr: "Berlin",
        en: "Berlin",
      },
    },
    DJI: {
      Djibouti: {
        fr: "Djibouti",
        en: "Djibouti",
      },
    },
    DMA: {
      Roseau: {
        fr: "Roseau",
        en: "Roseau",
      },
    },
    DNK: {
      Copenhagen: {
        fr: "Copenhague",
        en: "Copenhagen",
      },
    },
    DOM: {
      "Santo Domingo": {
        fr: "Saint-Domingue",
        en: "Santo Domingo",
      },
    },
    DZA: {
      Algiers: {
        fr: "Alger",
        en: "Algiers",
      },
    },
    ECU: {
      Quito: {
        fr: "Quito",
        en: "Quito",
      },
    },
    EGY: {
      Cairo: {
        fr: "Le Caire",
        en: "Cairo",
      },
    },
    ERI: {
      Asmara: {
        fr: "Asmara",
        en: "Asmara",
      },
    },
    ESP: {
      Madrid: {
        fr: "Madrid",
        en: "Madrid",
      },
    },
    EST: {
      Tallinn: {
        fr: "Tallinn",
        en: "Tallinn",
      },
    },
    ETH: {
      "Addis Ababa": {
        fr: "Addis-Abeba",
        en: "Addis Ababa",
      },
    },
    FIN: {
      Helsinki: {
        fr: "Helsinki",
        en: "Helsinki",
      },
    },
    FJI: {
      Suva: {
        fr: "Suva",
        en: "Suva",
      },
    },
    FRA: {
      Paris: {
        fr: "Paris",
        en: "Paris",
      },
    },
    FSM: {
      Palikir: {
        fr: "Palikir",
        en: "Palikir",
      },
    },
    GAB: {
      Libreville: {
        fr: "Libreville",
        en: "Libreville",
      },
    },
    GBR: {
      London: {
        fr: "Londres",
        en: "London",
      },
    },
    GEO: {
      Tbilisi: {
        fr: "Tbilissi",
        en: "Tbilisi",
      },
    },
    GHA: {
      Accra: {
        fr: "Accra",
        en: "Accra",
      },
    },
    GIN: {
      Conakry: {
        fr: "Conakry",
        en: "Conakry",
      },
    },
    GMB: {
      Banjul: {
        fr: "Banjul",
        en: "Banjul",
      },
    },
    GNB: {
      Bissau: {
        fr: "Bissau",
        en: "Bissau",
      },
    },
    GRC: {
      Athens: {
        fr: "Athènes",
        en: "Athens",
      },
    },
    GRD: {
      "St. George's": {
        fr: "Saint-Georges",
        en: "St. George's",
      },
    },
    GTM: {
      "Guatemala City": {
        fr: "Guatemala",
        en: "Guatemala City",
      },
    },
    GUY: {
      Georgetown: {
        fr: "Georgetown",
        en: "Georgetown",
      },
    },
    HND: {
      Tegucigalpa: {
        fr: "Tegucigalpa",
        en: "Tegucigalpa",
      },
    },
    HRV: {
      Zagreb: {
        fr: "Zagreb",
        en: "Zagreb",
      },
    },
    HTI: {
      "Port-au-Prince": {
        fr: "Port-au-Prince",
        en: "Port-au-Prince",
      },
    },
    HUN: {
      Budapest: {
        fr: "Budapest",
        en: "Budapest",
      },
    },
    IDN: {
      Jakarta: {
        fr: "Jakarta",
        en: "Jakarta",
      },
    },
    IND: {
      "New Delhi": {
        fr: "New Delhi",
        en: "New Delhi",
      },
    },
    IRL: {
      Dublin: {
        fr: "Dublin",
        en: "Dublin",
      },
    },
    IRN: {
      Tehran: {
        fr: "Téhéran",
        en: "Tehran",
      },
    },
    IRQ: {
      Baghdad: {
        fr: "Bagdad",
        en: "Baghdad",
      },
    },
    ISL: {
      Reykjavik: {
        fr: "Reykjavik",
        en: "Reykjavík",
      },
    },
    ISR: {
      Jerusalem: {
        fr: "Jérusalem",
        en: "Jerusalem",
      },
    },
    ITA: {
      Rome: {
        fr: "Rome",
        en: "Rome",
      },
    },
    JAM: {
      Kingston: {
        fr: "Kingston",
        en: "Kingston",
      },
    },
    JOR: {
      Amman: {
        fr: "Amman",
        en: "Amman",
      },
    },
    JPN: {
      Tokyo: {
        fr: "Tokyo",
        en: "Tokyo",
      },
    },
    KAZ: {
      Astana: {
        fr: "Astana",
        en: "Astana",
      },
    },
    KEN: {
      Nairobi: {
        fr: "Nairobi",
        en: "Nairobi",
      },
    },
    KGZ: {
      Bishkek: {
        fr: "Bichkek",
        en: "Bishkek",
      },
    },
    KHM: {
      "Phnom Penh": {
        fr: "Phnom Penh",
        en: "Phnom Penh",
      },
    },
    KIR: {
      "South Tarawa": {
        fr: "Tarawa-Sud",
        en: "South Tarawa",
      },
    },
    KNA: {
      Basseterre: {
        fr: "Basseterre",
        en: "Basseterre",
      },
    },
    KOR: {
      Seoul: {
        fr: "Séoul",
        en: "Seoul",
      },
    },
    KWT: {
      "Kuwait City": {
        fr: "Koweït",
        en: "Kuwait City",
      },
    },
    LAO: {
      Vientiane: {
        fr: "Vientiane",
        en: "Vientiane",
      },
    },
    LBN: {
      Beirut: {
        fr: "Beyrouth",
        en: "Beirut",
      },
    },
    LBR: {
      Monrovia: {
        fr: "Monrovia",
        en: "Monrovia",
      },
    },
    LBY: {
      Tripoli: {
        fr: "Tripoli",
        en: "Tripoli",
      },
    },
    LCA: {
      Castries: {
        fr: "Castries",
        en: "Castries",
      },
    },
    LIE: {
      Vaduz: {
        fr: "Vaduz",
        en: "Vaduz",
      },
    },
    LKA: {
      "Sri Jayawardenepura Kotte": {
        fr: "Sri Jayawardenapura",
        en: "Sri Jayawardenepura Kotte",
      },
    },
    LSO: {
      Maseru: {
        fr: "Maseru",
        en: "Maseru",
      },
    },
    LTU: {
      Vilnius: {
        fr: "Vilnius",
        en: "Vilnius",
      },
    },
    LUX: {
      Luxembourg: {
        fr: "Luxembourg",
        en: "Luxembourg",
      },
    },
    LVA: {
      Riga: {
        fr: "Riga",
        en: "Riga",
      },
    },
    MAR: {
      Rabat: {
        fr: "Rabat",
        en: "Rabat",
      },
    },
    MCO: {
      Monaco: {
        fr: "Monaco",
        en: "Monaco",
      },
    },
    MDA: {
      Chișinău: {
        fr: "Chișinău",
        en: "Chișinău",
      },
    },
    MDG: {
      Antananarivo: {
        fr: "Antananarivo",
        en: "Antananarivo",
      },
    },
    MDV: {
      Malé: {
        fr: "Malé",
        en: "Malé",
      },
    },
    MEX: {
      "Mexico City": {
        fr: "Mexico",
        en: "Mexico City",
      },
    },
    MHL: {
      Majuro: {
        fr: "Majuro",
        en: "Majuro",
      },
    },
    MKD: {
      Skopje: {
        fr: "Skopje",
        en: "Skopje",
      },
    },
    MLI: {
      Bamako: {
        fr: "Bamako",
        en: "Bamako",
      },
    },
    MLT: {
      Valletta: {
        fr: "La Valette",
        en: "Valletta",
      },
    },
    MMR: {
      Naypyidaw: {
        fr: "Naypyidaw",
        en: "Naypyidaw",
      },
    },
    MNE: {
      Podgorica: {
        fr: "Podgorica",
        en: "Podgorica",
      },
    },
    MOZ: {
      Maputo: {
        fr: "Maputo",
        en: "Maputo",
      },
    },
    MRT: {
      Nouakchott: {
        fr: "Nouakchott",
        en: "Nouakchott",
      },
    },
    MUS: {
      "Port Louis": {
        fr: "Port-Louis",
        en: "Port Louis",
      },
    },
    MWI: {
      Lilongwe: {
        fr: "Lilongwe",
        en: "Lilongwe",
      },
    },
    MYS: {
      "Kuala Lumpur": {
        fr: "Kuala Lumpur",
        en: "Kuala Lumpur",
      },
    },
    NAM: {
      Windhoek: {
        fr: "Windhoek",
        en: "Windhoek",
      },
    },
    NER: {
      Niamey: {
        fr: "Niamey",
        en: "Niamey",
      },
    },
    NGA: {
      Abuja: {
        fr: "Abuja",
        en: "Abuja",
      },
    },
    NIC: {
      Managua: {
        fr: "Managua",
        en: "Managua",
      },
    },
    NLD: {
      Amsterdam: {
        fr: "Amsterdam",
        en: "Amsterdam",
      },
    },
    NPL: {
      Kathmandu: {
        fr: "Katmandou",
        en: "Kathmandu",
      },
    },
    NZL: {
      Wellington: {
        fr: "Wellington",
        en: "Wellington",
      },
    },
    OMN: {
      Muscat: {
        fr: "Mascate",
        en: "Muscat",
      },
    },
    PAK: {
      Islamabad: {
        fr: "Islamabad",
        en: "Islamabad",
      },
    },
    PAN: {
      "Panama City": {
        fr: "Panama",
        en: "Panama City",
      },
    },
    PER: {
      Lima: {
        fr: "Lima",
        en: "Lima",
      },
    },
    PHL: {
      Manila: {
        fr: "Manille",
        en: "Manila",
      },
    },
    PLW: {
      Ngerulmud: {
        fr: "Ngerulmud",
        en: "Ngerulmud",
      },
    },
    PNG: {
      "Port Moresby": {
        fr: "Port Moresby",
        en: "Port Moresby",
      },
    },
    POL: {
      Warsaw: {
        fr: "Varsovie",
        en: "Warsaw",
      },
    },
    PRK: {
      Pyongyang: {
        fr: "Pyongyang",
        en: "Pyongyang",
      },
    },
    PRT: {
      Lisbon: {
        fr: "Lisbonne",
        en: "Lisbon",
      },
    },
    PRY: {
      Asunción: {
        fr: "Asuncion",
        en: "Asunción",
      },
    },
    PSE: {
      Ramallah: {
        fr: "Ramallah",
        en: "Ramallah",
      },
    },
    QAT: {
      Doha: {
        fr: "Doha",
        en: "Doha",
      },
    },
    ROU: {
      Bucharest: {
        fr: "Bucarest",
        en: "Bucharest",
      },
    },
    RUS: {
      Moscow: {
        fr: "Moscou",
        en: "Moscow",
      },
    },
    RWA: {
      Kigali: {
        fr: "Kigali",
        en: "Kigali",
      },
    },
    SAU: {
      Riyadh: {
        fr: "Riyad",
        en: "Riyadh",
      },
    },
    SDN: {
      Khartoum: {
        fr: "Khartoum",
        en: "Khartoum",
      },
    },
    SEN: {
      Dakar: {
        fr: "Dakar",
        en: "Dakar",
      },
    },
    SGP: {
      Singapore: {
        fr: "Singapour",
        en: "Singapore",
      },
    },
    SLB: {
      Honiara: {
        fr: "Honiara",
        en: "Honiara",
      },
    },
    SLE: {
      Freetown: {
        fr: "Freetown",
        en: "Freetown",
      },
    },
    SLV: {
      "San Salvador": {
        fr: "San Salvador",
        en: "San Salvador",
      },
    },
    SOM: {
      Mogadishu: {
        fr: "Mogadiscio",
        en: "Mogadishu",
      },
    },
    SRB: {
      Belgrade: {
        fr: "Belgrade",
        en: "Belgrade",
      },
    },
    SSD: {
      Juba: {
        fr: "Djouba",
        en: "Juba",
      },
    },
    STP: {
      "São Tomé": {
        fr: "São Tomé",
        en: "São Tomé",
      },
    },
    SUR: {
      Paramaribo: {
        fr: "Paramaribo",
        en: "Paramaribo",
      },
    },
    SVK: {
      Bratislava: {
        fr: "Bratislava",
        en: "Bratislava",
      },
    },
    SVN: {
      Ljubljana: {
        fr: "Ljubljana",
        en: "Ljubljana",
      },
    },
    SWE: {
      Stockholm: {
        fr: "Stockholm",
        en: "Stockholm",
      },
    },
    SWZ: {
      Mbabane: {
        fr: "Mbabane",
        en: "Mbabane",
      },
      Lobamba: {
        fr: "Lobamba",
        en: "Lobamba",
      },
    },
    SYC: {
      Victoria: {
        fr: "Victoria",
        en: "Victoria",
      },
    },
    SYR: {
      Damascus: {
        fr: "Damas",
        en: "Damascus",
      },
    },
    TCD: {
      "N'Djamena": {
        fr: "N'Djaména",
        en: "N'Djamena",
      },
    },
    TGO: {
      Lomé: {
        fr: "Lomé",
        en: "Lomé",
      },
    },
    THA: {
      Bangkok: {
        fr: "Bangkok",
        en: "Bangkok",
      },
    },
    TJK: {
      Dushanbe: {
        fr: "Douchanbé",
        en: "Dushanbe",
      },
    },
    TKM: {
      Ashgabat: {
        fr: "Achgabat",
        en: "Ashgabat",
      },
    },
    TLS: {
      Dili: {
        fr: "Dili",
        en: "Dili",
      },
    },
    TON: {
      "Nuku'alofa": {
        fr: "Nukuʻalofa",
        en: "Nukuʻalofa",
      },
    },
    TTO: {
      "Port of Spain": {
        fr: "Port-d'Espagne",
        en: "Port of Spain",
      },
    },
    TUN: {
      Tunis: {
        fr: "Tunis",
        en: "Tunis",
      },
    },
    TUR: {
      Ankara: {
        fr: "Ankara",
        en: "Ankara",
      },
    },
    TUV: {
      Funafuti: {
        fr: "Funafuti",
        en: "Funafuti",
      },
    },
    TWN: {
      Taipei: {
        fr: "Taipei",
        en: "Taipei",
      },
    },
    TZA: {
      Dodoma: {
        fr: "Dodoma",
        en: "Dodoma",
      },
    },
    UGA: {
      Kampala: {
        fr: "Kampala",
        en: "Kampala",
      },
    },
    UKR: {
      Kyiv: {
        fr: "Kiev",
        en: "Kyiv",
      },
    },
    URY: {
      Montevideo: {
        fr: "Montevideo",
        en: "Montevideo",
      },
    },
    USA: {
      "Washington, D.C.": {
        fr: "Washington",
        en: "Washington, D.C.",
      },
    },
    UZB: {
      Tashkent: {
        fr: "Tachkent",
        en: "Tashkent",
      },
    },
    VAT: {
      "Vatican City": {
        fr: "Vatican",
        en: "Vatican City",
      },
    },
    VCT: {
      Kingstown: {
        fr: "Kingstown",
        en: "Kingstown",
      },
    },
    VEN: {
      Caracas: {
        fr: "Caracas",
        en: "Caracas",
      },
    },
    VNM: {
      Hanoi: {
        fr: "Hanoï",
        en: "Hanoi",
      },
    },
    VUT: {
      "Port Vila": {
        fr: "Port-Vila",
        en: "Port Vila",
      },
    },
    WSM: {
      Apia: {
        fr: "Apia",
        en: "Apia",
      },
    },
    XKX: {
      Pristina: {
        fr: "Pristina",
        en: "Pristina",
      },
    },
    ZAF: {
      Pretoria: {
        fr: "Pretoria",
        en: "Pretoria",
      },
      "Cape Town": {
        fr: "Le Cap",
        en: "Cape Town",
      },
      Bloemfontein: {
        fr: "Bloemfontein",
        en: "Bloemfontein",
      },
    },
    ZMB: {
      Lusaka: {
        fr: "Lusaka",
        en: "Lusaka",
      },
    },
    ZWE: {
      Harare: {
        fr: "Harare",
        en: "Harare",
      },
    },
  },
  overrides: {
    ATG: {
      "Saint John's": {
        fr: "Saint John's",
        en: "St. John's",
        reason:
          "Wikidata (Q36262) n'a pas de libellé en : seul le libellé multilingue (mul) « St. John's » existe ; le fr est celui de Wikidata",
      },
    },
    GNQ: {
      Malabo: {
        fr: "Malabo",
        en: "Malabo",
        reason:
          "P36 pointe désormais Ciudad de la Paz (Q1140136) ; la liste REST Countries garde Malabo et n'est pas rouverte — libellé = nom source",
      },
    },
    MNG: {
      "Ulan Bator": {
        fr: "Oulan-Bator",
        en: "Ulaanbaatar",
        reason:
          "Variante d'orthographe : libellés Wikidata (Q23430) sous le nom « Ulaanbaatar », que la correspondance sur le nom source « Ulan Bator » ne rejoint pas",
      },
    },
    NOR: {
      Oslo: {
        fr: "Oslo",
        en: "Oslo",
        reason:
          "Wikidata (Q585) n'a ni libellé fr ni en, seulement le libellé multilingue (mul) « Oslo »",
      },
    },
    NRU: {
      Yaren: {
        fr: "Yaren",
        en: "Yaren",
        reason:
          "P36 pointe le district (Q31026, en « Yaren District ») ; on affiche la localité, comme le nom source",
      },
    },
    PSE: {
      Jerusalem: {
        fr: "Jérusalem",
        en: "Jerusalem",
        reason:
          "Wikidata (Q212938) donne « Jérusalem-Est / East Jerusalem » ; choix politique non rouvert : le libellé suit le nom source REST Countries, comme pour ISR — À ARBITRER",
      },
    },
    SMR: {
      "City of San Marino": {
        fr: "Saint-Marin",
        en: "San Marino",
        reason:
          "Le nom source « City of San Marino » désigne la ville (Q1848) que Wikidata libelle « San Marino » / « Saint-Marin »",
      },
    },
    YEM: {
      "Sana'a": {
        fr: "Sanaa",
        en: "Sanaa",
        reason:
          "Variante d'orthographe : libellés Wikidata (Q2471) « Sanaa », que la correspondance sur le nom source « Sana'a » ne rejoint pas",
      },
    },
  },
};
