# P3 — Les 26 nouvelles contraintes (refacto contenu)

> Plan d'exécution autonome, suite de [`content-refactor-p2.md`](content-refactor-p2.md).
> Les décisions d'architecture sont **actées** (P1/P2), ne pas les rediscuter.
> **Gates utilisateur** : chaque lot se termine par un dossier de validation —
> l'exécutant prépare, l'utilisateur tranche (inclusion/exclusion, cas limites).
> Ne jamais merger un lot sans ce feu vert.

## 0. Contexte

La branche `constraint-explorer` (commit `221b42d`, juillet) contient **26
contraintes inédites**, chacune avec sa liste ISO3 curée et son `SOURCE.md`
daté, plus les **datasets de faits** qui les justifient
(`git show 221b42d:content/facts/…` : productions FAOSTAT, énergie EIA,
fuseaux horaires, volcans Smithsonian GVP, montagne/forêt FAO, souveraineté,
centres urbains GHSL, adhésions politiques). P3 les intègre au modèle P1 :
**nouveaux champs de faits dans le snapshot → dérivations → listes générées**.
Aucune liste manuelle active — les listes v1 servent de **contre-épreuve**, pas
de source.

Ce que P3 change pour le joueur : de nouvelles contraintes apparaissent
progressivement dans les grilles (la garde cold-start
`MAX_NEW_CONSTRAINTS_PER_GRID = 1` limite à un « newcomer » par grille — le
déploiement par lots est doublement lissé). Rien d'autre ne bouge.

Hors périmètre P3 : fiches pays (P4) ; toute retouche des 60 contraintes
existantes ; le `content/facts/country-core`, `development` et
`flag-classifications` de la v1 (redondants avec notre snapshot actuel).

## 1. Modèle cible

Chaque famille nouvelle suit le schéma P1 :

```
ENTRÉE DE CURATION (nouvelle, versionnée)          NOUVEAU CHAMP CountryFacts
  scripts/countries/data/<domaine>.ts      ──►      (fusionné par build:countries)
  (dataset daté+sourcé, moissonné de la v1)              │  build:answers
                                                          ▼
                                                   answers.ts générés
```

- Les datasets v1 (`content/facts/<domaine>/data.ts`) deviennent des **entrées
  de curation** au même titre que `flagData.json` : versionnés, datés, révisés
  à la main selon leur `SOURCE.md`, consommés par `build-countries` qui les
  fusionne dans `content/countries/facts.ts`. Emplacement :
  `scripts/countries/data/` (à créer), un fichier par domaine, types dans un
  `types.ts` voisin (reprendre les types v1 : `AgriculturalProductionSnapshot`,
  `CivilTimeOffsetsSnapshot`, etc. — `git show 221b42d:content/facts/type.ts`).
- **La fusion est déterministe et hors-ligne** : intégrer un dataset ne demande
  pas le réseau. Mais `build:countries` reste le seul chemin d'écriture de
  `facts.ts` — donc chaque lot exécute une regen complète (réseau). Le diff des
  **60 listes existantes doit rester vide** à chaque lot (hors éventuel
  rafraîchissement population → dans ce cas, l'isoler dans le dossier de
  validation, ne pas le mélanger aux nouveautés).
- `CountryFacts` gagne des champs **optionnels ou à défaut explicite** ; une
  valeur absente n'est jamais assimilée à zéro (`SOURCES.md`).

## 2. Les quatre lots

Chaque lot = une branche locale `content-p3-lot<N>` depuis `develop`, mergée
après le gate. Ordre choisi du moins risqué au plus riche.

### Lot 1 — Extensions du modèle existant (8 contraintes, aucun nouveau dataset)

| Contrainte | Dérivation | Catégorie |
| --- | --- | --- |
| `political_arab_league`, `political_asean`, `political_brics`, `political_eurozone`, `political_g7`, `political_opec`, `political_schengen` | `memberships` contient le groupe — **les champs existent déjà** dans le snapshot (REST Countries) | `political` |
| `event_winter_olympics_host` | `events` contient `winter_olympics_host` — nouvelle valeur de `CountryEvent` + curation des hôtes dans `countryPatches.ts` (source : dataset v1 `hosted-events`) | `event` |

Contre-épreuve critique : dériver, puis comparer aux listes v1
(`git show 221b42d:content/constraints/<id>/answers.ts`). Attendu : quasi-égalité
pour les 7 politiques (memberships REST vs curation v1 — tout écart au dossier).

> **`ocean_multiple_basins` déplacé au Lot 2** (arbitrage utilisateur, 2026-08-28).
> Notre snapshot n'a pas de façade `arctic_coast` et sépare
> `mediterranean_coast` / `caribbean_coast` de `atlantic_coast` : la lecture
> « ≥ 2 façades » naïve divergerait de ~40 % de la liste v1 (18 pays). La
> correction propre — repli des mers marginales dans les bassins **+ nouvelle
> façade `arctic_coast` curée** — touche `PhysicalFeature` et relève du lot
> « géographie physique ».

### Lot 2 — Temps et géographie physique (7 contraintes)

