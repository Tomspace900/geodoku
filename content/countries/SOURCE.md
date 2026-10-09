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
| `currencies` (codes ISO 4217) | world-countries `currencies`, remplacées pays par pays par `currencyCorrectionsByIso3` (`countryPatches.ts`, motif et date par entrée : FSM, KIR, TUV, CUB, SLE, ZWE, XKX). Invariant `check:content` : liste non vide, code connu de `Intl` avec un nom fr et en sans année. Affichage par `Intl.DisplayNames`, repli sur le code | importé + curé |
| `demonyms` (`fr` / `en`, `m` / `f`) | world-countries `demonyms.fra` / `demonyms.eng`, corrigés par `demonymCorrectionsByIso3` (fautes, accents, majuscule de chaque élément d'un composé ; `XKX` à la main ; anglais corrigé sur le champ *Nationality* du CIA World Factbook, miroir `factbook.json` au commit 8662a8b). On corrige les fautes sans s'aligner sur la CNT. La liste « Pays, territoires et villes du monde » de la CNT (fév. 2025) sert de référence de relecture, sans être une source citée | importé + curé |
| `latitude` | world-countries `latlng[0]` (centroïde) | importé |
| `subregion` | world-countries `subregion` (sous-région ONU) | importé |
| `flagColors` / `flagSymbols` / `flagLayout` | `scripts/countries/flagData.json` (table curée, pas d'heuristique) | curé |
| `events` (`fifa_wc_host`, `summer_olympics_host`, `winter_olympics_host`) | compilation éditoriale édition par édition (`countryPatches.ts`) | curé |
| `memberships` (`eu`, `g20`, `nato`, `commonwealth`, `arab_league`, `asean`, `brics`, `eurozone`, `g7`, `opec`, `schengen`, …) | REST Countries v5, avec deltas datés dans `countryPatches.ts` (`membershipsAdd` / `membershipsRemove`) pour rattraper un changement officiel que la source n'a pas encore intégré | importé + curé |
| `capitals` (`name`, `latitude`, `longitude`, `roles`) | REST Countries v5 — la liste des capitales, non rouverte (choix politique : PSE, TWN) | importé |
| `capitals[].names` (`fr`, `en`) | [Wikidata](https://www.wikidata.org/) (`P36`, `rdfs:label`), récolté par `pnpm harvest:capitals` dans `scripts/countries/data/capitalLabels.ts`, corrigé par des `overrides` motivés (libellé absent, variante d'orthographe, choix politique). La récolte **traduit** la liste REST Countries : elle n'ajoute ni ne retire aucune capitale. État courant de Wikidata, daté par sa date de récolte | importé + curé |
| `highestPoint` (`elevationM`, `names` fr/en ou `null`) | **altitude et nom** : CIA World Factbook, *Elevation › highest point*, miroir `factbook.json` au commit `8662a8b` (celui de `sovereignty.ts`), lus par `pnpm harvest:highest-points` ; **libellés fr/en** : [Wikidata](https://www.wikidata.org/) (`P610`, `rdfs:label`), le sommet étant reconnu par son altitude (±25 m), corrigés par des `overrides` motivés (sommet différent, périmètre territorial, libellé peu parlant, position à la place d'un nom). `names: null` = point sans nom. L'altitude est toujours celle du Factbook. Cohérence : `elevationM >= 5000` ⇔ `peak_over_5000m` (`check:content`) | importé + curé |
| `gdpPerCapitaUsd` (`value`, `year`, ou `null`) | [Banque mondiale, WDI](https://data.worldbank.org/indicator/NY.GDP.PCAP.CD), indicateur `NY.GDP.PCAP.CD` (dollars US courants), récolté par `pnpm harvest:world-bank` dans `scripts/countries/data/worldBankIndicators.ts` : pour chaque pays, l'**année non nulle la plus récente** des cinq années révolues avant la récolte. `null` sans valeur sur la fenêtre (Taïwan et le Vatican, absents de la WDI ; Cuba, Érythrée, Corée du Nord, Soudan du Sud, Yémen, sans valeur récente). La WDI révise ses séries (`sourceUpdatedAt` du dataset) | importé |
| `lifeExpectancyYears` (`value`, `year`, ou `null`) | [Banque mondiale, WDI](https://data.worldbank.org/indicator/SP.DYN.LE00.IN), indicateur `SP.DYN.LE00.IN` (années), même récolte et même règle d'année que `gdpPerCapitaUsd`. `null` pour Taïwan et le Vatican, absents de la WDI | importé |
| `humanDevelopmentIndex` (`value`, `year`, ou `null`) | [PNUD, *Human Development Report* 2025](https://hdr.undp.org/data-center/documentation-and-downloads), fichier « composite indices complete time series » (URL exacte et encodage latin-1 dans `harvest/humanDevelopmentIndexLib.ts`), colonne `hdi_2023`, **dernière année de l'édition**, lue par `pnpm harvest:hdi`. Valeur brute (0 à 1) ; la catégorie (très élevé ≥ 0,800 ; élevé 0,700–0,799 ; moyen 0,550–0,699 ; faible < 0,550, *Technical note 1* du rapport) est **calculée à l'affichage** et confrontée par `check:content` à la catégorie publiée (`hdicode`) pour chaque pays. `null` : Taïwan, Vatican et Kosovo, absents du fichier ; Monaco et la Corée du Nord, présents sans valeur. Aucun repli sur une année plus ancienne | importé |
| `drivingSide` (`left` / `right`) | REST Countries v5 `cars.driving_side` | importé |
| `geoTags` : `middle_east`, `capital_not_largest` | classification éditoriale (`countryPatches.ts`) | curé |
| `geoTags` : `drives_on_left` | copie mécanique de `drivingSide` (REST Countries v5 `cars.driving_side`, `buildCountriesLib.ts`) | importé |
| `regime` (`monarchy` / `republic`) | classification binaire éditoriale, réf. [CIA World Factbook — government type](https://www.cia.gov/the-world-factbook/field/government-type/) | curé |
| `physicalFeatures` (`equator_crosser`, `mediterranean_coast`, `caribbean_coast`, `peak_over_5000m`, `has_desert`, `rainforest`, `atlantic_coast`, `pacific_coast`, `indian_ocean_coast`, `arctic_coast`) | revue éditoriale cartographique / biomes nommés (`countryPatches.ts`) | curé |
| `utcOffsetCount`, `lastVolcanicEruptionYear`, `mountainAreaShare`, `forestCoverShare`, `urbanCentresOver1M`, `productionRanks`, `coalElectricityShare`, `formerSovereigns`, `sovereigntyYear`, `sovereigntyKind`, `sovereigntySheetHidden` (masquage de la ligne de fiche, motif dans `sheetHidden` du dataset), `highestPoint` (voir sa ligne), `sovereigntyDate` (date complète du Factbook, `null` quand la source ne donne que l'année ; son année égale toujours `sovereigntyYear`), `gdpPerCapitaUsd`, `lifeExpectancyYears` et `humanDevelopmentIndex` (voir leurs lignes) | datasets datés+sourcés de `scripts/countries/data/`, fusionnés en scalaires par `build-countries` (`quantitativeFactsForCode`) — IANA tz, Smithsonian GVP, ODD 15.4.2 (FAO/UNEP-WCMC), FAO FRA, GHSL UCDB, FAOSTAT, U.S. EIA, Ember, CIA World Factbook (*Independence*) | curé |

Deux dérivations lisent un `geoTags` plutôt que le champ dédié. Seul
`subregion_middle_east` lit un tag **curé** (`middle_east`, pas `subregion`) : le tag
encode la convention jouable, le champ importé la donnée brute.
`society_drives_on_left` lit `drives_on_left`, qui n'est **pas** une convention : le
tag est copié de `drivingSide`, donc de REST Countries.

Les **faits quantitatifs dérivés** (`utcOffsetCount`, `lastVolcanicEruptionYear`,
`mountainAreaShare`, `forestCoverShare`, `urbanCentresOver1M`, `productionRanks`,
`coalElectricityShare`) proviennent des datasets de `scripts/countries/data/` :
des snapshots datés et sourcés, révisés à la main selon leur en-tête, au même
titre que `flagData.json`. `build-countries` les réduit à un scalaire par pays
(`quantitativeFactsForCode`) : les parts sont ramenées en fraction 0–1,
`productionRanks` ne garde que les rangs ≤ 15, et une source qui ne couvre pas un
pays donne `null` (ou une clé absente) — **jamais 0** (`SOURCES.md`). La fusion
est déterministe et hors-ligne ; seul le rafraîchissement population/popularité de
`build-countries` demande le réseau.

Ce tableau documente la provenance **narrative** (origine, curation) des
champs de `facts.ts`. Depuis le lot 2, [`countries/factProvenance.ts`](factProvenance.ts)
en porte la contrepartie **structurée par ligne de fiche** (`FACT_PROVENANCE`,
`basis: "source"/"convention"` + `SourceId[]` de [`../sources.ts`](../sources.ts)) —
pas par champ : un champ composite comme `physicalFeatures` se décompose en
plusieurs lignes affichées (façades, équateur, milieux, sommet), chacune avec
sa propre source, et `productionRanks` a une provenance **par produit**
(`PRODUCTION_PROVENANCE`) plutôt qu'une liste de sources en bloc. C'est cette
contrepartie qu'affiche la fiche pays (`buildCountrySheet`), en pied de chaque
catégorie et en légende discrète sur chaque ligne de convention. Un champ
ajouté ou reclassé (« importé » ↔ « curé ») ici doit recevoir la même mise à
jour dans `factProvenance.ts` (sur la ou les lignes qui en dérivent) : les
deux dérivent de la même décision éditoriale, mais rien ne les garde
synchronisés automatiquement.

Les **faits de souveraineté** (`formerSovereigns`, `sovereigntyYear`,
`sovereigntyKind`) sont issus du même dataset (`scripts/countries/data/sovereignty.ts`,
CIA World Factbook — champ *Independence*) mais **repris tels quels** de
l'événement retenu, sans transformation : `formerSovereigns` est une liste de
slugs (`"france"`, `"soviet_union"`, … — pas des ISO3), `sovereigntyYear` l'année
brute, `sovereigntyKind` la nature de l'événement. Un pays non couvert donne
`[]` / `null` (`SOURCES.md`).

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
