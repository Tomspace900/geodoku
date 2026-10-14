/**
 * Curated country patches — typed, segmented config for build-countries.
 *
 * - sourceCorrectionsByIso3: explicit fixes where world-countries / REST disagree with gameplay intent
 * - nameCorrectionsByIso3: French names where world-countries departs from the official French list
 * - searchAliasesByIso3: player-facing search variants NOT already in names or REST alternates
 * - wikipediaTitlesByIso3: Wikipedia article title overrides (popularity only)
 * - gameplayClassifications: constraint tag lists (events, geo, physical features, regime)
 * - manualCountryAdditions: countries absent from world-countries (Kosovo XKX → 196 + 1 = 197 playable)
 */
import type {
  CountryPatchesConfig,
  CurrencyCorrection,
  DemonymCorrection,
  GameplayClassifications,
  ManualCountryAddition,
  NameCorrection,
  SourceCorrection,
} from "./buildCountriesLib.ts";

/** ISO 3166-1 alpha-3 — playable country (196 UN + inclusions) or addition like XKX. */
export type Iso3 = string;

// ─── Source corrections (borders, waterAccess, latitude, memberships) ─────────

export const sourceCorrectionsByIso3: Record<Iso3, SourceCorrection> = {
  /** Continent-État entouré d'eau, sans frontière terrestre : jouée comme insulaire (convention Geodoku, révision P2). */
  AUS: { waterAccess: "island" as const },
  /** Island nation; world-countries lists a land border with India. */
  LKA: { waterAccess: "island" as const, borders: [] },
  /** Kosovo recognition: REST uses UNK, gameplay uses XKX. */
  ALB: { borders: ["MNE", "GRC", "MKD", "XKX"] },
  MKD: { borders: ["ALB", "BGR", "GRC", "XKX", "SRB"] },
  MNE: { borders: ["ALB", "BIH", "HRV", "XKX", "SRB"] },
  SRB: {
    borders: ["BIH", "BGR", "HRV", "HUN", "XKX", "MKD", "MNE", "ROU"],
  },
  /** Exclude GIB: not a playable country, unlike XKX or GUF→FRA border gameplay. */
  ESP: { borders: ["AND", "FRA", "PRT", "MAR"] },
  /** French Guiana counts as metropolitan border for gameplay (REST uses GUF). */
  BRA: {
    borders: [
      "ARG",
      "BOL",
      "COL",
      "FRA",
      "GUY",
      "PRY",
      "PER",
      "SUR",
      "URY",
      "VEN",
    ],
  },
  SUR: { borders: ["BRA", "FRA", "GUY"] },
  /**
   * Hémisphère d'un pays à cheval sur l'équateur : on tranche sur la MAJORITÉ DE
   * LA SUPERFICIE TERRESTRE (pas la capitale — Libreville est au nord alors que
   * les deux tiers du Gabon sont au sud).
   *
   * world-countries donne à la RDC un point représentatif arrondi à `0`, seul
   * pays du catalogue exactement sur l'équateur : le `latitude < 0` de
   * `latitude_south_hemisphere` la classait donc au nord par accident d'arrondi.
   * Elle s'étend de 5,4°N à 13,5°S, sa capitale est à -4,32° et son centroïde à
   * -2,88° : sud à l'unanimité des trois lectures.
   *
   * Les 10 autres pays dont la ligne coupe la terre tombent déjà du bon côté
   * sans patch.
   *
   * Langues (règle plus bas) — Constitution, art. 1 : le français est la langue
   * officielle ; kikongo, lingala, swahili et tshiluba sont « langues nationales ».
   */
  COD: { latitude: -2.88, officialLanguages: ["fr"] },
  FRA: {
    borders: [
      "AND",
      "BEL",
      "BRA",
      "DEU",
      "ITA",
      "LUX",
      "MCO",
      "ESP",
      "SUR",
      "CHE",
    ],
  },
  /**
   * Deltas d'adhésion : rattrapent un changement officiel daté que REST Countries
   * v5 n'a pas encore intégré. Idempotents (`applySourceCorrections`), à retirer
   * dès que la source est à jour.
   */
  /** Timor oriental — 11ᵉ membre de l'ASEAN (admission actée le 26 octobre 2025). À retirer quand REST v5 est à jour. */
  TLS: { membershipsAdd: ["asean"] },
  /** Indonésie — membre plein des BRICS depuis le 6 janvier 2025. À retirer quand REST v5 est à jour. */
  IDN: { membershipsAdd: ["brics"] },
  /** Émirats arabes unis — retrait effectif de l'OPEP au 1ᵉʳ mai 2026 (confirmé). À retirer quand REST v5 est à jour. */
  ARE: { membershipsRemove: ["opec"] },

  /**
   * Langues officielles : une langue compte si une loi la rend officielle, ou si
   * elle est de fait la langue de l'État là où aucune loi n'en désigne (anglais
   * au Royaume-Uni, aux États-Unis, en Australie ; espagnol au Mexique…). Ne
   * comptent pas les statuts secondaires : langue de travail à côté d'une langue
   * officielle désignée, langue de communication interethnique, statut spécial,
   * usage administratif. REST Countries les confond : ces corrections
   * rétablissent la règle (tranchée le 2026-10-09).
   */
  /** Mali — constitution de 2023 : le français passe de langue officielle à langue de travail. */
  MLI: { officialLanguages: ["bm"] },
  /** Burkina Faso — révision de décembre 2023 : le français devient langue de travail. */
  BFA: { officialLanguages: ["mos", "dyu", "ff"] },
  /** Niger — mars 2025 : le français perd son statut officiel, le haoussa devient langue nationale. */
  NER: { officialLanguages: ["ha"] },
  /** Israël — loi fondamentale de 2018 : l'arabe passe d'officiel à « statut spécial ». */
  ISR: { officialLanguages: ["he"] },
  /** Tchéquie — le slovaque a un statut procédural, pas de langue officielle nationale. */
  CZE: { officialLanguages: ["cs"] },
  /** Malaisie — le malais est seule langue officielle depuis le National Language Act de 1967. */
  MYS: { officialLanguages: ["ms"] },
  /** Liban — l'arabe est seule langue officielle ; le français a un statut d'usage, pas officiel. */
  LBN: { officialLanguages: ["ar"] },
  /** Belize — l'anglais est la langue de l'État ; l'espagnol et le kriol sont d'usage courant, sans statut. */
  BLZ: { officialLanguages: ["en"] },
  /** Azerbaïdjan — constitution, art. 21 : l'azerbaïdjanais est seule langue d'État ; le russe n'a aucun statut. */
  AZE: { officialLanguages: ["az"] },
  /** Tadjikistan — constitution, art. 2 : le tadjik est langue d'État ; le russe n'est que « langue de communication interethnique ». */
  TJK: { officialLanguages: ["tg"] },
  /** Turkménistan — le turkmène est seule langue d'État ; le russe n'a aucun statut officiel. */
  TKM: { officialLanguages: ["tk"] },
  /** Ouzbékistan — l'ouzbek est seule langue d'État ; le russe n'a aucun statut officiel. */
  UZB: { officialLanguages: ["uz"] },
  /** Suisse — Constitution, art. 4 : la langue nationale est l'allemand, pas le suisse allemand (`gsw`) que liste la source. */
  CHE: { officialLanguages: ["fr", "de", "it", "rm"] },
  /** Argentine — aucune loi nationale ; l'espagnol l'est de fait. Le guarani n'est co-officiel que dans la province de Corrientes. */
  ARG: { officialLanguages: ["es"] },
  /** Inde — langues officielles de l'Union : hindi et anglais. Le tamoul est officiel au Tamil Nadu, pas à l'échelle nationale. */
  IND: { officialLanguages: ["en", "hi"] },
  /** Irak — Constitution, art. 4 : arabe et kurde. Le syriaque (araméen) n'est officiel que dans les unités administratives où il est parlé. */
  IRQ: { officialLanguages: ["ar", "ckb"] },
  /** Namibie — Constitution, art. 3 : l'anglais est la seule langue officielle ; les autres sont reconnues, sans statut officiel. */
  NAM: { officialLanguages: ["en"] },
  // RD Congo : entrée partagée avec la latitude, plus haut.
  /** Congo — Constitution : le français est la langue officielle ; le lingala et le kituba sont « langues nationales véhiculaires ». */
  COG: { officialLanguages: ["fr"] },
  /** Pérou — Constitution, art. 48 : le quechua et l'aymara ne sont officiels que « dans les zones où ils prédominent ». */
  PER: { officialLanguages: ["es"] },
  /** Jamaïque — l'anglais est la langue de l'État ; le créole jamaïcain n'a aucun statut. */
  JAM: { officialLanguages: ["en"] },
  /** Guinée-Bissau — le portugais est la seule langue officielle ; le créole n'a aucun statut. */
  GNB: { officialLanguages: ["pt"] },
};