| Contrainte | Nouveau champ facts | Dataset v1 |
| --- | --- | --- |
| `time_zones_multiple` (≥ 2), `time_zones_min_3` (≥ 3) | `utcOffsetCount: number` | `civil-time-offsets` |
| `nature_holocene_volcano` | `hasHoloceneVolcano: boolean` | `holocene-volcanoes` |
| `nature_mountain_area_majority` | `mountainAreaShare: number \| null` | `mountain-area` |
| `forest_cover_majority` | `forestCoverShare: number \| null` | à reconstituer depuis la liste v1 + FAO (la v1 n'a pas de dataset dédié — le créer, 197 valeurs FAO, en documentant le millésime) | — |
| `urban_centres_min_3_over_1m` | `urbanCentresOver1M: number` | `urban-centres` |
| `ocean_multiple_basins` | nouvelle façade `arctic_coast` dans `PhysicalFeature` (curée `countryPatches.ts`) ; dérivation : ≥ 2 bassins parmi Atlantique / Pacifique / Indien / Arctique, avec `mediterranean_coast` + `caribbean_coast` repliées sur l'Atlantique | `ocean` |

Catégories : `nature` (volcan, montagne, forêt) ; nouvelles `time_zones` et
rattachement de `urban_centres…` à `society` (pas de catégorie mono-contrainte) ;
`ocean` (déjà existante).

### Lot 3 — Production et énergie (7 contraintes)

| Contrainte | Nouveau champ facts | Dataset v1 |
| --- | --- | --- |
| `production_{cocoa,coffee,rice,wheat}_top10` | `productionRanks: Partial<Record<Product, number>>` | `agricultural-production` (moyenne 2022-2024, FAOSTAT) |
| `production_{crude_oil,natural_gas}_top15` | idem (`crude_oil`, `natural_gas`) | `energy-production` (EIA) |
| `energy_coal_electricity_majority` | `coalElectricityShare: number \| null` | `coal-electricity` |

Nouvelles catégories : `production` (agricoles) et `energy` (pétrole, gaz,
charbon). Dérivation : `rank <= 10` / `<= 15` / `share > 0.5`.

### Lot 4 — Histoire (3 contraintes)

| Contrainte | Nouveau champ facts | Dataset v1 |
| --- | --- | --- |
| `history_from_france`, `history_from_united_kingdom` | `formerSovereigns: string[]` (codes de l'« ancienne puissance ») | `sovereignty` |
| `history_sovereignty_since_1990` | `sovereigntyYear: number \| null` | `sovereignty` |

Nouvelle catégorie `history`. Sensible éditorialement (dossier de validation
soigné : cas graduels, définition « événement de souveraineté » du SOURCE.md v1).

## 3. Procédure par lot (identique pour les quatre)

1. **Moisson** : datasets v1 → `scripts/countries/data/` (+ types) ; `SOURCE.md`
   v1 des contraintes du lot → `content/constraints/<id>/SOURCE.md`, avec la
   **même adaptation qu'en P2** (les SOURCE.md v1 portent la thèse
   « answers.ts est la source de vérité » : la retirer, ajouter la section
   « Dérivation », conserver définition et cas limites, frontmatter intact).
   Un `SOURCE.md` par nouveau dataset dans `scripts/countries/data/` n'est pas
   requis : la provenance vit dans `content/countries/SOURCE.md` (nouvelle
   famille de champs) et dans les SOURCE.md des contraintes.
2. **Snapshot** : étendre `CountryFacts` (`content/countries/type.ts`),
   `build-countries` fusionne le dataset, `validateCountryFacts` gagne les
   invariants nouveaux (bornes, couverture attendue). Lancer la regen (réseau),
   vérifier : diff des 60 listes existantes **vide** (ou populations isolées).
3. **Contraintes** : entrées `CONSTRAINTS` (+ nouvelles valeurs
   `ConstraintCategory` le cas échéant), dérivations dans `derivations.ts`,
   labels **fr + en** moissonnés de la v1
   (`git show 221b42d:src/i18n/locales/{fr,en}.ts`), `pnpm build:answers`.
4. **Contre-épreuve** : listes dérivées vs listes v1, écart par écart.
5. **Gardes** : `EXPECTED_ACTIVE_COUNT` dans `check-content.ts` (60 → 68 → 75
   puis **69** → **76** → **79** ; lot 2 ajoute 7 nouvelles contraintes mais en
   met 6 en réserve — arbitrage 2026-08-30, cf. journal), test `translate`,
   bascules de seuil dans `derivations.test.ts`
   (au moins une par nouveau champ), `pnpm lint && pnpm test && pnpm
   check:content`.
6. **Pool** : `pnpm simulate:scheduling` — doit rester PASS. Si la couverture
   pool (`constraintCoverage === 1`) coince avec le catalogue élargi, ajuster
   les tunables (`gridConstants.ts`) **par la boucle de calibration documentée**
   (`docs/content-pipeline.md` §Tunables), jamais à l'aveugle.
7. **GATE utilisateur** : dossier de validation — pour chaque contrainte du
   lot : label fr/en, liste dérivée (avec taille), écarts vs v1 et leur
   explication, cas limites notables, recommandation inclure/exclure/ajourner.
   L'utilisateur peut exclure une contrainte (elle reste en réserve, rien n'est
   perdu) — dans ce cas la retirer de `CONSTRAINTS`/dérivations/i18n avant
   merge, le dataset peut rester.
8. **Merge + déploiement** : merge dans `develop` (local), puis après push :
   `refreshPool` via `/admin`. Pas de fenêtre de désync pour des contraintes
   **nouvelles** (aucune grille existante ne les référence) — seule une regen
   qui aurait bougé des listes existantes en créerait une (cf. P2).

## 4. Pièges connus

- **Ne pas importer les listes v1 comme vérité** : elles valident, elles ne
  sourcent pas. Tout écart se comprend et se documente, jamais ne se recopie.
- Les `SOURCE.md` v1 ont le même défaut de thèse que ceux de la v2 en P2 —
  même traitement.
