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