// ─── Search aliases (player variants beyond names + REST alternates) ────────────

/** Variants absent from names.{fr,en}, iso codes, and REST official/alternates. */
export const searchAliasesByIso3: Record<Iso3, string[]> = {
  COD: ["RDC", "DRC", "République démocratique du Congo"],
  COG: ["République du Congo"],
  CPV: ["Cap-Vert", "Cabo Verde"],
  CZE: ["République tchèque"],
  USA: ["Amérique", "États-Unis d'Amérique"],
  GBR: ["Angleterre", "Grande-Bretagne", "England"],
  PRK: ["RPDC"],
  KOR: ["ROK"],
  MKD: ["Macédoine"],
  PSE: ["Territoires palestiniens", "Palestinian Territories"],
  TWN: ["Formose", "Formosa"],
  VAT: ["Saint-Siège"],
  IRN: ["Perse"],
  ARE: ["EAU"],
  NLD: ["Hollande"],
};

// ─── Wikipedia title overrides ────────────────────────────────────────────────

export const wikipediaTitlesByIso3: Record<Iso3, string> = {
  BHS: "The_Bahamas",
  CZE: "Czech_Republic",
  COD: "Democratic_Republic_of_the_Congo",
  GEO: "Georgia_(country)",
  GMB: "The_Gambia",
  LIE: "Liechtenstein",
  OMN: "Oman",
  PLW: "Palau",
  PRK: "North_Korea",
  SDN: "Sudan",
  SLB: "Solomon_Islands",
  SLE: "Sierra_Leone",
  SMR: "San_Marino",
  SRB: "Serbia",
  SWE: "Sweden",
  SWZ: "Eswatini",
  THA: "Thailand",
  TON: "Tonga",
  TUN: "Tunisia",
  TUR: "Turkey",
  TZA: "Tanzania",
  URY: "Uruguay",
  UZB: "Uzbekistan",
  VEN: "Venezuela",
  XKX: "Kosovo",
};