- `simulate-players` / e2e : rien à changer (ils lisent le pool réel).
- Petites listes (`political_g7` = 7) : le générateur filtre par
  `MIN_CELL_SIZE = 3` à l'intersection — une contrainte étroite se marie
  rarement, c'est attendu ; ne pas « élargir » une liste pour la faire jouer.
- Les 26 ids sont déjà **absents** de `ConstraintId` actuel : l'ajout est
  purement additif, aucune migration. Vérifier qu'aucun id ne collisionne avec
  les 11 archivées (aucun a priori).
- Bundle : les nouvelles listes partent au navigateur (~2-3 KiB gzip au total
  estimé) — `check:bundle` doit rester loin des 280 KiB.
- Commits : conventions habituelles (signés, `--no-gpg-sign` en repli ioctl,
  français, pas de Co-Authored-By).
- **Après le lot 4** : la branche `constraint-explorer` est entièrement
  moissonnée → la taguer `archive/constraint-explorer` puis la supprimer
  (dernier gate utilisateur). Mettre à jour `AGENTS.md` §1/§3 si le nombre de
  contraintes y est cité, et le `/changelog` joueur (les nouvelles contraintes
  sont un changement visible — première entrée changelog du refacto).
- **Compteurs cités dans la doc** : `docs/content-pipeline.md` cite le nombre
  d'actives et de catégories à **quatre** endroits (schéma, §Contraintes,
  §Contrôles ×2). Ils ont dérivé silencieusement pendant les lots 1-3 (corrigé
  en revue le 2026-09-09 : 76 actives / 21 catégories / 6 en réserve). Les
  remettre à jour à la fin du lot 4 (**79 actives**), en même temps
  qu'`AGENTS.md`.

## 5. Journal d'exécution

> À remplir par lot : sortie de la contre-épreuve vs v1, dossier de gate et
> décisions utilisateur, résultat simulate/checklist, date de merge.

### Lot 1 — branche `content-p3-lot1` (2026-08-28)

**Périmètre livré : 8 contraintes** (7 politiques + `event_winter_olympics_host`).
`ocean_multiple_basins` déplacé au Lot 2 (arbitrage utilisateur — cf. §2, encart
Lot 1). `EXPECTED_ACTIVE_COUNT` 60 → 68.

**Snapshot.** `pnpm build:countries` (réseau, 12 min) + `pnpm biome check --write
content/`. Diff `content/countries/` : **uniquement** `facts.ts`, +13 tableaux
`events` recevant `winter_olympics_host` (= le bucket curé). Zéro dérive
population/superficie/densité ; `catalog.ts`, `popularity.ts` et les 60
`answers.ts` existants **inchangés**. `build:answers` : 68 contraintes actives,
1784 entrées ISO3.

**Contre-épreuve vs v1 (`221b42d`).** 5/8 identiques
(`political_arab_league` 22, `political_eurozone` 21, `political_g7` 7,
`political_schengen` 29, `event_winter_olympics_host` 13). 3 écarts, tous =
REST Countries v5 en retard sur un changement 2025-2026 daté :

| id | dérivé | v1 | écart | cause |
| --- | --- | --- | --- | --- |
| `political_asean` | 10 | 11 | −TLS | Timor-Leste admis oct. 2025, pas encore dans REST v5 |
| `political_brics` | 9 | 10 | −IDN | Indonésie membre plein depuis jan. 2025, pas encore dans REST v5 |
| `political_opec` | 12 | 11 | +ARE | Émirats sortis de l'OPEP mai 2026, encore listés dans REST v5 |

**Gate utilisateur (2026-08-28).** Feu vert sous condition : corriger les 3 listes
avant merge via un **seam de deltas d'adhésion**, pas un override du tableau.

- `SourceCorrection` (`buildCountriesLib.ts`) gagne `membershipsAdd?` /
  `membershipsRemove?: PoliticalGroup[]`, appliqués dans `applySourceCorrections`
  **après** la lecture REST, avec déduplication. Idempotents : add d'un groupe
  présent = no-op, remove d'un groupe absent = no-op. Auto-résorbants quand REST
  v5 rattrapera.
- `countryPatches.ts` : `TLS → membershipsAdd ["asean"]` (26 oct. 2025),
  `IDN → membershipsAdd ["brics"]` (6 jan. 2025), `ARE → membershipsRemove
  ["opec"]` (1ᵉʳ mai 2026). Chaque delta commenté « à retirer quand REST v5
  est à jour ».
- 3 `SOURCE.md` mis à jour (cas limites → le delta), `content/countries/SOURCE.md`
  ligne `memberships` corrigée (la mention « compléments countryPatches » était
  fausse, elle devient exacte avec ce seam).
- Tests : `applySourceCorrections` — add idempotent, remove absent = no-op,
  memberships intactes sans delta.

**Checklist (avant deltas).** `pnpm lint` ✓ (2 warnings préexistants hors
périmètre dans `convex/gameWrites.test.ts`) · `pnpm test` 514/514 ✓ ·
`pnpm check:content` « 68 actives, 11 archivées, 197 pays » ✓ · `pnpm
check:bundle` 244.9 KiB gzip (budget 280) ✓ · `pnpm simulate:scheduling`
**14/14 PASS**, `constraint coverage 100 %`, `failed seeds 0/68`, overlap
générateur max 0.846 < 0.85 (les groupes politiques tendent l'overlap vers le
plafond sans le franchir).

