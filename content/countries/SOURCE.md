# Snapshot pays — provenance

Le dossier `content/countries/` est un **snapshot généré, committé et daté**.
`pnpm build:countries` (réseau) le réécrit en entier, puis enchaîne
`pnpm build:answers`. Le millésime vit dans `FACTS_SNAPSHOT.date`
(`facts.ts`) — **pas ici**.

Trois fichiers, trois rôles :

- `catalog.ts` — identité joueur (ISO2/ISO3, noms `fr`/`en`, alias de recherche,
  emoji drapeau). C'est ce que charge le bundle joueur.
- `countryCodes.ts` — les 197 codes jouables + le type `CountryCode` + le garde
  `isCountryCode`.
- `facts.ts` — les faits gameplay par pays (`COUNTRY_FACTS`), consommés
  **hors bundle** par les dérivations (`content/constraints/derivations.ts`).
- `popularity.ts` — snapshot Wikipédia daté (percentiles de pageviews), utilisé
  seulement par l'analyse de difficulté admin.

## Identité (`catalog.ts`, `countryCodes.ts`)

| Donnée | Source | Statut |
| --- | --- | --- |
| Liste jouable, `region`/`subregion` bruts | [world-countries](https://github.com/mledoze/countries) (npm) | importé |
| Noms `fr` / `en` | world-countries (`translations.fra`, `name.common`) | importé |
| ISO2 / ISO3 | world-countries + [REST Countries v5](https://restcountries.com/) | importé |
| Alias de recherche | `scripts/countries/countryPatches.ts` (`searchAliasesByIso3`) | curé |
| Emoji drapeau | world-countries | importé |
| Exceptions éditoriales (Kosovo `XKX`, ajouts manuels) | `countryPatches.ts` (`manualCountryAdditions`) | curé |

## Faits gameplay (`facts.ts` → `COUNTRY_FACTS`)

Documenté **par famille de champs** de `CountryFacts` (voir
`content/countries/type.ts`). « importé » = repris tel quel d'une source ;
« curé » = décidé dans `countryPatches.ts` / `flagData.json`.

| Champ(s) | Source | Statut |
| --- | --- | --- |
| `continent` | world-countries `region`/`subregion` alignés ONU M49, + arbitrages transcontinentaux (`countryPatches.ts`) | importé + curé |
| `waterAccess` (`landlocked` / `coastal` / `island`) | world-countries `landlocked` + décompte de frontières, + arbitrages île/continent (`sourceCorrectionsByIso3`) | importé + curé |
| `borders` | world-countries + REST Countries v5 `borders`, corrigés par `countryPatches.ts` | importé + curé |
| `areaKm2` | world-countries `area` | importé |
| `population` | REST Countries v5 | importé |
| `officialLanguages` | world-countries `languages` (ISO 639-1, repli 639-3) | importé |
| `latitude` | world-countries `latlng[0]` (centroïde) | importé |
| `subregion` | world-countries `subregion` (sous-région ONU) | importé |
| `flagColors` / `flagSymbols` / `flagLayout` | `scripts/countries/flagData.json` (table curée, pas d'heuristique) | curé |
| `events` (`fifa_wc_host`, `summer_olympics_host`, `winter_olympics_host`) | compilation éditoriale édition par édition (`countryPatches.ts`) | curé |
| `memberships` (`eu`, `g20`, `nato`, `commonwealth`, `arab_league`, `asean`, `brics`, `eurozone`, `g7`, `opec`, `schengen`, …) | REST Countries v5, avec deltas datés dans `countryPatches.ts` (`membershipsAdd` / `membershipsRemove`) pour rattraper un changement officiel que la source n'a pas encore intégré | importé + curé |
| `capitals` (`name`, `latitude`, `longitude`, `roles`) | REST Countries v5 | importé |
| `drivingSide` (`left` / `right`) | REST Countries v5 `car.side` | importé |
| `geoTags` (`middle_east`, `drives_on_left`, `capital_not_largest`, …) | classification éditoriale (`countryPatches.ts`) | curé |
| `regime` (`monarchy` / `republic`) | classification binaire éditoriale, réf. [CIA World Factbook — government type](https://www.cia.gov/the-world-factbook/field/government-type/) | curé |
| `physicalFeatures` (`equator_crosser`, `mediterranean_coast`, `caribbean_coast`, `peak_over_5000m`, `has_desert`, `rainforest`, `atlantic_coast`, `pacific_coast`, `indian_ocean_coast`, `arctic_coast`) | revue éditoriale cartographique / biomes nommés (`countryPatches.ts`) | curé |
| `utcOffsetCount`, `hasHoloceneVolcano`, `mountainAreaShare`, `forestCoverShare`, `urbanCentresOver1M` | datasets datés+sourcés de `scripts/countries/data/`, fusionnés en scalaires par `build-countries` (`quantitativeFactsForCode`) — IANA tz, Smithsonian GVP, ODD 15.4.2 (FAO/UNEP-WCMC), FAO FRA, GHSL UCDB | curé |

Plusieurs dérivations lisent un `geoTags` curé plutôt que le champ dédié
(`society_drives_on_left` lit `geoTags`, pas `drivingSide` ; `subregion_middle_east`
lit `geoTags`, pas `subregion`) — c'est voulu : le tag encode la convention
jouable, le champ importé encode la donnée brute.

Les **faits quantitatifs dérivés** (`utcOffsetCount`, `hasHoloceneVolcano`,
`mountainAreaShare`, `forestCoverShare`, `urbanCentresOver1M`) proviennent des
datasets de `scripts/countries/data/` : des snapshots datés et sourcés, révisés à
la main selon leur en-tête, au même titre que `flagData.json`. `build-countries`
les réduit à un scalaire par pays (`quantitativeFactsForCode`) : les parts sont
ramenées en fraction 0–1, et une source qui ne couvre pas un pays donne `null` —
**jamais 0** (`SOURCES.md`). La fusion est déterministe et hors-ligne ; seul le
rafraîchissement population/popularité de `build-countries` demande le réseau.

## Popularité (`popularity.ts`)

Snapshot [Wikimedia Pageviews](https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews)
(EN, `all-access`, 12 mois glissants) converti en percentile `[0, 1]` par pays.
Conserve la période de mesure, la date de collecte, la version d'algorithme et le
percentile de repli nécessaires à sa reproduction. N'influe **que** sur
l'analyse de difficulté admin, jamais sur le jeu.

## Références partagées

Les références externes détaillées (ONU M49, World Bank, IHO S-23, Natural Earth,
listes d'organisations…) sont dans
[`../constraints/SOURCES.md`](../constraints/SOURCES.md).