// ─── Gameplay classifications (constraint tags) ───────────────────────────────

export const gameplayClassifications: GameplayClassifications = {
  middleEast: [
    "ARE",
    "BHR",
    "CYP",
    "EGY",
    "IRN",
    "IRQ",
    "ISR",
    "JOR",
    "KWT",
    "LBN",
    "OMN",
    "PSE",
    "QAT",
    "SAU",
    "SYR",
    "TUR",
    "YEM",
  ],
  eventFifaWcHost: [
    "URY",
    "ITA",
    "FRA",
    "BRA",
    "CHE",
    "SWE",
    "CHL",
    "GBR",
    "MEX",
    "DEU",
    "ARG",
    "ESP",
    "USA",
    "CAN",
    "JPN",
    "KOR",
    "ZAF",
    "RUS",
    "QAT",
  ],
  eventSummerOlympicsHost: [
    "GRC",
    "FRA",
    "USA",
    "GBR",
    "SWE",
    "BEL",
    "NLD",
    "DEU",
    "FIN",
    "AUS",
    "ITA",
    "JPN",
    "MEX",
    "CAN",
    "KOR",
    "ESP",
    "CHN",
    "BRA",
    "RUS",
  ],
  eventWinterOlympicsHost: [
    "AUT",
    "BIH",
    "CAN",
    "CHE",
    "CHN",
    "DEU",
    "FRA",
    "ITA",
    "JPN",
    "KOR",
    "NOR",
    "RUS",
    "USA",
  ],
  monarchy: [
    "GBR",
    "CAN",
    "AUS",
    "NZL",
    "BHS",
    "ATG",
    "BLZ",
    "GRD",
    "JAM",
    "PNG",
    "KNA",
    "LCA",
    "VCT",
    "SLB",
    "TUV",
    "BEL",
    "DNK",
    "LUX",
    "MCO",
    "NLD",
    "NOR",
    "ESP",
    "SWE",
    "LIE",
    "AND",
    "SAU",
    "ARE",
    "QAT",
    "OMN",
    "KWT",
    "BHR",
    "JOR",
    "MAR",
    "BTN",
    "BRN",
    "JPN",
    "THA",
    "KHM",
    "MYS",
    "LSO",
    "SWZ",
    "TON",
    "VAT",
  ],
  equatorCrosser: [
    "COL",
    "ECU",
    "BRA",
    "STP",
    "GAB",
    "COG",
    "COD",
    "UGA",
    "KEN",
    "SOM",
    "IDN",
    // Revue #129 (2026-10-14) : la ligne coupe les eaux entre les îles d'un même
    // archipel du pays — chenal Addu Kandu (Maldives), entre Aranuka et Nonouti
    // (Kiribati). La Guinée équatoriale reste hors liste : Annobón n'appartient
    // pas au même archipel que Bioko et le continent.
    "MDV",
    "KIR",
  ],
  mediterraneanCoast: [
    "ESP",
    "FRA",
    "MCO",
    "ITA",
    "MLT",
    "SVN",
    "HRV",
    "BIH",
    "MNE",
    "ALB",
    "GRC",
    "TUR",
    "CYP",
    "SYR",
    "LBN",
    "ISR",
    "PSE",
    "EGY",
    "LBY",
    "TUN",
    "DZA",
    "MAR",
  ],
  caribbeanCoast: [
    "CUB",
    "HTI",
    "DOM",
    "JAM",
    "TTO",
    "GRD",
    "VCT",
    "LCA",
    "DMA",
    "ATG",
    "KNA",
    "BLZ",
    "GTM",
    "HND",
    "NIC",
    "CRI",
    "PAN",
    "COL",
    "VEN",
    "MEX",
    "FRA",
    "NLD",
  ],
  peakOver5000m: [
    "AFG",
    "ARG",
    "BOL",
    "BTN",
    "CAN",
    "CHL",
    "CHN",
    "COL",
    "COD",
    "ECU",
    "GEO",
    "IND",
    "IRN",
    "KAZ",
    "KEN",
    "KGZ",
    "MMR",
    "MEX",
    "NPL",
    "PAK",
    "PER",
    "RUS",
    "TJK",
    "TZA",
    "TUR",
    "UGA",
    "USA",
  ],
  capitalNotLargest: [
    "USA",
    "CAN",
    "AUS",
    "BRA",
    "CHN",
    "IND",
    "ARE",
    "SDN",
    "TUR",
    "NGA",
    "ZAF",
    "CHE",
    "MAR",
    "TZA",
    "KAZ",
    "MMR",
    "CIV",
    "CMR",
    "BEN",
    "BDI",
    "BOL",
    "ECU",
    "VNM",
    "NZL",
    "BLZ",
    "PHL",
    "LKA",
    "PAK",
    "PLW",
    "FSM",
    "GMB",
    "GNQ",
    "SWZ",
    // Revue #122 (2026-10-09) : la ville la plus peuplée n'est pas la capitale —
    // Nouveau Taipei, Serravalle, Schaan, St. Paul's Bay.
    "TWN",
    "SMR",
    "LIE",
    "MLT",
    // Revue #129 (2026-10-14) : convention intra-muros — Port-d'Espagne compte
    // moins d'habitants que Chaguanas et San Fernando (recensement 2011).
    "TTO",
  ],
  /**
   * Revue #129 (2026-10-14) : État dont tout le territoire est insulaire, île
   * partagée comprise. `waterAccess` ne vaut `island` que sans frontière
   * terrestre ; ces huit pays y restent `coastal` (l'Indonésie compte trois
   * voisins), d'où cette classification séparée plutôt qu'une correction de
   * `waterAccess`, que lisent d'autres contraintes.
   * Brunei (Bornéo), Haïti et République dominicaine (Hispaniola), Indonésie
   * (Bornéo, Nouvelle-Guinée, Timor), Irlande et Royaume-Uni (Irlande),
   * Papouasie-Nouvelle-Guinée (Nouvelle-Guinée), Timor oriental (Timor).
   */
  sharedIslandState: ["BRN", "DOM", "GBR", "HTI", "IDN", "IRL", "PNG", "TLS"],
  desert: [
    "DZA",
    "LBY",
    "EGY",
    "SDN",
    "TCD",
    "NER",
    "MLI",
    "MRT",
    "MAR",
    "TUN",
    "SAU",
    "ARE",
    "OMN",
    "YEM",
    "KWT",
    "QAT",
    "JOR",
    "IRQ",
    "SYR",
    "ISR",
    "IRN",
    "TKM",
    "UZB",
    "KAZ",
    "MNG",
    "CHN",
    "IND",
    "PAK",
    "AFG",
    "USA",
    "MEX",
    "CHL",
    "PER",
    "ARG",
    "BOL",
    "NAM",
    "BWA",
    "ZAF",
    "AGO",
    "AUS",
    "SOM",
    "DJI",
    "ERI",
    "ETH",
    "BHR",
    "KEN",
    "COL",
    "ESP",
  ],
  rainforest: [
    "BRA",
    "PER",
    "COL",
    "ECU",
    "VEN",
    "BOL",
    "GUY",
    "SUR",
    "COD",
    "COG",
    "GAB",
    "CMR",
    "GNQ",
    "IDN",
    "MYS",
    "PNG",
    "PHL",
    "THA",
    "VNM",
    "MMR",
    "BRN",
    "LAO",
    "KHM",
    "IND",
    "LKA",
    "CRI",
    "PAN",
    "MDG",
    "AUS",
    "LBR",
    "CIV",
    "GHA",
    "NGA",
    "USA",
    "BLZ",
    "GTM",
    "HND",
    "NIC",
    "MEX",
    "CAF",
    "GIN",
    "SLE",
    "GNB",
    "UGA",
    "TZA",
    "RWA",
    "BDI",
    "FRA",
  ],
  atlanticCoast: [
    "ISL",
    "IRL",
    "GBR",
    "FRA",
    "ESP",
    "PRT",
    "NOR",
    "NLD",
    "BEL",
    "DEU",
    "DNK",
    "MAR",
    "MRT",
    "SEN",
    "GMB",
    "GNB",
    "GIN",
    "SLE",
    "LBR",
    "CIV",
    "GHA",
    "TGO",
    "BEN",
    "NGA",
    "CMR",
    "GNQ",
    "GAB",
    "COG",
    "COD",
    "AGO",
    "NAM",
    "ZAF",
    "CPV",
    "STP",
    "CAN",
    "USA",
    "MEX",
    "BRA",
    "URY",
    "ARG",
    "GUY",
    "SUR",
    "VEN",
    "BHS",
    "ATG",
    "BRB",
    "CUB",
    "DMA",
    "DOM",
    "GRD",
    "HTI",
    "KNA",
    "LCA",
    "TTO",
    "VCT",
  ],
  /**
   * Timor-Leste est volontairement absent : ses mers (Banda, Timor, Savu)
   * relèvent de l'« East Indian Archipelago » de l'IHO S-23, qui n'est
   * rattaché à aucun océan (cf. SOURCES.md § Océans, revue #122).
   */
  pacificCoast: [
    "CAN",
    "USA",
    "MEX",
    "GTM",
    "SLV",
    "HND",
    "NIC",
    "CRI",
    "PAN",
    "COL",
    "ECU",
    "PER",
    "CHL",
    "RUS",
    "CHN",
    "KOR",
    "PRK",
    "JPN",
    "TWN",
    "PHL",
    "VNM",
    "IDN",
    "MYS",
    "BRN",
    "SGP",
    "THA",
    "KHM",
    "AUS",
    "NZL",
    "PNG",
    "FJI",
    "SLB",
    "VUT",
    "WSM",
    "TON",
    "KIR",
    "TUV",
    "NRU",
    "MHL",
    "FSM",
    "PLW",
  ],
  indianOceanCoast: [
    "ZAF",
    "MOZ",
    "TZA",
    "KEN",
    "SOM",
    "MDG",
    "MUS",
    "SYC",
    "COM",
    "DJI",
    "YEM",
    "OMN",
    "ARE",
    "IRN",
    "PAK",
    "IND",
    "BGD",
    "LKA",
    "MDV",
    "MMR",
    "THA",
    "IDN",
    "MYS",
    "AUS",
    "FRA",
  ],
  /**
   * Façade sur l'océan Arctique. Convention Geodoku restreinte aux quatre États
   * riverains d'une côte arctique continue et substantielle (reprise du champ
   * `oceanBasins` du snapshot country-core v1). Sert uniquement à
   * `ocean_multiple_basins` : la Norvège n'a sinon qu'une façade (Atlantique),
   * la Russie que Pacifique + Arctique.
   */
  arcticCoast: ["CAN", "NOR", "RUS", "USA"],
};