**Checklist (après deltas).** Regen #2 (2026-08-29). Diff `facts.ts` : les 3
deltas d'adhésion (`ARE` −opec, `IDN` +brics, `TLS` +asean) ; **isolé** — le
millésime a roulé (08-28 → 08-29) et REST a rafraîchi la population de 8 pays
(AZE, JPN, MAR, MEX, MLI, POL, ROU, TUN, écarts < 3 %), **aucun impact sur une
liste** (`check:content` re-dérive les 68 sans mouvement hors asean/brics/opec).
`popularity.ts` : dates seules, tiers identiques. Listes finales :
`political_asean` 11 (+TLS), `political_brics` 10 (+IDN), `political_opec` 11
(−ARE) — **alignées sur la v1**. `pnpm lint` ✓ · `pnpm test` 518/518 ✓ ·
`pnpm check:content` ✓ · `pnpm check:bundle` 244.8 KiB ✓ ·
`pnpm simulate:scheduling` 14/14 PASS, couverture 100 %.

**Merge.** _(prêt — merge `content-p3-lot1` → `develop` puis `refreshPool` via
`/admin` après push)_

### Lot 2 — branche `content-p3-lot2` (2026-08-29 → 30)

**Périmètre livré : 7 contraintes dérivées puis 6 mises en réserve → +1 nette au
jeu actif.** Les 7 : `time_zones_multiple`, `time_zones_min_3`,
`nature_holocene_volcano`, `nature_mountain_area_majority`, `forest_cover_majority`,
`urban_centres_min_3_over_1m`, `ocean_multiple_basins`. `EXPECTED_ACTIVE_COUNT`
68 → 75 (dérivation) **puis → 69** (retrait des 6 réserve, cf. gate 2026-08-30).
Nouvelle catégorie `time_zones` ; `urban_centres…` rattaché à `society`.

**Datasets (`scripts/countries/data/`, nouveau dossier).** 5 fichiers + `types.ts` :
`civilTimeOffsets`, `holoceneVolcanoes`, `mountainArea`, `urbanCentres` portés
verbatim des snapshots `constraint-explorer` (221b42d) ; `forestCover` reconstitué
à partir du champ `forestCoverPercent` de `country-core` v1 (197 valeurs FAO,
millésime 2023, couverture complète). `build-countries` les réduit à 5 scalaires
par pays (`quantitativeFactsForCode`, testé) : `utcOffsetCount`,
`hasHoloceneVolcano`, `mountainAreaShare`/`forestCoverShare` (fractions 0–1, `null`
si non couvert), `urbanCentresOver1M`. Nouvelle façade `PhysicalFeature`
`arctic_coast`, curée dans `countryPatches.ts` (CAN, NOR, RUS, USA — repris du
champ `oceanBasins` de country-core v1).

**`ocean_multiple_basins`.** Dérivation = ≥ 2 bassins parmi Atlantique / Pacifique
/ Indien / Arctique, avec `mediterranean_coast` + `caribbean_coast` repliés sur
l'Atlantique et `arctic_coast` lu. `oceanBasinCount()` dans `derivations.ts`.

**Snapshot.** `pnpm build:countries` (réseau, 3 min, 197/197 pageviews, 0 échec)
+ `pnpm biome check --write content/`. Diff `content/countries/` : **uniquement**
`facts.ts` (+5 champs × 197, +`arctic_coast` sur 4 pays) et `type.ts`. Zéro dérive
population / superficie / latitude / memberships ; millésime inchangé (08-29 =
regen #2 du lot 1) ; `catalog.ts`, `popularity.ts` et les **68 `answers.ts`
existants inchangés**. `build:answers` : 75 contraintes actives, 2023 entrées ISO3.

**Contre-épreuve vs v1 (`221b42d`).** **7/7 listes byte-identiques** — aucun écart.

| id | dérivé | v1 | statut |
| --- | --- | --- | --- |
| `time_zones_multiple` | 19 | 19 | identique |
| `time_zones_min_3` | 8 | 8 | identique — puis **mise en réserve** au gate (v1 la classait déjà `archived`) |
| `nature_holocene_volcano` | 76 | 76 | identique |
| `nature_mountain_area_majority` | 34 | 34 | identique |
| `forest_cover_majority` | 47 | 47 | identique |
| `urban_centres_min_3_over_1m` | 36 | 36 | identique |
| `ocean_multiple_basins` | 18 | 18 | identique (le repli Méditerranée/Caraïbes + `arctic_coast` reproduit exactement la liste v1) |

**Cas limites relevés (dossier de gate).**

- `nature_mountain_area_majority` : la source (ODD 15.4.2) ne couvre pas 8 pays
  (ARG, CAN, DEU, ISR, NOR, TUR, TWN, XKX) → `null`, hors liste. La **Norvège**
  est le seul cas discutable (relief marqué). v1 faisait le même choix.
  Juste sous le seuil : PER 49,4 %, ETH/HTI 49,9 % ; juste au-dessus : NZL/DJI 50,7 %.
- `forest_cover_majority` : **Russie 49,8 %** rate le seuil d'un cheveu (hors liste,
  comme en v1) ; TZA 50,1 % passe. AUT 47,2 %, PRK 49,6 % dessous.
- `time_zones_min_3` : liste étroite (8), et surtout jugée répétitive → **mise en
  réserve** au gate (cf. plus bas).
- `ocean_multiple_basins` : `arctic_coast` restreint à 4 États ; donne son 2ᵉ bassin
  à la Norvège (Atl+Arctique) et à la Russie (Pac+Arctique). France multi-bassins
  par l'outre-mer (Guyane / Réunion / Polynésie).

**Checklist (dérivation, avant retrait).** `pnpm lint` ✓ · `pnpm test` 527/527 ✓ ·
`pnpm check:content` « 75 actives » ✓ · `pnpm check:bundle` 245,6 KiB ✓ ·
`pnpm simulate:scheduling` **14/14 PASS**, couverture 100 %, failed seeds 0/75.

