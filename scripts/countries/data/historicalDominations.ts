import type { DominationSource, HistoricalDominationsSnapshot } from "./types";

/**
 * Dominations britannique et française passées, par pays — liste de
 * `history_from_united_kingdom` / `history_from_france` (issue #126).
 *
 * Distinct de `sovereignty.ts` : le champ *Independence* du Factbook ne donne
 * que le souverain **immédiatement antérieur** (Singapour « from Malaysian
 * Federation »), quand le libellé promet « un jour sous domination ».
 *
 * Règles (tranchées le 2026-10-14, détail et motifs dans
 * `content/constraints/SOURCES.md#histoire-et-souveraineté`) :
 * - comptent la colonie, le protectorat, l'État protégé (affaires étrangères
 *   dirigées par la puissance) quand l'entité protégée est l'État actuel ou
 *   s'est unie à lui à sa formation, le mandat ou la tutelle, le condominium ;
 * - ne comptent pas l'occupation militaire suivie de restitution (dont
 *   l'administration militaire provisoire d'une ex-colonie ennemie), une
 *   protection sur une entité disparue avant la formation de l'État actuel,
 *   l'État satellite, l'annexion napoléonienne, le mandat exercé par un
 *   dominion, ni les possessions féodales de l'Angleterre en Europe ; ses
 *   colonies d'outre-mer d'avant 1707 comptent ;
 * - un territoire partiel compte si la capitale actuelle en relevait, ou s'il
 *   s'est uni à l'État au moment de la décolonisation ;
 * - un pays passé d'une puissance à l'autre entre dans les deux listes.
 *
 * Conventions de période : début = premier acte retenu par la source (traité,
 * fondation, annexion, conquête non restituée) ; fin = indépendance, cession ou
 * transfert — l'année du champ *Independence* quand la domination s'achève par
 * l'indépendance. Nature = statut du territoire à la fin de la domination.
 *
 * Fusionné dans `facts.ts` (`dominations`) par `pnpm build:countries` ; gardé
 * par `check:content` (`validateHistoricalDominations`).
 */

const FB_BG: DominationSource = { id: "cia_factbook_background" };
const FB_IND: DominationSource = { id: "cia_factbook_independence" };
const brit = (page: `/${string}`): DominationSource => ({
  id: "britannica",
  page,
});