// ─── Manual country additions ─────────────────────────────────────────────────

export const manualCountryAdditions: ManualCountryAddition[] = [
  {
    iso3: "XKX",
    iso2: "XK",
    names: { fr: "Kosovo", en: "Kosovo" },
    aliases: [],
    flagEmoji: "🇽🇰",
    continent: "europe",
    waterAccess: "landlocked",
    borders: ["ALB", "MKD", "MNE", "SRB"],
    areaKm2: 10887,
    population: 1585566,
    officialLanguages: ["sq", "sr"],
    latitude: 42.6,
    subregion: "Southeast Europe",
    flagColors: ["blue", "yellow", "white"],
    flagSymbols: ["star"],
    flagLayout: [],
    events: [],
    memberships: [],
    capitals: [
      {
        name: "Pristina",
        latitude: 42.6629,
        longitude: 21.1655,
        roles: ["primary"],
      },
    ],
    drivingSide: "right",
    geoTags: [],
    regime: "republic",
    physicalFeatures: [],
    // Faits quantitatifs : placeholders, recalculés par build-countries via
    // quantitativeFactsForCode (datasets scripts/countries/data/).
    utcOffsetCount: 1,
    lastVolcanicEruptionYear: null,
    mountainAreaShare: null,
    forestCoverShare: null,
    urbanCentresOver1M: 0,
    productionRanks: {},
    coalElectricityShare: null,
    formerSovereigns: [],
    dominations: [],
    sovereigntyYear: null,
    sovereigntyKind: null,
    sovereigntyDate: null,
    sovereigntySheetHidden: false,
    highestPoint: { elevationM: 1, names: null },
    gdpPerCapitaUsd: null,
    lifeExpectancyYears: null,
    humanDevelopmentIndex: null,
    eventEditions: {},
    // Monnaie et gentilé : placeholders, fixés par les tables de correction
    // (currencyCorrectionsByIso3 / demonymCorrectionsByIso3) au build.
    currencies: [],
    demonyms: { fr: { m: "", f: "" }, en: { m: "", f: "" } },
  },
];