**Gate utilisateur (2026-08-30).** Feu vert **sous condition** : les 7 dérivations
sont correctes (7/7 identiques v1), mais 6 des contraintes concernées sont jugées
**pas assez fun / trop répétitives** — jugement de gameplay confirmé. Sortent du
jeu actif avant merge :

- **5 politiques activées au lot 1** : `political_asean`, `political_brics`,
  `political_eurozone`, `political_g7`, `political_schengen` (elles étaient
  `archived` dans la v1 de juillet — statut confirmé) ;
- **`time_zones_min_3`** du lot 2 (idem, `archived` en v1).

`political_arab_league` et `political_opec` **restent actives** (elles l'étaient
en v1). `time_zones_multiple` et les 4 autres nouveautés du lot 2 restent actives.

**Mise en réserve (seam `RESERVE_CONSTRAINT_IDS`).** Nouvelle liste dans
`content/constraints/index.ts`, **hors** de `ConstraintId` — un id de réserve dans
une grille échoue bruyamment. Retrait de `CONSTRAINTS`, `derivations.ts`, du
registre `ANSWER_SETS` et des clés i18n fr+en ; `answers.ts` supprimés. Les 6
dossiers ne gardent que leur `SOURCE.md` (`status: archived` + section « En
réserve » : motif, date, procédure de réactivation). `check-content.ts` gagne
`RESERVE_CONSTRAINT_IDS` + `EXPECTED_RESERVE_COUNT` : présence du SOURCE.md,
`status` archived, **absence** d'`answers.ts`, aucun chevauchement avec
actif/archivé. `EXPECTED_ACTIVE_COUNT` → **69**.

Les deltas memberships TLS/IDN/ARE de `countryPatches.ts` sont **conservés** : les
faits restent vrais indépendamment des contraintes qui les lisent (fiches pays P4).
Aucune regen : le retrait ne touche que dérivations + registre + i18n, pas le
snapshot.

**Grilles staging.** Au 30/08, aucune grille **servie** n'avait utilisé l'une des
6 : vérifié sur le dump local (155 grilles, 2026-03-30 → 2026-08-31, 0 occurrence
de `rows`/`cols` réservée) et confirmé côté develop par l'utilisateur (les 5
politiques n'étaient mergées sur develop que depuis le 28/08 ; `time_zones_min_3`
n'a jamais quitté cette branche). Les grilles **futures** du pool qui les
référencent sont invalidées par `getGridContentIssue` (retour `"constraint"` dès
qu'un id n'est plus dans `CONSTRAINTS`) et remplacées par le `refreshPool`
post-push — chemin prévu.

**Checklist (après retrait).** `pnpm lint` ✓ (2 warnings préexistants,
`convex/**/*.test.ts`) · `pnpm test` **525/525** ✓ (−2 tests de dérivation des
contraintes réservées) · `pnpm check:content` « **69 actives, 11 archivées,
6 en réserve, 197 pays** » ✓ · `pnpm check:bundle` **245,3 KiB** gzip (budget 280) ✓ ·
`pnpm simulate:scheduling` **14/14 PASS**, couverture **100 % sur 69**, failed
seeds 0/69, overlap max 0,846 < 0,85, cold-start 18/18 tissés ≤ 1 newcomer/grille.

**Contrainte finale au jeu actif : 69** (`time_zones_multiple`,
`nature_holocene_volcano`, `nature_mountain_area_majority`, `forest_cover_majority`,
`urban_centres_min_3_over_1m`, `ocean_multiple_basins` + les 63 antérieures).

**Merge.** _(prêt — merge `content-p3-lot2` → `develop` puis `refreshPool` via
`/admin` après push)_

### Lot 3 — branche `content-p3-lot3` (2026-09-08)

**Périmètre dérivé : 7 contraintes** — `production_{cocoa,coffee,rice,wheat}_top10`
(catégorie `production`), `production_{crude_oil,natural_gas}_top15` +
`energy_coal_electricity_majority` (catégorie `energy`). Deux nouvelles catégories
`ConstraintCategory`. `EXPECTED_ACTIVE_COUNT` 69 → **76** (sous réserve du gate).

**Champs de faits.** `CountryFacts` gagne `productionRanks:
Partial<Record<ProductionRankKey, number>>` (rang mondial du pays par produit,
conservé si ≤ 15) et `coalElectricityShare: number | null` (fraction 0–1, `null`
si Ember ne couvre pas le pays). Fusionnés par `quantitativeFactsForCode`
(`buildCountriesLib.ts`) depuis 3 datasets curés (`scripts/countries/data/` :
`agriculturalProduction.ts` FAOSTAT top 10, `energyProduction.ts` EIA top 18
trimé de la longue traîne, `coalElectricity.ts` Ember). `ProductionRankKey` vit
dans `content/countries/type.ts` (terminal), réexporté par `data/types.ts`.

**Snapshot.** `pnpm build:countries` (réseau, 18 min, 197/197 pageviews, 0 échec)
+ `pnpm biome check --write`. Diff `content/countries/` : `facts.ts` (+2 champs ×
197, `type.ts`), `SOURCE.md`. **Dérive de millésime isolée** (regen 08-29 →
09-08) : `facts.ts` rafraîchit 10 populations (< 1,5 %), `popularity.ts`
re-télécharge les pageviews (percentiles bougent de ~1-2 pts, aucun tier
franchi). `catalog.ts` inchangé. `check:content` re-dérive les **76** sans
mouvement hors des 7 nouvelles → **aucune liste existante déplacée**.
`build:answers` : 76 actives, 2022 entrées ISO3.

**Contre-épreuve vs v1 (`221b42d`). 7/7 listes byte-identiques**, aucun écart.

