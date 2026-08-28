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
5. **Gardes** : `EXPECTED_ACTIVE_COUNT` dans `check-content.ts` (60 → 68 → 75 →
   82 → 85 ; `ocean_multiple_basins` glissé du Lot 1 au Lot 2), test `translate`,
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

Aucune couche de curation `memberships` n'existe aujourd'hui : la dérivation
reflète fidèlement la source. Recommandation portée au gate : **ship tel quel**,
documenter les 3 retards dans les `SOURCE.md`, revoir quand REST v5 se met à
jour ; un seam `membershipPatches` reste un candidat de suivi si la précision
est jugée nécessaire.

**Checklist.** `pnpm lint` ✓ (2 warnings préexistants hors périmètre dans
`convex/gameWrites.test.ts`) · `pnpm test` 514/514 ✓ · `pnpm check:content`
« 68 actives, 11 archivées, 197 pays » ✓ · `pnpm check:bundle` 244.9 KiB gzip
(budget 280) ✓ · `pnpm simulate:scheduling` **14/14 PASS**, `constraint
coverage 100 %`, `failed seeds 0/68`, overlap générateur max 0.846 < 0.85
(les groupes politiques tendent l'overlap vers le plafond sans le franchir).

**Gate utilisateur.** _(en attente)_

**Merge.** _(en attente du feu vert)_