// ─── Monnaies et gentilés (lot 4) ─────────────────────────────────────────────

const CORRECTION_DATE = "2026-09-25";

/**
 * Monnaies où `world-countries` 5.1.0 est fausse ou incomplète. Une entrée
 * remplace la liste entière. Invariants (`validateCountryFacts`) : liste non
 * vide, chaque code connu de `Intl` avec un nom fr et en sans année.
 */
export const currencyCorrectionsByIso3: Record<Iso3, CurrencyCorrection> = {
  FSM: {
    currencies: ["USD"],
    reason: "world-countries : liste vide ; le dollar américain a cours légal",
    date: CORRECTION_DATE,
  },
  KIR: {
    currencies: ["AUD"],
    reason:
      "world-countries liste KID, qui n'est pas un code ISO 4217 ; le dollar australien a cours",
    date: CORRECTION_DATE,
  },
  TUV: {
    currencies: ["AUD"],
    reason:
      "world-countries liste TVD, qui n'est pas un code ISO 4217 ; le dollar australien a cours",
    date: CORRECTION_DATE,
  },
  CUB: {
    currencies: ["CUP"],
    reason:
      "world-countries liste CUC, aboli en 2021 ; Intl le connaît encore, l'invariant sur les noms ne l'attrape pas",
    date: CORRECTION_DATE,
  },
  SLE: {
    currencies: ["SLE"],
    reason:
      "world-countries liste SLL, remplacé par le nouveau leone (SLE) lors de la redénomination de 2022",
    date: CORRECTION_DATE,
  },
  ZWE: {
    currencies: ["ZWG", "USD"],
    reason:
      "world-countries : 9 codes dont ZWB (hors ISO) ; ZWG (or du Zimbabwe) a cours depuis 2024 et le dollar américain reste largement utilisé — à valider au gate",
    date: CORRECTION_DATE,
  },
  XKX: {
    currencies: ["EUR"],
    reason:
      "absent de world-countries (ajout manuel) ; le Kosovo utilise l'euro",
    date: CORRECTION_DATE,
  },
};