| id | dérivé | v1 | statut |
| --- | --- | --- | --- |
| `production_cocoa_top10` | 10 | 10 | identique |
| `production_coffee_top10` | 10 | 10 | identique |
| `production_rice_top10` | 10 | 10 | identique |
| `production_wheat_top10` | 10 | 10 | identique |
| `production_crude_oil_top15` | 15 | 15 | identique |
| `production_natural_gas_top15` | 15 | 15 | identique |
| `energy_coal_electricity_majority` | 15 | 15 | identique |

**Cas limite relevé (dossier de gate).** `energy_coal_electricity_majority` :
**Vietnam 50,32 %** passe le seuil strict d'un cheveu (0,5032 > 0,5) — comme en
v1 ; Australie 45,21 % et Allemagne 21,44 % dessous. Les 4 `production_*_top10`
agricoles sont de la trivia de classement pure (risque fun, cf. lot 2) ; les 3
`energy` sont plus grand public.

**Checklist.** `pnpm lint` ✓ (2 warnings préexistants `convex/gameWrites.test.ts`)
· `pnpm test` **530/530** ✓ (+5 : 3 bascules de seuil + 2 `quantitativeFactsForCode`)
· `pnpm check:content` « **76 actives, 11 archivées, 6 en réserve, 197 pays** » ✓
· `pnpm check:bundle` **245,8 KiB** gzip (budget 280) ✓ · `pnpm simulate:scheduling`
**14/14 PASS**, couverture **100 % sur 76**, failed seeds 0/76, overlap max
0,846 < 0,85, cold-start ≤ 1 newcomer/grille.

**Gate utilisateur (2026-09-08).** Feu vert **pour les 7** — inclusion sans
réserve (dossier ci-dessus, 7/7 identiques v1). `EXPECTED_ACTIVE_COUNT` → **76**,
`RESERVE_CONSTRAINT_IDS` inchangé (6). Contrairement au lot 2, aucune contrainte
écartée : le thème production/énergie est jugé assez porteur, y compris les 4
`production_*_top10` agricoles.

**Merge.** `content-p3-lot3` → `develop` (local, `--no-ff`), commits non signés
(échec pinentry ioctl → `--no-gpg-sign`). _Reste à faire : push + `refreshPool`
via `/admin`._

### Lot 4 — branche `content-p3-lot4` (2026-09-09)

**Périmètre livré : 3 contraintes** — `history_sovereignty_since_1990`,
`history_from_france`, `history_from_united_kingdom`, catégorie `history` (nouvelle).
`EXPECTED_ACTIVE_COUNT` 76 → **79**. **Dernier lot P3.**

**Modèle de faits — arbitrage 2026-09-09 (supersède le tableau §2 « 2 champs »).**
La v1 n'a **aucune dérivation** pour ces 3 contraintes, seulement 3 listes ISO3
curées + le snapshot `content/facts/sovereignty/data.ts`. Reconstruction : **3
nouveaux champs `CountryFacts`, tous factuels** — `formerSovereigns:
FormerSovereign[]` (slugs, pas des ISO3), `sovereigntyYear: number | null` (année
**brute**, jamais masquée — fiche pays P4), `sovereigntyKind: SovereigntyKind |
null`. Aucune donnée dérivée stockée (rejet du booléen d'éligibilité, anti-pattern
§9) : l'éligibilité de `since_1990` se **re-dérive du `kind`**
(`{independence, restoration, dissolution_successor}` — audité pur reflet du flag
v1 `qualifiesForIndependenceConstraints` sur les 193 entrées). Les deux
`history_from_*` ne lisent **que** l'appartenance à `formerSovereigns`, sans filtre
de `kind` (le Yémen est dans la liste UK malgré son `kind: unification` de 1990).

**Datasets.** `scripts/countries/data/sovereignty.ts` (nouveau) — `SovereigntyEvent`
par ISO3 (193 pays), porté verbatim du snapshot `sovereignty` de
`constraint-explorer` (221b42d), `sourceCommit` conservé. `data/types.ts` ré-exporte
`FormerSovereign` / `SovereigntyKind` de `content/countries/type.ts` (comme
`ProductionRankKey`) et définit `SovereigntyEvent` / `SovereigntySnapshot`.
`quantitativeFactsForCode` réduit l'événement à 3 scalaires repris tels quels
(`formerSovereigns`, `year`, `kind`).

**Snapshot.** `pnpm build:countries` (réseau, 1 min 10, 197/197, 0 échec) +
`pnpm biome check --write content/`. Diff `content/countries/` : **`facts.ts`
purement additif** (+3 champs × 197) + `type.ts` + `SOURCE.md`. `catalog.ts` /
`popularity.ts` : **aucun mouvement** après normalisation Biome (millésime
identique au lot 3, 08-29). Les **76 `answers.ts` existants inchangés**.
`build:answers` : 79 actives.

**Contre-épreuve vs v1 (`221b42d`).** Dérivation initiale : 3/3 listes ISO3
byte-identiques. **Après correction de gate (voir plus bas) : 2/3 + 1 écart
volontaire documenté.**

| id | dérivé | v1 | statut |
| --- | --- | --- | --- |
| `history_from_france` | 27 | 27 | identique (`formerSovereigns.includes("france")`) |
| `history_from_united_kingdom` | **59** | 56 | **+CAN +PAK +USA** — trou de parsing v1 rattrapé en curation (gate) |
| `history_sovereignty_since_1990` | 28 | 28 | identique (`year ≥ 1990 ∧ kind ∈ gained` ⇒ exclut RUS + YEM, exactement les 2 exclusions v1) |

