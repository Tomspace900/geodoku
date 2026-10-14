import type { EventEditionsSnapshot } from "./types";

/**
 * Éditions accueillies, par événement — compilation éditoriale, édition par
 * édition, sur les sources que citent les `about.ts` des contraintes `event_*` :
 * [FIFA, Coupe du monde](https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup)
 * et [CIO, Jeux olympiques](https://www.olympics.com/ioc/olympic-games).
 *
 * Conventions (`content/constraints/SOURCES.md#événements-sportifs`) :
 * - une édition compte pour le pays qui contient aujourd'hui la ville hôte
 *   (Moscou 1980 → Russie, Sarajevo 1984 → Bosnie-Herzégovine) ;
 * - une co-organisation compte pour chaque pays hôte ;
 * - seules les éditions tenues comptent : ni les éditions annulées (1916, 1940,
 *   1944), ni les éditions futures déjà attribuées ;
 * - l'année est celle du nom officiel de l'édition ;
 * - seules les éditions reconnues par le CIO et leurs hôtes officiels comptent :
 *   ni les Jeux intercalaires d'Athènes 1906, ni les épreuves délocalisées sans
 *   statut d'hôte (voile d'Anvers 1920 à Amsterdam, équitation de Pékin 2008 à
 *   Hong Kong, surf de Paris 2024 à Tahiti) — tranché le 2026-10-13.
 *
 * Fusionné dans `facts.ts` (`eventEditions`) par `pnpm build:countries`. La liste
 * des pays de chaque contrainte reste celle de `gameplayClassifications` ;
 * `check:content` garde l'accord des deux (`validateEventEditions`).
 */
export const EVENT_EDITIONS: EventEditionsSnapshot = {
  checkedAt: "2026-10-13",
  events: {
    fifa_wc_host: [
      { year: 1930, hosts: ["URY"] },
      { year: 1934, hosts: ["ITA"] },
      { year: 1938, hosts: ["FRA"] },
      { year: 1950, hosts: ["BRA"] },
      { year: 1954, hosts: ["CHE"] },
      { year: 1958, hosts: ["SWE"] },
      { year: 1962, hosts: ["CHL"] },
      { year: 1966, hosts: ["GBR"], note: "Angleterre" },
      { year: 1970, hosts: ["MEX"] },
      { year: 1974, hosts: ["DEU"], note: "Allemagne de l'Ouest" },
      { year: 1978, hosts: ["ARG"] },
      { year: 1982, hosts: ["ESP"] },
      { year: 1986, hosts: ["MEX"] },
      { year: 1990, hosts: ["ITA"] },
      { year: 1994, hosts: ["USA"] },
      { year: 1998, hosts: ["FRA"] },
      { year: 2002, hosts: ["KOR", "JPN"] },
      { year: 2006, hosts: ["DEU"] },
      { year: 2010, hosts: ["ZAF"] },
      { year: 2014, hosts: ["BRA"] },
      { year: 2018, hosts: ["RUS"] },
      { year: 2022, hosts: ["QAT"] },
      { year: 2026, hosts: ["USA", "CAN", "MEX"] },
    ],
    summer_olympics_host: [
      { year: 1896, hosts: ["GRC"] },
      { year: 1900, hosts: ["FRA"] },
      { year: 1904, hosts: ["USA"] },
      { year: 1908, hosts: ["GBR"] },
      { year: 1912, hosts: ["SWE"] },
      { year: 1920, hosts: ["BEL"] },
      { year: 1924, hosts: ["FRA"] },
      { year: 1928, hosts: ["NLD"] },
      { year: 1932, hosts: ["USA"] },
      { year: 1936, hosts: ["DEU"] },
      { year: 1948, hosts: ["GBR"] },
      { year: 1952, hosts: ["FIN"] },
      {
        year: 1956,
        hosts: ["AUS", "SWE"],
        note: "Melbourne ; épreuves équestres à Stockholm, hôte reconnu par le CIO",
      },
      { year: 1960, hosts: ["ITA"] },
      { year: 1964, hosts: ["JPN"] },
      { year: 1968, hosts: ["MEX"] },
      { year: 1972, hosts: ["DEU"], note: "Munich, Allemagne de l'Ouest" },
      { year: 1976, hosts: ["CAN"] },
      { year: 1980, hosts: ["RUS"], note: "Moscou, Union soviétique" },
      { year: 1984, hosts: ["USA"] },
      { year: 1988, hosts: ["KOR"] },
      { year: 1992, hosts: ["ESP"] },
      { year: 1996, hosts: ["USA"] },
      { year: 2000, hosts: ["AUS"] },
      { year: 2004, hosts: ["GRC"] },
      { year: 2008, hosts: ["CHN"] },
      { year: 2012, hosts: ["GBR"] },
      { year: 2016, hosts: ["BRA"] },
      { year: 2020, hosts: ["JPN"], note: "Tokyo 2020, tenus en 2021" },
      { year: 2024, hosts: ["FRA"] },
    ],
    winter_olympics_host: [
      { year: 1924, hosts: ["FRA"] },
      { year: 1928, hosts: ["CHE"] },
      { year: 1932, hosts: ["USA"] },
      { year: 1936, hosts: ["DEU"] },
      { year: 1948, hosts: ["CHE"] },
      { year: 1952, hosts: ["NOR"] },
      { year: 1956, hosts: ["ITA"] },
      { year: 1960, hosts: ["USA"] },
      { year: 1964, hosts: ["AUT"] },
      { year: 1968, hosts: ["FRA"] },
      { year: 1972, hosts: ["JPN"] },
      { year: 1976, hosts: ["AUT"] },
      { year: 1980, hosts: ["USA"] },
      { year: 1984, hosts: ["BIH"], note: "Sarajevo, Yougoslavie" },
      { year: 1988, hosts: ["CAN"] },
      { year: 1992, hosts: ["FRA"] },
      { year: 1994, hosts: ["NOR"] },
      { year: 1998, hosts: ["JPN"] },
      { year: 2002, hosts: ["USA"] },
      { year: 2006, hosts: ["ITA"] },
      { year: 2010, hosts: ["CAN"] },
      { year: 2014, hosts: ["RUS"] },
      { year: 2018, hosts: ["KOR"] },
      { year: 2022, hosts: ["CHN"] },
      { year: 2026, hosts: ["ITA"], note: "Milan-Cortina" },
    ],
  },
};