/**
 * Gentilés où `world-countries` a une faute ou une casse incohérente. Le
 * gentilé s'affiche comme un **nom** (« Français, Française ») : chaque élément
 * d'un composé prend la majuscule. Référence consultée : liste « Pays,
 * territoires et villes du monde » de la Commission nationale de toponymie
 * (fév. 2025), qui ne donne que l'adjectif en minuscules — la majuscule du nom
 * est une convention d'affichage. Règle du gate : on corrige les fautes, on ne
 * s'aligne pas sur la CNT (formes à trait d'union et radicaux attestés gardés).
 * Anglais : CIA World Factbook, champ *Nationality* (miroir figé `factbook.json`
 * au commit 8662a8b, comme le champ *Independence*).
 */
export const demonymCorrectionsByIso3: Record<Iso3, DemonymCorrection> = {
  BIH: {
    en: { m: "Bosnian or Herzegovinian", f: "Bosnian or Herzegovinian" },
    reason:
      "en : le Factbook (Nationality) donne « Bosnian, Herzegovinian » ; écrit « or » pour ne pas se lire « masculin, féminin » à côté du format français",
    date: CORRECTION_DATE,
  },
  DJI: {
    en: { m: "Djiboutian", f: "Djiboutian" },
    reason:
      "en : world-countries donne « Djibouti » (le nom du pays) ; le Factbook (Nationality) donne « Djiboutian »",
    date: CORRECTION_DATE,
  },
  KGZ: {
    en: { m: "Kyrgyzstani", f: "Kyrgyzstani" },
    reason:
      "en : world-countries donne « Kirghiz » ; le Factbook (Nationality) donne « Kyrgyzstani »",
    date: CORRECTION_DATE,
  },
  MDV: {
    en: { m: "Maldivian", f: "Maldivian" },
    reason:
      "en : world-countries donne « Maldivan » (faute) ; le Factbook (Nationality) donne « Maldivian »",
    date: CORRECTION_DATE,
  },
  TJK: {
    en: { m: "Tajikistani", f: "Tajikistani" },
    reason:
      "en : world-countries donne « Tadzhik » ; le Factbook (Nationality) donne « Tajikistani »",
    date: CORRECTION_DATE,
  },
  ARE: {
    fr: { m: "Émirien", f: "Émirienne" },
    reason: "majuscule accentuée manquante (CNT : émirien)",
    date: CORRECTION_DATE,
  },
  ATG: {
    fr: {
      m: "Antiguais et Barbudien",
      f: "Antiguaise et Barbudienne",
    },
    en: { m: "Antiguan or Barbudan", f: "Antiguan or Barbudan" },
    reason:
      "fr : le masculin de world-countries est au féminin (« Antiguaise et barbudien »), correction minimale sans changer de radical ; en : le Factbook donne « Antiguan, Barbudan », écrit « or » comme KNA",
    date: CORRECTION_DATE,
  },
  CPV: {
    fr: { m: "Cap-Verdien", f: "Cap-Verdienne" },
    en: { m: "Cabo Verdean", f: "Cabo Verdean" },
    reason:
      "fr : second élément du composé sans majuscule (CNT : cap-verdien) ; en : « Cape Verdian » est une faute, le Factbook (Nationality) donne « Cabo Verdean »",
    date: CORRECTION_DATE,
  },
  GNQ: {
    fr: { m: "Équato-Guinéen", f: "Équato-Guinéenne" },
    reason: "second élément du composé sans majuscule",
    date: CORRECTION_DATE,
  },
  KNA: {
    fr: { m: "Kittitien-et-Névicien", f: "Kittitienne-et-Névicienne" },
    reason:
      "majuscule et accent manquants sur le second élément ; la CNT donne christophien, non retenu (moins courant)",
    date: CORRECTION_DATE,
  },
  KOR: {
    fr: { m: "Sud-Coréen", f: "Sud-Coréenne" },
    reason: "second élément du composé sans majuscule (CNT : sud-coréen)",
    date: CORRECTION_DATE,
  },
  LKA: {
    fr: { m: "Sri-Lankais", f: "Sri-Lankaise" },
    reason: "second élément du composé sans majuscule (CNT : srilankais)",
    date: CORRECTION_DATE,
  },
  NZL: {
    fr: { m: "Néo-Zélandais", f: "Néo-Zélandaise" },
    reason:
      "« Neo » sans accent dans world-countries ; la CNT soude le mot (néozélandais), forme non retenue pour un nom propre",
    date: CORRECTION_DATE,
  },
  PRK: {
    fr: { m: "Nord-Coréen", f: "Nord-Coréenne" },
    reason: "second élément du composé sans majuscule (CNT : nord-coréen)",
    date: CORRECTION_DATE,
  },
  SLE: {
    fr: { m: "Sierra-Léonais", f: "Sierra-Léonaise" },
    reason:
      "accent et majuscule manquants ; la CNT soude le mot (sierraléonais), forme non retenue pour un nom propre",
    date: CORRECTION_DATE,
  },
  TLS: {
    fr: { m: "Est-Timorais", f: "Est-Timoraise" },
    reason: "second élément du composé sans majuscule",
    date: CORRECTION_DATE,
  },
  ZAF: {
    fr: { m: "Sud-Africain", f: "Sud-Africaine" },
    reason:
      "second élément du composé sans majuscule ; la CNT accepte sudafricain ou sud-africain",
    date: CORRECTION_DATE,
  },
  XKX: {
    fr: { m: "Kosovar", f: "Kosovare" },
    en: { m: "Kosovar", f: "Kosovar" },
    reason: "absent de world-countries (ajout manuel) ; CNT : kosovar, -e",
    date: CORRECTION_DATE,
  },
};