**Cas limites (dossier de gate).**

- `history_from_united_kingdom` : **États-Unis hors liste** (`formerSovereigns`
  vide malgré « from Great Britain » au Factbook) ; **Israël + Yémen dedans**
  malgré `qualifiesForIndependenceConstraints: false` (la contrainte ne lit ni ce
  flag ni le `kind`).
- `history_sovereignty_since_1990` : Russie (1991, `continuation`) et Yémen (1990,
  `unification`) **exclus par le `kind`**, pas par une donnée effacée ; Namibie
  1990 pile sur la borne (incluse) ; Estonie/Lettonie `year` 1991 (le `date` porte
  parfois 1918, non lu).
- `history_from_france` : Vanuatu dans les deux listes (condominium).
- 4 pays sans fait de souveraineté (`[]` / `null`) : `ETH`, `PSE`, `SMR`, `TWN` —
  absents du snapshot v1 (jamais colonisés / statut contesté / trop ancien),
  assumé. N'entrent dans aucune liste.

**Checklist.** `pnpm lint` ✓ (2 warnings préexistants `convex/**`) · `pnpm test`
**534/534** ✓ (+4 : 3 bascules dérivation + 1 `quantitativeFactsForCode`) ·
`pnpm check:content` « **79 actives, 11 archivées, 6 en réserve, 197 pays** » ✓ ·
`pnpm check:bundle` **246,5 KiB** gzip (budget 280) ✓ · `pnpm simulate:scheduling`
**14/14 PASS**, couverture **100 % sur 79**, failed seeds 0/79, overlap max
0,846 < 0,85, cold-start ≤ 1 newcomer/grille.