export const HISTORICAL_DOMINATIONS: HistoricalDominationsSnapshot = {
  checkedAt: "2026-10-14",
  countries: {
    AFG: [
      {
        power: "united_kingdom",
        nature: "protected_state",
        from: 1879,
        to: 1919,
        reason:
          "Traité de Gandamak (1879) ; contrôle britannique des affaires étrangères afghanes jusqu'en 1919.",
        sources: [brit("/place/Afghanistan"), FB_IND],
      },
    ],
    ARE: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1892,
        to: 1971,
        reason:
          "Accords exclusifs de 1892 restreignant les relations extérieures des cheikhs de la Côte de la Trêve (traités de 1820 et 1853 avant eux).",
        sources: [brit("/place/United-Arab-Emirates"), FB_BG, FB_IND],
      },
    ],
    ATG: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1632,
        to: 1981,
        reason: "Colonisée par des Anglais en 1632.",
        sources: [brit("/place/Antigua-and-Barbuda"), FB_IND],
      },
    ],
    AUS: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1788,
        to: 1901,
        reason:
          "Colonie pénitentiaire de Nouvelle-Galles du Sud (1788) ; fédération de 1901.",
        sources: [FB_BG, FB_IND],
      },
    ],
    BEN: [
      {
        power: "france",
        nature: "colony",
        from: 1863,
        to: 1960,
        intermittent: true,
        reason:
          "Protectorat sur Porto-Novo en 1863–1865, rétabli en 1882 ; conquête du Dahomey en 1892–1894.",
        sources: [brit("/place/Benin"), FB_IND],
      },
    ],
    BFA: [
      {
        power: "france",
        nature: "colony",
        from: 1895,
        to: 1960,
        reason: "Protectorat sur le Yatenga en 1895.",
        sources: [brit("/place/Burkina-Faso"), FB_IND],
      },
    ],
    BGD: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1757,
        to: 1947,
        reason:
          "Bengale dominé par la Compagnie des Indes après Plassey (1757), puis Inde britannique jusqu'à la partition de 1947.",
        sources: [brit("/place/Bangladesh"), FB_BG],
      },
    ],
    BHR: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1861,
        to: 1971,
        reason:
          "Statut d'État protégé daté du traité de 1861 (premier traité en 1820).",
        sources: [brit("/place/Bahrain"), FB_BG, FB_IND],
      },
    ],
    BHS: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1647,
        to: 1973,
        reason: "Début de l'établissement britannique.",
        sources: [FB_BG, FB_IND],
      },
    ],
    BLZ: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1862,
        to: 1981,
        reason:
          "Colonie du Honduras britannique en 1862 (établissement britannique antérieur).",
        sources: [FB_BG, FB_IND],
      },
    ],
    BRB: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1627,
        to: 1966,
        reason: "Île inhabitée colonisée par les Britanniques en 1627.",
        sources: [FB_BG, FB_IND],
      },
    ],
    BRN: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1888,
        to: 1984,
        reason: "Protectorat britannique en 1888.",
        sources: [FB_BG, FB_IND],
      },
    ],
    BTN: [
      {
        power: "united_kingdom",
        nature: "protected_state",
        from: 1910,
        to: 1947,
        reason:
          "Traité de 1910 : la Grande-Bretagne dirige les affaires étrangères ; l'Inde indépendante reprend ce rôle (traité de 1949).",
        sources: [brit("/place/Bhutan"), FB_BG],
      },
    ],
    BWA: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1885,
        to: 1966,
        reason: "Protectorat du Bechuanaland en 1885.",
        sources: [FB_BG, FB_IND],
      },
    ],
    CAF: [
      {
        power: "france",
        nature: "colony",
        from: 1889,
        to: 1960,
        reason:
          "Bangui fondée comme poste français en 1889 ; colonie de l'Oubangui-Chari en 1903.",
        sources: [brit("/place/Central-African-Republic"), FB_BG, FB_IND],
      },
    ],
    CAN: [
      {
        power: "france",
        nature: "colony",
        from: 1534,
        to: 1763,
        part: { fr: "Nouvelle-France", en: "New France" },
        reason:
          "Nouvelle-France, colonisée de 1534 à 1763 ; le site d'Ottawa, décrit par Champlain en 1613, en relevait.",
        sources: [brit("/place/New-France"), brit("/place/Ottawa")],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1763,
        to: 1867,
        reason:
          "Cession de la Nouvelle-France en 1763 (colonies britanniques antérieures à l'est) ; Dominion du Canada en 1867.",
        sources: [brit("/place/Ottawa"), brit("/place/Canada"), FB_IND],
      },
    ],
    CIV: [
      {
        power: "france",
        nature: "colony",
        from: 1893,
        to: 1960,
        reason:
          "Colonie revendiquée en 1893, après des protectorats de 1887–1889.",
        sources: [brit("/place/Cote-dIvoire"), FB_IND],
      },
    ],
    CMR: [
      {
        power: "france",
        nature: "trusteeship",
        from: 1922,
        to: 1960,
        reason:
          "Mandat de la SDN de 1922 (Cameroun français), tutelle de l'ONU ensuite.",
        sources: [brit("/place/Cameroon"), brit("/place/Togo"), FB_BG],
      },
      {
        power: "united_kingdom",
        nature: "trusteeship",
        from: 1922,
        to: 1961,
        part: { fr: "Cameroun méridional", en: "Southern Cameroons" },
        reason:
          "Mandat de 1922 puis tutelle ; le Cameroun méridional britannique s'unit au Cameroun en 1961 (plébiscite de l'ONU).",
        sources: [brit("/place/Cameroon"), brit("/place/Togo"), FB_BG],
      },
    ],
    COG: [
      {
        power: "france",
        nature: "colony",
        from: 1880,
        to: 1960,
        reason:
          "Traité de Brazza avec le roi Téké (1880) ; colonie du Congo français en 1891.",
        sources: [brit("/place/Republic-of-the-Congo"), FB_IND],
      },
    ],
    COM: [
      {
        power: "france",
        nature: "colony",
        from: 1886,
        to: 1975,
        reason:
          "Protectorat sur la Grande Comore, Anjouan et Mohéli en 1886 (Mayotte, restée française, depuis 1843).",
        sources: [brit("/place/Comoros"), FB_IND],
      },
    ],
    CYP: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1878,
        to: 1960,
        reason:
          "Administration britannique (convention de 1878), annexion en 1914, colonie en 1925.",
        sources: [brit("/place/Cyprus"), FB_IND],
      },
    ],
    DJI: [
      {
        power: "france",
        nature: "colony",
        from: 1862,
        to: 1977,
        reason:
          "Station d'Obock acquise en 1862 ; Côte française des Somalis de 1896 à 1967.",
        sources: [brit("/place/Djibouti"), FB_BG, FB_IND],
      },
    ],
    DMA: [
      {
        power: "france",
        nature: "colony",
        from: 1632,
        to: 1759,
        reason:
          "Premiers colons français en 1632 ; île déclarée neutre en 1748, colons français jusqu'à la prise britannique de 1759.",
        sources: [brit("/place/Dominica")],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1759,
        to: 1978,
        reason: "Prise britannique de 1759, cession française de 1763.",
        sources: [brit("/place/Dominica"), FB_BG, FB_IND],
      },
    ],
    DOM: [
      {
        power: "france",
        nature: "colony",
        from: 1795,
        to: 1809,
        reason: "Santo Domingo sous domination française de 1795 à 1809.",
        sources: [brit("/place/Santo-Domingo")],
      },
    ],
    DZA: [
      {
        power: "france",
        nature: "colony",
        from: 1830,
        to: 1962,
        reason: "Prise d'Alger en 1830.",
        sources: [brit("/place/Algeria"), FB_BG, FB_IND],
      },
    ],
    EGY: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1882,
        to: 1922,
        reason:
          "Contrôle britannique du gouvernement dès 1882, protectorat formel de 1914 à 1922.",
        sources: [brit("/place/Egypt"), FB_BG, FB_IND],
      },
    ],
    FJI: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1874,
        to: 1970,
        reason: "Cession au Royaume-Uni en 1874.",
        sources: [FB_BG, FB_IND],
      },
    ],
    GAB: [
      {
        power: "france",
        nature: "colony",
        from: 1839,
        to: 1960,
        reason:
          "Traités de Bouët-Willaumez sur l'estuaire en 1839 ; Libreville fondée en 1849.",
        sources: [brit("/place/Gabon"), FB_IND],
      },
    ],
    GHA: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1874,
        to: 1957,
        reason: "Colonie de la Côte-de-l'Or proclamée en 1874.",
        sources: [brit("/place/Ghana"), FB_IND],
      },
    ],
    GIN: [
      {
        power: "france",
        nature: "colony",
        from: 1891,
        to: 1958,
        reason:
          "Conakry capitale du protectorat des Rivières du Sud en 1891, de la Guinée française en 1893.",
        sources: [brit("/place/Guinea"), FB_IND],
      },
    ],
    GMB: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1664,
        to: 1965,
        reason:
          "Colonie anglaise établie en 1664 ; Bathurst (Banjul) fondée en 1816.",
        sources: [FB_BG, brit("/place/The-Gambia"), FB_IND],
      },
    ],
    GRD: [
      {
        power: "france",
        nature: "colony",
        from: 1650,
        to: 1762,
        reason: "Établissement français de 1650 ; prise britannique de 1762.",
        sources: [brit("/place/Grenada"), FB_BG],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1762,
        to: 1974,
        intermittent: true,
        reason:
          "Prise de 1762, cession de 1763 ; reprise française de 1779 à 1783.",
        sources: [brit("/place/Grenada"), FB_BG, FB_IND],
      },
    ],
    GUY: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1796,
        to: 1966,
        intermittent: true,
        reason:
          "Possession britannique dès 1796, sauf de courts intervalles, achat de 1814 ; Guyane britannique en 1831.",
        sources: [brit("/place/Guyana"), FB_IND],
      },
    ],
    HTI: [
      {
        power: "france",
        nature: "colony",
        from: 1697,
        to: 1804,
        reason:
          "Saint-Domingue cédée à la France au traité de Rijswijk (1697).",
        sources: [brit("/place/Haiti"), FB_BG, FB_IND],
      },
    ],
    IND: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1757,
        to: 1947,
        reason:
          "Domination de la Compagnie des Indes après Plassey (1757), administration directe de la Couronne en 1858.",
        sources: [brit("/place/India"), FB_IND],
      },
    ],
    IRL: [
      {
        power: "united_kingdom",
        nature: "union",
        from: 1801,
        to: 1921,
        reason:
          "Actes d'Union de 1800 (effet en 1801) ; la domination anglaise antérieure relève des possessions européennes de l'Angleterre.",
        sources: [FB_BG, FB_IND],
      },
    ],
    IRQ: [
      {
        power: "united_kingdom",
        nature: "mandate",
        from: 1920,
        to: 1932,
        reason: "Mandat de la SDN sous administration britannique en 1920.",
        sources: [FB_BG, FB_IND],
      },
    ],
    ISR: [
      {
        power: "united_kingdom",
        nature: "mandate",
        from: 1920,
        to: 1948,
        reason:
          "Mandat de Palestine attribué à San Remo (1920) ; retrait britannique en 1948.",
        sources: [brit("/place/Palestine"), FB_BG, FB_IND],
      },
    ],
    JAM: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1655,
        to: 1962,
        reason: "Prise de l'île par l'Angleterre en 1655.",
        sources: [FB_BG, FB_IND],
      },
    ],
    JOR: [
      {
        power: "united_kingdom",
        nature: "mandate",
        from: 1920,
        to: 1946,
        reason:
          "Mandat attribué à San Remo (1920), confirmé par la SDN en 1922.",
        sources: [brit("/place/Jordan"), FB_IND],
      },
    ],
    KEN: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1895,
        to: 1963,
        reason: "Protectorat d'Afrique orientale en 1895, colonie en 1920.",
        sources: [FB_BG, FB_IND],
      },
    ],
    KHM: [
      {
        power: "france",
        nature: "protectorate",
        from: 1863,
        to: 1953,
        reason: "Protectorat français de 1863.",
        sources: [brit("/place/Cambodia"), FB_BG, FB_IND],
      },
    ],
    KIR: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1892,
        to: 1979,
        reason:
          "Protectorat sur les îles Gilbert en 1892, colonie des îles Gilbert et Ellice en 1916.",
        sources: [brit("/place/Kiribati"), FB_BG, FB_IND],
      },
    ],
    KNA: [
      {
        power: "france",
        nature: "colony",
        from: 1627,
        to: 1713,
        part: { fr: "Saint-Kitts en partie", en: "part of Saint Kitts" },
        reason:
          "Colonie française d'Esnambuc fondée en 1627, année de fondation de Basseterre ; île partagée jusqu'au traité d'Utrecht (1713).",
        sources: [
          brit("/place/Saint-Kitts-and-Nevis"),
          brit("/place/Basseterre"),
        ],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1623,
        to: 1983,
        reason:
          "Première colonie anglaise des Antilles (1623) ; île entière britannique en 1713.",
        sources: [brit("/place/Saint-Kitts-and-Nevis"), FB_IND],
      },
    ],
    KWT: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1899,
        to: 1961,
        reason:
          "Traité de 1899 confiant les affaires étrangères à la Grande-Bretagne.",
        sources: [brit("/place/Kuwait"), FB_BG],
      },
    ],
    LAO: [
      {
        power: "france",
        nature: "protectorate",
        from: 1893,
        to: 1953,
        reason:
          "Protectorat reconnu par le Siam en 1893 ; pleine indépendance reconnue en 1953.",
        sources: [brit("/place/Laos"), FB_IND],
      },
    ],
    LBN: [
      {
        power: "france",
        nature: "mandate",
        from: 1920,
        to: 1943,
        reason: "Grand Liban créé sous mandat français en 1920.",
        sources: [brit("/place/Lebanon"), FB_BG, FB_IND],
      },
    ],
    LCA: [
      {
        power: "france",
        nature: "colony",
        from: 1650,
        to: 1803,
        intermittent: true,
        reason:
          "Établissement français de 1650 ; possession disputée avec la Grande-Bretagne jusqu'en 1803.",
        sources: [brit("/place/Saint-Lucia"), FB_BG],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1803,
        to: 1979,
        reason:
          "Dernière prise britannique en 1803 (les précédentes restituées), cession au traité de Paris de 1814.",
        sources: [brit("/place/Saint-Lucia"), FB_BG, FB_IND],
      },
    ],
    LKA: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1796,
        to: 1948,
        reason:
          "Reddition néerlandaise de 1796 ; colonie de la Couronne en 1802.",
        sources: [brit("/place/Sri-Lanka"), FB_BG, FB_IND],
      },
    ],
    LSO: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1868,
        to: 1966,
        reason:
          "Protectorat du Basutoland en 1868, colonie de la Couronne après 1884.",
        sources: [FB_BG, FB_IND],
      },
    ],
    MAR: [
      {
        power: "france",
        nature: "protectorate",
        from: 1912,
        to: 1956,
        reason: "Traité de Fès (1912).",
        sources: [brit("/place/Morocco"), FB_BG, FB_IND],
      },
    ],
    MDG: [
      {
        power: "france",
        nature: "colony",
        from: 1895,
        to: 1960,
        reason: "Occupation d'Antananarivo en 1895, annexion en 1896.",
        sources: [brit("/place/Madagascar"), FB_BG, FB_IND],
      },
    ],
    MDV: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1887,
        to: 1965,
        reason: "Protectorat formalisé en 1887.",
        sources: [brit("/place/Maldives"), FB_BG, FB_IND],
      },
    ],
    MLI: [
      {
        power: "france",
        nature: "colony",
        from: 1883,
        to: 1960,
        reason: "Prise de Bamako en 1883 ; Soudan français ensuite.",
        sources: [brit("/place/Mali"), FB_BG, FB_IND],
      },
    ],
    MLT: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1800,
        to: 1964,
        reason:
          "Troupes britanniques en 1800 ; souveraineté confirmée aux traités de Paris (1814–1815).",
        sources: [brit("/place/Malta"), FB_BG, FB_IND],
      },
    ],
    MMR: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1826,
        to: 1948,
        reason:
          "Cessions de la première guerre anglo-birmane (1824–1826), conquête achevée en 1885.",
        sources: [brit("/place/Myanmar"), FB_BG, FB_IND],
      },
    ],
    MRT: [
      {
        power: "france",
        nature: "colony",
        from: null,
        to: 1960,
        reason:
          "Colonie française dans la première moitié du XXᵉ siècle ; « pacification » jusqu'en 1912. Aucune source de référence ne date le début.",
        sources: [brit("/place/Mauritania"), FB_BG, FB_IND],
      },
    ],
    MUS: [
      {
        power: "france",
        nature: "colony",
        from: 1721,
        to: 1810,
        reason:
          "Occupée par la Compagnie française des Indes en 1721 (Île de France).",
        sources: [brit("/place/Mauritius"), FB_BG],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1810,
        to: 1968,
        reason: "Prise britannique de 1810, souveraineté confirmée en 1814.",
        sources: [brit("/place/Mauritius"), FB_BG, FB_IND],
      },
    ],
    MWI: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1891,
        to: 1964,
        reason:
          "Protectorat d'Afrique centrale britannique en 1891, Nyasaland en 1907.",
        sources: [FB_BG, FB_IND],
      },
    ],
    MYS: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1786,
        to: 1957,
        reason:
          "Penang acquise en 1786 ; colonies des Détroits et États malais protégés, Fédération de Malaisie indépendante en 1957.",
        sources: [brit("/place/Malaysia"), FB_BG, FB_IND],
      },
    ],
    NER: [
      {
        power: "france",
        nature: "colony",
        from: 1922,
        to: 1960,
        reason:
          "Administration coloniale régulière établie en 1922, après la conquête de la fin du XIXᵉ siècle.",
        sources: [brit("/place/Niger"), FB_BG, FB_IND],
      },
    ],
    NGA: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1861,
        to: 1960,
        reason:
          "Annexion de Lagos en 1861 ; colonie et protectorat du Nigeria en 1914.",
        sources: [brit("/place/Nigeria"), FB_BG, FB_IND],
      },
    ],
    NRU: [
      {
        power: "united_kingdom",
        nature: "trusteeship",
        from: 1919,
        to: 1968,
        reason:
          "Mandat conjoint Australie–Royaume-Uni–Nouvelle-Zélande en 1919, tutelle ensuite.",
        sources: [FB_BG, FB_IND],
      },
    ],
    NZL: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1840,
        to: 1907,
        reason: "Traité de Waitangi (1840), colonie distincte en 1841.",
        sources: [FB_BG, FB_IND],
      },
    ],
    PAK: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1843,
        to: 1947,
        reason: "Conquête du Sind en 1843, annexion du Pendjab en 1849.",
        sources: [brit("/place/Pakistan"), FB_IND],
      },
    ],
    PNG: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1884,
        to: 1906,
        part: { fr: "Papouasie", en: "Papua" },
        reason:
          "Protectorat sur le sud-est (Port Moresby) en 1884, colonie de Nouvelle-Guinée britannique, administrée par l'Australie à partir de 1906.",
        sources: [brit("/place/Papua-New-Guinea"), FB_BG],
      },
    ],
    PSE: [
      {
        power: "united_kingdom",
        nature: "mandate",
        from: 1920,
        to: 1948,
        reason:
          "Mandat de Palestine attribué à San Remo (1920) ; fin du mandat en 1948.",
        sources: [brit("/place/Palestine"), FB_BG],
      },
    ],
    QAT: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1916,
        to: 1971,
        reason:
          "Traité de 1916 confiant la politique étrangère à la Grande-Bretagne.",
        sources: [brit("/place/Qatar"), FB_BG, FB_IND],
      },
    ],
    SDN: [
      {
        power: "united_kingdom",
        nature: "condominium",
        from: 1899,
        to: 1956,
        reason:
          "Condominium anglo-égyptien de 1899, dominé par les Britanniques.",
        sources: [brit("/place/Sudan"), FB_BG, FB_IND],
      },
    ],
    SEN: [
      {
        power: "france",
        nature: "colony",
        from: 1659,
        to: 1960,
        reason: "Comptoir de Saint-Louis rebâti en 1659, Gorée prise en 1677.",
        sources: [brit("/place/Senegal"), FB_IND],
      },
    ],
    SGP: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1819,
        to: 1963,
        reason:
          "Comptoir fondé par Raffles en 1819, île cédée en 1824 ; britannique jusqu'à l'entrée dans la Malaisie (1963).",
        sources: [brit("/place/Singapore"), FB_BG],
      },
    ],
    SLB: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1893,
        to: 1978,
        reason:
          "Protectorat sur les îles du sud en 1893, étendu au nord en 1899.",
        sources: [FB_BG, FB_IND],
      },
    ],
    SLE: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1808,
        to: 1961,
        reason: "Colonie de la Couronne le 1er janvier 1808.",
        sources: [brit("/place/Sierra-Leone"), FB_IND],
      },
    ],
    SOM: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1884,
        to: 1960,
        part: { fr: "Somaliland", en: "Somaliland" },
        reason:
          "Traités de protection de 1884–1886 au nord ; le Somaliland britannique s'unit à l'ex-Somalie italienne en 1960.",
        sources: [brit("/place/Somalia"), FB_BG, FB_IND],
      },
    ],
    SSD: [
      {
        power: "united_kingdom",
        nature: "condominium",
        from: 1899,
        to: 1956,
        reason: "Partie du condominium anglo-égyptien du Soudan.",
        sources: [brit("/place/Sudan"), FB_BG],
      },
    ],
    SUR: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1651,
        to: 1667,
        reason:
          "Premier établissement permanent, de planteurs anglais, en 1651 ; cédé aux Pays-Bas en 1667.",
        sources: [brit("/place/Suriname"), FB_BG],
      },
    ],
    SWZ: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1903,
        to: 1968,
        reason: "Territoire de haut-commissariat britannique à partir de 1903.",
        sources: [brit("/place/Eswatini"), FB_BG, FB_IND],
      },
    ],
    SYC: [
      {
        power: "france",
        nature: "colony",
        from: 1756,
        to: 1810,
        reason:
          "Annexion à la France en 1756 ; reddition aux Britanniques en 1810.",
        sources: [brit("/place/Seychelles")],
      },
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1810,
        to: 1976,
        reason: "Reddition de 1810, cession au traité de Paris de 1814.",
        sources: [brit("/place/Seychelles"), FB_BG, FB_IND],
      },
    ],
    SYR: [
      {
        power: "france",
        nature: "mandate",
        from: 1920,
        to: 1946,
        reason: "Mandat imposé par l'occupation française de 1920.",
        sources: [brit("/place/Syria"), FB_BG, FB_IND],
      },
    ],
    TCD: [
      {
        power: "france",
        nature: "colony",
        from: 1900,
        to: 1960,
        reason:
          "Défaite de Rabah en 1900 ; Afrique-Équatoriale française en 1910.",
        sources: [brit("/place/Chad"), FB_BG, FB_IND],
      },
    ],
    TGO: [
      {
        power: "france",
        nature: "trusteeship",
        from: 1922,
        to: 1960,
        reason:
          "Mandat de la SDN de 1922 sur le Togo oriental, tutelle de l'ONU en 1946.",
        sources: [brit("/place/Togo"), FB_IND],
      },
    ],
    TON: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1900,
        to: 1970,
        reason: "Accord de protectorat de 1900.",
        sources: [FB_BG, FB_IND],
      },
    ],
    TTO: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1797,
        to: 1962,
        reason: "Prise de la Trinité en 1797, cession en 1802.",
        sources: [brit("/place/Trinidad-and-Tobago"), FB_IND],
      },
    ],
    TUN: [
      {
        power: "france",
        nature: "protectorate",
        from: 1881,
        to: 1956,
        reason: "Protectorat français de 1881.",
        sources: [brit("/place/Tunisia"), FB_BG, FB_IND],
      },
    ],
    TUV: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1892,
        to: 1978,
        reason: "Protectorat de 1892, fusionné avec les îles Gilbert.",
        sources: [FB_BG, FB_IND],
      },
    ],
    TZA: [
      {
        power: "united_kingdom",
        nature: "trusteeship",
        from: 1920,
        to: 1961,
        part: { fr: "Tanganyika", en: "Tanganyika" },
        reason:
          "Mandat de la SDN en vigueur en 1920, tutelle ensuite ; Zanzibar, protectorat britannique, indépendant en 1963.",
        sources: [brit("/place/Tanzania"), FB_BG],
      },
    ],
    UGA: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1894,
        to: 1962,
        reason: "Protectorat britannique de 1894.",
        sources: [FB_BG, FB_IND],
      },
    ],
    USA: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1607,
        to: 1776,
        reason:
          "Colonie de Jamestown en 1607 ; indépendance déclarée en 1776, reconnue en 1783.",
        sources: [brit("/place/United-States"), FB_IND],
      },
    ],
    VCT: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1763,
        to: 1979,
        intermittent: true,
        reason: "Traité de Paris de 1763 ; prise française de 1779 à 1783.",
        sources: [brit("/place/Saint-Vincent-and-the-Grenadines"), FB_IND],
      },
    ],
    VNM: [
      {
        power: "france",
        nature: "colony",
        from: 1858,
        to: 1954,
        reason:
          "Conquête commencée en 1858, Indochine française en 1887 ; défaite de Diên Biên Phu en 1954.",
        sources: [FB_BG, brit("/place/Vietnam")],
      },
    ],
    VUT: [
      {
        power: "france",
        nature: "condominium",
        from: 1906,
        to: 1980,
        reason: "Condominium franco-britannique des Nouvelles-Hébrides (1906).",
        sources: [FB_BG, FB_IND],
      },
      {
        power: "united_kingdom",
        nature: "condominium",
        from: 1906,
        to: 1980,
        reason: "Condominium franco-britannique des Nouvelles-Hébrides (1906).",
        sources: [FB_BG, FB_IND],
      },
    ],
    YEM: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1839,
        to: 1967,
        part: { fr: "Aden", en: "Aden" },
        reason:
          "Prise d'Aden en 1839 ; le Sud-Yémen indépendant en 1967 s'unit au Nord en 1990.",
        sources: [brit("/place/Yemen"), FB_BG, FB_IND],
      },
    ],
    ZAF: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1806,
        to: 1910,
        reason:
          "Réannexion du Cap en 1806 (l'occupation de 1795 restituée en 1802) ; Union sud-africaine en 1910.",
        sources: [brit("/place/South-Africa"), FB_IND],
      },
    ],
    ZMB: [
      {
        power: "united_kingdom",
        nature: "protectorate",
        from: 1911,
        to: 1964,
        reason:
          "Rhodésie du Nord constituée en 1911 sous la British South Africa Company, Colonial Office en 1924.",
        sources: [brit("/place/Zambia"), FB_BG, FB_IND],
      },
    ],
    ZWE: [
      {
        power: "united_kingdom",
        nature: "colony",
        from: 1890,
        to: 1980,
        reason:
          "Colonne de la British South Africa Company en 1890, colonie de Rhodésie du Sud en 1923 ; indépendance reconnue en 1980.",
        sources: [brit("/place/Zimbabwe"), FB_BG, FB_IND],
      },
    ],
  },
  excluded: {
    ALB: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Occupation de Korçë de 1916 à 1920.",
      },
    ],
    AND: [
      {
        power: "france",
        rules: ["no_formal_domination"],
        reason:
          "Coprincipauté dont le chef de l'État français est coprince : co-souveraineté, toujours en vigueur.",
      },
    ],
    ARG: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Invasions britanniques de Buenos Aires en 1806–1807.",
      },
    ],
    ATG: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Raid français de 1666.",
      },
    ],
    AUT: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Zone d'occupation de 1945 à 1955.",
      },
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Zone d'occupation de 1945 à 1955.",
      },
    ],
    BEL: [
      {
        power: "france",
        rules: ["napoleonic_annexation"],
        reason: "Annexion à la France de 1795 à 1814.",
      },
    ],
    BRA: [
      {
        power: "france",
        rules: ["partial_territory"],
        reason:
          "France antarctique (baie de Rio, 1555–1567) et France équinoxiale (São Luís, 1612–1615) ; Brasília hors de leur territoire.",
      },
    ],
    CHE: [
      {
        power: "france",
        rules: ["client_state", "napoleonic_annexation", "partial_territory"],
        reason:
          "République helvétique satellite (1798–1803) ; Genève, Valais et Jura annexés, Berne non.",
      },
    ],
    CHN: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Hong Kong (1841–1997) et Weihaiwei (bail de 1898) ; Pékin jamais britannique.",
      },
      {
        power: "france",
        rules: ["partial_territory"],
        reason: "Territoire à bail de Kouang-Tchéou-Wan (1898–1945).",
      },
    ],
    CUB: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation de La Havane en 1762–1763, restituée à l'Espagne.",
      },
    ],
    DEU: [
      {
        power: "united_kingdom",
        rules: ["partial_territory", "military_occupation"],
        reason:
          "Heligoland britannique jusqu'en 1890 ; zone d'occupation de 1945 à 1949.",
      },
      {
        power: "france",
        rules: [
          "napoleonic_annexation",
          "partial_territory",
          "military_occupation",
        ],
        reason:
          "Rive gauche du Rhin annexée (1797–1814), protectorat de la Sarre (1947–1956), zone d'occupation (1945–1949) ; Berlin jamais français.",
      },
    ],
    EGY: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Expédition d'Égypte de 1798 à 1801.",
      },
    ],
    ERI: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason:
          "Administration militaire britannique (British Military Administration) de 1941 à la fédération avec l'Éthiopie (1952), dans l'attente d'un règlement international : jamais colonie, protectorat ni tutelle.",
      },
    ],
    ESP: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Minorque britannique par intervalles au XVIIIᵉ siècle ; Gibraltar hors du territoire espagnol.",
      },
      {
        power: "france",
        rules: ["client_state", "napoleonic_annexation", "partial_territory"],
        reason:
          "Royaume de Joseph Bonaparte (1808–1813) ; Catalogne annexée (1812–1814), Madrid non.",
      },
    ],
    ETH: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason:
          "Présence militaire britannique après la libération de 1941, dans un État souverain.",
      },
    ],
    FRA: [
      {
        power: "united_kingdom",
        rules: ["european_feudal_possession"],
        reason:
          "Possessions de la couronne d'Angleterre au Moyen Âge (Aquitaine, Calais, Paris de 1420 à 1436).",
      },
    ],
    GIN: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Îles de Los britanniques jusqu'en 1904 ; Conakry jamais britannique.",
      },
    ],
    GMB: [
      {
        power: "france",
        rules: ["partial_territory"],
        reason: "Comptoir d'Albreda.",
      },
    ],
    GNQ: [
      {
        power: "united_kingdom",
        rules: ["no_formal_domination"],
        reason:
          "Base navale de Port Clarence (Malabo) au XIXᵉ siècle, sous souveraineté espagnole.",
      },
    ],
    GRC: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Protectorat sur les îles Ioniennes (1815–1864) ; Athènes jamais britannique.",
      },
      {
        power: "france",
        rules: ["napoleonic_annexation", "partial_territory"],
        reason: "Îles Ioniennes annexées sous la Révolution et l'Empire.",
      },
    ],
    GUY: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Prise de Demerara en 1782–1784, restituée.",
      },
    ],
    HND: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Colonie des îles de la Baie (1852–1860) et côte des Mosquitos.",
      },
    ],
    HRV: [
      {
        power: "france",
        rules: ["napoleonic_annexation", "partial_territory"],
        reason: "Provinces illyriennes (1809–1814), Zagreb non comprise.",
      },
    ],
    HTI: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation britannique de Saint-Domingue de 1793 à 1798.",
      },
    ],
    IDN: [
      {
        power: "united_kingdom",
        rules: ["military_occupation", "partial_territory"],
        reason:
          "Java occupée de 1811 à 1816 puis restituée ; Bencoulen (Sumatra) britannique jusqu'en 1824.",
      },
    ],
    IND: [
      {
        power: "france",
        rules: ["partial_territory"],
        reason:
          "Établissements français de l'Inde (Pondichéry, Chandernagor…) ; New Delhi jamais française.",
      },
    ],
    IRN: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation anglo-soviétique de 1941 à 1946.",
      },
    ],
    ISL: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation britannique de 1940 à 1941.",
      },
    ],
    ITA: [
      {
        power: "france",
        rules: ["napoleonic_annexation", "client_state"],
        reason:
          "Piémont, Toscane et Rome annexés sous l'Empire ; royaume d'Italie satellite.",
      },
    ],
    JPN: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Force d'occupation du Commonwealth de 1946 à 1952.",
      },
    ],
    LBN: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Campagne de 1941 contre le Levant de Vichy.",
      },
    ],
    LBY: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason:
          "Administration militaire britannique (British Military Administration) de la Tripolitaine et de la Cyrénaïque de 1942 à l'indépendance (1951), dans l'attente d'un règlement international : jamais colonie, protectorat ni tutelle.",
      },
      {
        power: "france",
        rules: ["partial_territory"],
        reason:
          "Administration militaire du Fezzan jusqu'en 1951 ; Tripoli sous administration britannique.",
      },
    ],
    LUX: [
      {
        power: "france",
        rules: ["napoleonic_annexation"],
        reason:
          "Domination française de 1795 à 1814 (conquête de Louis XIV, 1684–1697, restituée).",
      },
    ],
    MAR: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason: "Tanger anglaise de 1661 à 1684.",
      },
    ],
    MCO: [
      {
        power: "france",
        rules: ["napoleonic_annexation"],
        reason:
          "Annexion à la France de 1793 à 1814 ; alliance avec la France auparavant.",
      },
    ],
    MDG: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation britannique de 1942.",
      },
    ],
    MEX: [
      {
        power: "france",
        rules: ["client_state"],
        reason:
          "Empire de Maximilien (1864–1867), soutenu par l'armée française.",
      },
    ],
    MLT: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Occupation française de 1798 à 1800.",
      },
    ],
    NAM: [
      {
        power: "united_kingdom",
        rules: ["dominion_mandate", "partial_territory"],
        reason:
          "Mandat confié à la couronne britannique mais exercé par l'Union sud-africaine ; Walvis Bay britannique, Windhoek non.",
      },
    ],
    NIC: [
      {
        power: "united_kingdom",
        rules: ["partial_territory"],
        reason:
          "Protectorat sur la côte des Mosquitos ; Managua jamais britannique.",
      },
    ],
    NLD: [
      {
        power: "france",
        rules: ["client_state", "napoleonic_annexation"],
        reason:
          "République batave et royaume de Hollande satellites, annexion de 1810 à 1813.",
      },
    ],
    NPL: [
      {
        power: "united_kingdom",
        rules: ["no_formal_domination"],
        reason:
          "Guerre anglo-népalaise (1814–1816) et traité de paix, indépendance conservée.",
      },
    ],
    OMN: [
      {
        power: "united_kingdom",
        rules: ["no_formal_domination"],
        reason:
          "Traités d'amitié et conseillers britanniques, jamais protectorat ; le sultanat concluait ses propres traités.",
      },
    ],
    PHL: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation de Manille en 1762–1764, restituée à l'Espagne.",
      },
    ],
    POL: [
      {
        power: "france",
        rules: ["client_state"],
        reason: "Duché de Varsovie (1807–1815).",
      },
    ],
    PRT: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Invasions napoléoniennes de 1807 à 1811.",
      },
    ],
    RUS: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Campagne de 1812.",
      },
    ],
    SAU: [
      {
        power: "united_kingdom",
        rules: ["not_counted_by_convention"],
        reason:
          "Traité de Darin (1915) : le Nejd sous protection britannique jusqu'au traité de Djeddah (1927). Ni le Factbook ni l'usage courant ne comptent l'Arabie saoudite parmi les pays passés sous domination britannique : exception de convention, décision du 2026-10-14 (#129).",
      },
    ],
    SEN: [
      {
        power: "united_kingdom",
        rules: ["military_occupation", "partial_territory"],
        reason:
          "Saint-Louis et Gorée britanniques par intervalles (1758–1817), restitués.",
      },
    ],
    SVN: [
      {
        power: "france",
        rules: ["napoleonic_annexation"],
        reason: "Provinces illyriennes (1809–1814), dont la Carniole.",
      },
    ],
    SYR: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Campagne de 1941 contre le Levant de Vichy.",
      },
    ],
    THA: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason: "Occupation de Chanthaburi (1893–1904) et de Trat (1904–1907).",
      },
    ],
    TTO: [
      {
        power: "france",
        rules: ["partial_territory"],
        reason:
          "Tobago française par intervalles (1781–1803) ; Port-d'Espagne jamais française.",
      },
    ],
    TUR: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation de Constantinople de 1918 à 1923.",
      },
      {
        power: "france",
        rules: ["military_occupation", "partial_territory"],
        reason:
          "Cilicie occupée (1919–1921) ; sandjak d'Alexandrette sous mandat français jusqu'en 1939.",
      },
    ],
    URY: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation de Montevideo en 1807.",
      },
    ],
    USA: [
      {
        power: "france",
        rules: ["partial_territory"],
        reason: "Louisiane et pays des Illinois ; Washington jamais française.",
      },
    ],
    VAT: [
      {
        power: "france",
        rules: ["napoleonic_annexation"],
        reason: "Rome annexée à l'Empire de 1809 à 1814.",
      },
    ],
    VCT: [
      {
        power: "france",
        rules: ["military_occupation"],
        reason:
          "Établissement toléré par les Caraïbes au début du XVIIIᵉ siècle, prise de 1779 restituée en 1783.",
      },
    ],
    VNM: [
      {
        power: "united_kingdom",
        rules: ["military_occupation"],
        reason: "Occupation britannique du Sud en 1945–1946.",
      },
    ],
    WSM: [
      {
        power: "united_kingdom",
        rules: ["dominion_mandate"],
        reason:
          "Mandat exercé par la Nouvelle-Zélande ; neutralité tripartite de 1889 à 1899.",
      },
    ],
  },
};