const NAME_REFERENCES =
  "INSEE, COG 2026 « Pays et territoires étrangers » (https://www.insee.fr/fr/statistiques/fichier/8740222/v_pays_territoire_2026.csv) ; Commission nationale de toponymie, liste « Pays, territoires et villes du monde » adoptée par le CNIG le 2025-09-16 (https://cnig.gouv.fr/IMG/pdf/7__liste_pays_territoires_et_villes_du_monde.pdf)";

/**
 * Noms français où `world-countries` s'écarte de la liste de référence de
 * l'administration française. Le nom de la source est conservé comme alias de
 * recherche. Revue #129 (2026-10-14).
 */
export const nameCorrectionsByIso3: Record<Iso3, NameCorrection> = {
  CPV: {
    fr: "Cap-Vert",
    reason: `world-countries : « Îles du Cap-Vert » ; ${NAME_REFERENCES} : « Cap-Vert »`,
    date: "2026-10-14",
  },
  PLW: {
    fr: "Palaos",
    reason: `world-countries : « Palaos (Palau) » ; ${NAME_REFERENCES} : « Palaos »`,
    date: "2026-10-14",
  },
  MUS: {
    fr: "Maurice",
    reason: `world-countries : « Île Maurice » ; ${NAME_REFERENCES} : « Maurice »`,
    date: "2026-10-14",
  },
  SUR: {
    fr: "Suriname",
    reason: `world-countries : « Surinam » ; ${NAME_REFERENCES} : « Suriname »`,
    date: "2026-10-14",
  },
};

export const countryPatches: CountryPatchesConfig = {
  sourceCorrectionsByIso3,
  currencyCorrectionsByIso3,
  demonymCorrectionsByIso3,
  nameCorrectionsByIso3,
  searchAliasesByIso3,
  wikipediaTitlesByIso3,
  gameplayClassifications,
  manualCountryAdditions,
};