**Gate utilisateur (2026-09-09).** Feu vert **sous condition** : modèle de faits,
3 dérivations et parité validés ; l'extracteur qui a produit le snapshot v1 ne
reconnaissait pas trois formulations du champ *Independence* (« declared
independence from Great Britain », « from British India », « union of British
North American colonies… recognized by UK »). Correction en **curation**
(`scripts/countries/data/sovereignty.ts`) : `formerSovereigns` de **USA**, **PAK**,
**CAN** complété avec `"united_kingdom"`, chaque ajout commenté du texte source.
`history_from_france` audité entrée par entrée côté utilisateur : propre (Andorre
= co-principauté, Allemagne = zones d'occupation, pas des indépendances). Regen :
`facts.ts` bouge sur **3 lignes** (les 3 `formerSovereigns`), **seule**
`history_from_united_kingdom` change (56 → **59**), les 78 autres listes
inchangées, aucune dérive de millésime. `pnpm test` 534/534 (le cas
`united_states: false` du test de dérivation devient `true`), reste de la
checklist inchangé.

**Merge.** `content-p3-lot4` → `develop` (`--no-ff`, commit `410b30f`), poussé le
2026-09-09 (avec le `e1ffa21` du lot 3 resté en attente). _Reste : `refreshPool`
via `/admin` sur develop une fois le déploiement Vercel/Convex passé._
Branche `constraint-explorer` taguée `archive/constraint-explorer` (local, comme
les autres tags d'archive) puis supprimée — moisson des 4 lots terminée.

**Finalisation P3 (clôture, §4).** Compteurs `docs/content-pipeline.md` → 79
actives / 22 catégories (fait, commit DOCS) ; `AGENTS.md` §3 : ajout de la ligne
décrivant le seam **réserve** (concept né au lot 2, jusque-là décrit uniquement
dans `content-pipeline.md`) ; première entrée `/changelog` joueur du refacto
(catalogue 60 → 79 actives : 25 ajoutées, 6 en réserve, 19 nettes) +
`LATEST_CHANGELOG_UPDATE_DATE` 2026-09-09 ; tag `archive/constraint-explorer` puis
suppression de la branche (entièrement moissonnée par les 4 lots).

## Revue métier adverse (2026-09-10)

Revue adverse du contenu P3 avant merge dans `main`, conduite en parallèle de la
revue technique. Verdict : mergeable après corrections — toutes appliquées
ci-dessous, qui tiennent lieu de compte rendu (le rapport de revue lui-même n'est
pas versionné, il n'avait de valeur que le temps de la passe).

### Le défaut de fond : aucune règle de périmètre territorial

La revue n'a pas trouvé une liste fausse, elle a trouvé **trois conventions
contradictoires**, chaque famille héritant du découpage de son dataset :

| famille | outre-mer | conséquence observée |
| --- | --- | --- |
| volcans | compté (GVP indexe par État souverain) | Royaume-Uni et Pays-Bas dans la liste |
| océans | compté à moitié, à la main | France « bordée par l'Indien » mais pas par le Pacifique, alors que son `SOURCE.md` affirmait le contraire |
| fuseaux | ignoré (IANA indexe par ISO 3166) | France à 1 décalage, alors qu'elle en couvre 12 |

Le joueur n'avait aucun moyen de deviner laquelle s'appliquait. Règle tranchée et
écrite une fois dans [`content/constraints/SOURCES.md`](../content/constraints/SOURCES.md)
(section « Périmètre territorial d'un pays ») : **seul le territoire pleinement
intégré compte**. Elle prime sur la source et vaut pour toute contrainte
géographique future.

### Corrections de données (une seule regen, 2026-09-10)

| contrainte | avant | après | motif |
| --- | --: | --: | --- |
| `history_from_united_kingdom` | 59 | **61** | +SDN, +NRU — le Factbook nomme le Royaume-Uni dans les deux notices |
| `time_zones_multiple` | 19 | **21** | +FRA (5 décalages), +NLD (2) — règle de périmètre |
| `physical_caribbean_coast` | 22 | **23** | +FRA (Guadeloupe, Martinique) |
| `production_coffee_top10` | — | — | −CAF, +MEX — re-sourcé sur l'USDA-FAS |
| `nature_mountain_area_majority` | 34 | **38** | +NOR, +TUR, +TWN, +XKX — valeurs curées |
| `nature_holocene_volcano` → `nature_active_volcano` | 76 | **56** | éruption ≥ 1500 + périmètre |

Diff ISO3 total : **10 lignes**. Aucune dérive collatérale.

**Le trou de parsing n'était pas rattrapé.** Le lot 4 avait complété USA, PAK et
CAN à l'œil et conclu « rattrapé ». Une passe systématique sur les 193
`sourceDescription` en a trouvé deux de plus : le **Soudan** (« from Egypt and the
UK ») et **Nauru** (« UK-administered UN trusteeship » — la même formulation
produisait pourtant déjà `united_states` pour PLW, MHL et FSM). La passe est
désormais outillée : `validateSovereigntySources`, câblée à `check:content` et
testée dans les deux sens, avec une liste d'omissions justifiées (occupation
quadripartite de l'Allemagne, co-principauté d'Andorre, auto-références…).

**Le café était fidèle à sa source et faux en jeu.** FAOSTAT classait la
République centrafricaine 10ᵉ producteur mondial (316 kt) — une imputation, la
production réelle se comptant en milliers de tonnes — ce qui évinçait le Mexique.
Seul cas du lot où la dérivation était irréprochable et le résultat mauvais.
Re-sourcé sur l'USDA-FAS ; `AgriculturalProductionSnapshot` porte désormais la
source **par produit**, les trois autres restant sur FAOSTAT.

**Volcans : de l'Holocène à l'activité historique.** 76 pays sur 197 (39 %),
c'était la contrainte la plus large du jeu, et « volcan actif » y désignait des
édifices dormants depuis huit millénaires (Allemagne −8300, Rwanda −8050).
`nature_holocene_volcano` est **archivée** (liste figée, grilles passées
rejouables) et remplacée par `nature_active_volcano` : éruption datée de 1500 ou
après, territoire intégré. Dataset ré-extrait du service WFS du Smithsonian GVP
(1 146 volcans, 75 pays, avec `Last_Eruption_Year`). Le fait passe de
`hasHoloceneVolcano: boolean` à `lastVolcanicEruptionYear: number | null` — donnée
brute, seuil dans la dérivation.

### Mises en réserve

- **`political_arab_league`** — les 22 membres sont **tous** dans
  `language_arabic` (inclusion 1,00, Jaccard 0,88). Le générateur interdisait déjà
  la paire : la contrainte n'ouvrait aucun croisement neuf. C'est en outre une
  liste d'États à mémoriser, le motif exact qui a écarté le G7 et Schengen au
  lot 2, alors que la contrainte de langue est devinable.
- **`urban_centres_min_3_over_1m`** — indevinable (France 2 centres GHSL, Bolivie
  et Ghana 3) et structurellement coûteuse : elle englobait à ≥ 0,85 quatre autres
  contraintes qu'elle bannissait de toute grille où elle figurait.

`political_opec` est **gardée** : « pays exportateur de pétrole » est évocateur et
la liste ne recoupe rien (aucun Jaccard ≥ 0,40).

### Relief : la seule correction qui a résisté

L'API `unstats.un.org` ne publie **aucune** valeur `ER_MTN_TOTL` pour ARG, CAN,
DEU, ISR, NOR et TUR — 30 lignes chacun, toutes vides — et TWN/XKX sont hors
système onusien. Le rapport de revue affirmait un trou de moisson ; **c'est le
journal du lot 2 qui avait raison**, la source ne les couvre pas.

Combler n'est pas anodin : la Norvège vaut ~30 % sous la définition norvégienne
(au-dessus de la limite des arbres) contre 91,3 % sous la délimitation
européenne — un facteur 3 qui inverse la réponse. D'où la règle retenue : **une
valeur hors-série n'est écrite que si l'écart au seuil dépasse largement l'écart
entre délimitations**. Quatre pays franchissaient le seuil et sont curés avec leur
provenance explicite (Norvège 91,3 %, Turquie 80 %, Taïwan 66 %, Kosovo 64 %) ;
les quatre autres restent absents, `null` étant indiscernable de « sous le seuil »
côté joueur.

### Libellés revus

`history_from_united_kingdom` (« Anciennement sous domination britannique » — la
liste contient les États-Unis, Israël, l'Afghanistan), `history_sovereignty_since_1990`
(« A accédé à l'indépendance depuis 1990 » — la dérivation exclut unifications et
continuités), `production_crude_oil_top15` (« pétrole **brut** » — la donnée EIA
est le brut), plus le libellé de la nouvelle contrainte volcans.

### Checklist

`pnpm lint` ✓ (2 warnings préexistants `convex/**`) · `pnpm test` **553/553** ✓
(+5 : garde souveraineté) · `pnpm check:content` « **77 actives, 12 archivées,
8 en réserve, 197 pays** » ✓ · `pnpm check:bundle` **246,4 KiB** gzip (budget
280) ✓ · `pnpm simulate:scheduling` **14/14 PASS**, couverture 100 % sur 77,
failed seeds 0/77, overlap max 0,846 < 0,85, cold-start ≤ 1 newcomer/grille.

**Reste à faire** : `refreshPool` via `/admin` après le push — le pool en base
référence encore `nature_holocene_volcano`, `political_arab_league` et
`urban_centres_min_3_over_1m`, que `getGridContentIssue` invalide désormais.
