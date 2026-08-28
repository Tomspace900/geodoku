# P1 — Snapshot de faits + listes dérivées (refacto contenu)

> Plan d'exécution autonome. Tout le contexte nécessaire est dans ce document ;
> les décisions sont **actées**, ne pas les rediscuter. En cas d'ambiguïté non
> couverte ici : choisir l'option la plus proche du comportement actuel de
> `develop` et la consigner dans la section « Journal d'exécution » en fin de
> fichier.

## 0. Contexte et décisions actées

Geodoku (voir `AGENTS.md`) évalue aujourd'hui chaque contrainte de grille par un
prédicat runtime `(country) => boolean` sur `src/features/countries/data/countries.json`
(7 700 lignes, généré). Deux refactos ont été tentés puis abandonnés :

- `constraint-explorer` (commit `221b42d`, juillet) — trop large, non mergeable.
- `content-refactor` (commit `7054426`, août) — listes ISO3 **manuelles** comme
  source de vérité. Propre mais jette la capacité de regen et le futur volet
  « fiches pays ». Non mergeable non plus (develop a divergé), mais c'est notre
  **carrière de matériaux** : sa couture runtime et son layout `content/` sont
  repris.

Décisions actées (issues d'une session de design, ne pas rouvrir) :

1. **Source de vérité = snapshot de faits par pays**, daté globalement, sous
   `content/`, mélangeant champs importés (population, frontières…) et champs
   curés (geoTags, flagSymbols, events…).
2. **Toutes les contraintes actives dérivent** du snapshot. Les listes ISO3
   finales sont **générées, committées, relues en diff**. Aucune liste manuelle
   pour les contraintes actives.
3. Les 11 contraintes **archivées** gardent des listes **figées à la main**
   (hors génération, conservées uniquement pour le replay) — moissonnées du
   commit `7054426` telles quelles.
4. **Provenance légère** : date/version globale du snapshot + documentation par
   famille de champs. Pas d'objet provenance par valeur.
5. **P1 est iso-fonctionnelle** : zéro changement visible joueur, zéro appel
   réseau, zéro changement de schéma Convex. Le snapshot initial est pivoté
   hors-ligne depuis le `countries.json` actuel.
6. Hors périmètre P1 (viendra en P2/P3) : les 71 `SOURCE.md` par contrainte, la
   refonte des docs (`AGENTS.md`, `content-pipeline.md`), le
   `ConstraintExplorerPanel`, les fiches pays, la réorganisation des fichiers de
   curation.

## 1. Modèle cible (P1)

```
ENTRÉES DE CURATION (éditées à la main, inchangées en P1)
  scripts/countries/countryPatches.ts    # corrections, alias, classifications
  scripts/countries/flagData.json        # table de vérité drapeaux

        │  pnpm build:countries  (regen COMPLÈTE — réseau, JAMAIS lancée en P1)
        ▼
SNAPSHOT (content/ — généré, committé, daté)
  content/countries/facts.ts             # NOUVEAU : faits gameplay par pays
  content/countries/catalog.ts           # identité joueur : iso2/3, noms, alias, drapeau
  content/countries/countryCodes.ts      # 197 codes + type CountryCode + garde
  content/countries/popularity.ts        # snapshot popularité (percentiles)

        │  pnpm build:answers  (dérivation PURE, hors-ligne)
        ▼
LISTES DÉRIVÉES (content/ — générées, committées, relues en diff)
  content/constraints/<id>/answers.ts    # 60 actives (générées) + 11 archivées (figées)
  content/constraints/index.ts           # registre typé exhaustif

        │  imports relatifs (JAMAIS l'alias @/)
        ▼
RUNTIME + OUTILLAGE
  matchesConstraint(id, iso3)            # remplace constraint.predicate(country)
  Country réduit à l'identité joueur     # le bundle ne charge plus les faits
```

Deux gardes en CI (`quality`) :

- `pnpm check:content` — cohérence de `content/` **et** contrôle d'obsolescence :
  re-dérive les listes depuis le snapshot et échoue si un `answers.ts` généré
  ne correspond plus (facts modifiés sans regen, ou liste éditée à la main).
- `pnpm check:bundle` — existant, budget 280 KiB (attendu ≈ 227 KiB après le
  retrait de countries.json du bundle, chiffre mesuré sur la v2).

## 2. Matériaux : quoi moissonner du commit `7054426`

Lire un fichier de la v2 : `git show 7054426:<chemin>`. Voir son diff :
`git show 7054426 -- <chemin>`.

**À reprendre tel quel (ou quasi) :**

| Matériau | Usage en P1 |
| --- | --- |
| `content/type.ts`, `content/countries/type.ts` | base des types (étendre avec les types de faits) |
| `content/countries/countryCodes.ts` | structure identique ; regénérer depuis les données actuelles |
| `content/constraints/type.ts`, `defineAnswerSet.ts`, `index.ts` | registre typé `{ [K in ConstraintId]: ConstraintAnswerSet<K> }` |
| Les 11 `content/constraints/<id_archivé>/answers.ts` | listes figées, verbatim |
| `scripts/content/check-content.ts`, `typescriptSnapshot.ts` | garde CI (à étendre, cf. étape 6) |
| Diffs runtime : `constraints.ts`, `validation.ts`, `types.ts` (countries), `search.ts`, `popularity.ts` (logic), `simulation.ts`, `e2e/helpers.ts`, `convex/lib/gridGenerator.ts`, `convex/lib/gridContentCompatibility.ts`, `convex/gameWriteValidation.ts`, `convex/scheduling.ts`, `scripts/local/analyze-pool.ts`, `scripts/local/export-analytics.ts`, `src/features/game/logic/__tests__/constraints.test.ts`, `__tests__/validation.test.ts` | guides de portage (appliquer l'intention sur le develop actuel, PAS un cherry-pick — les fichiers ont divergé) |
| `.github/workflows/ci.yml`, `package.json` (scripts `check:content`) | câblage CI |

**À NE PAS reprendre de la v2 :**

- Ses `answers.ts` de contraintes **actives** (manuels, juillet 2026) — ils ne
  servent qu'à la validation croisée de l'étape 4.
- Ses modifications de `countryPatches.ts`, `buildCountriesLib.ts`,
  `build-countries.ts` et la **suppression de `flagData.json`** : la v2 avait
  élagué le pipeline parce que les listes étaient manuelles. Dans notre modèle,
  patches + flagData restent les **entrées de curation** de la regen — on garde
  les versions `develop` (qui contiennent le fix RDC `ebbea1f`).
- `content/countries/SOURCE.md`, `content/README.md`, ses diffs `AGENTS.md` /
  `docs/content-pipeline.md` — docs = P2.

## 3. Invariants directeurs

1. **Parité stricte** : pour chacune des 60 contraintes actives, la liste
   dérivée doit être exactement l'ensemble des pays acceptés par le prédicat
   actuel de `develop` sur le `countries.json` actuel. L'étape 4 le prouve
   avant toute suppression.
2. **Hors-ligne** : aucun script exécuté en P1 ne fait d'appel réseau.
   `build:countries` est adapté mais **jamais lancé**.
3. **Imports vers `content/` toujours relatifs** (`../../content/…`), jamais
   `@/` : Convex et `tsx` ne résolvent pas les `paths` du tsconfig (même raison
   que le commentaire en tête de `src/features/countries/logic/popularity.ts`).
4. **`content/` est terminal** : il n'importe rien de `src/`, `convex/` ou des
   features. Sens de dépendance : `content/` ← runtime/scripts.
5. Aucun changement de schéma ni d'API Convex → pas de codegen attendu. Si
   `convex/_generated` diffe, c'est un signal d'erreur.

## 4. Étapes d'exécution (dans cet ordre)

### Étape 0 — Branche

```bash
git checkout develop && git pull && git checkout -b content-p1
```

Branche **locale, ne pas pousser** (toute branche poussée auto-déploie un
preview Vercel + un déploiement Convex). Merge dans `develop` à la toute fin.

### Étape 1 — Types et snapshot seedé hors-ligne

1. Créer `content/type.ts` et `content/countries/type.ts` (partir de la v2).
   Ajouter le type des faits : reprendre les champs gameplay du type `Country`
   actuel (`src/features/countries/types.ts`) — `continent`, `waterAccess`,
   `borders`, `areaKm2`, `population`, `officialLanguages`, `latitude`,
   `subregion`, `flagColors`, `flagSymbols`, `flagLayout`, `events`,
   `memberships`, `capitals`, `drivingSide`, `geoTags`, `regime`,
   `physicalFeatures` — indexés par `CountryCode`. Les enums (`Continent`,
   `FlagSymbol`, `PoliticalGroup`, etc.) migrent de
   `src/features/countries/types.ts` vers `content/countries/type.ts` ;
   `src/…/types.ts` les réexporte pour limiter le churn d'imports.
2. Écrire `scripts/content/seed-from-legacy.ts` (one-shot, supprimé à l'étape
   7) : lit `src/features/countries/data/countries.json` et écrit :
   - `content/countries/facts.ts` — en-tête `@generated` + constante
     `FACTS_SNAPSHOT = { date: "2026-08-28", note: "seed initial pivoté du countries.json historique" }`,
     puis `COUNTRY_FACTS: Record<CountryCode, CountryFacts>` trié par ISO3 ;
   - `content/countries/catalog.ts` — identité seule (iso2, iso3, names,
     aliases, flagEmoji), format v2 ;
   - `content/countries/countryCodes.ts` — format v2 ;
   - `content/countries/popularity.ts` — format v2 (percentile 0..1 par pays,
     calculé du champ `popularityIndex` actuel ; regarder
     `git show 7054426:content/countries/popularity.ts` pour la forme exacte).
   Réutiliser `scripts/content/typescriptSnapshot.ts` (v2) pour la
   sérialisation TS. Lancer, committer les sorties.
3. Vérifier : 197 pays, codes triés, mêmes valeurs que le JSON source.

### Étape 2 — Dérivations et génération des listes

1. Créer `content/constraints/derivations.ts` : un objet exhaustif
   `DERIVATIONS: { [K in ActiveConstraintId]: (facts, ctx) => boolean }`.
   Porter les 60 prédicats actifs de
   `src/features/game/logic/constraints.ts` (lignes ~158-650) en remplaçant
   `country.<champ>` par `facts.<champ>`. Points d'attention :
   - Comparaisons à un pays-repère (`ref("FRA")`, `densityOf(ref("NLD"))`…) :
     le contexte `ctx` expose `factsOf(code)` lisant le même snapshot — même
     sémantique « valeur live du repère » qu'aujourd'hui.
   - Les seuils (`BORDERS_MIN_5`, `POLAR_ABS_LAT = 55`…) migrent dans ce
     fichier.
2. Créer `scripts/content/build-answers.ts` (commande `pnpm build:answers`) :
   pour chaque contrainte active, applique la dérivation aux 197 pays et écrit
   `content/constraints/<id>/answers.ts` — en-tête
   `// @generated par pnpm build:answers — ne pas éditer à la main`, liste ISO3
   triée, via `defineAnswerSet`.
3. Moissonner les 11 listes archivées de la v2 verbatim
   (`flag_two_colors`, `area_gt_2M`, `area_gt_500k`, `area_lt_1k`,
   `density_high`, `density_low`, `language_multilingual`,
   `population_gt_100M`, `population_gt_30M`, `population_lt_1M`,
   `population_lt_2_5M`) — **sans** en-tête `@generated` : elles sont figées.
4. Moissonner `content/constraints/index.ts` (v2) : `ConstraintId`,
   `CONSTRAINT_IDS` (actives), `ARCHIVED_CONSTRAINT_IDS`, `ANSWER_SETS` typé
   exhaustif, `answersForConstraint`.
5. Lancer `pnpm build:answers`, committer les 60 listes générées.

### Étape 3 — Harnais de parité (AVANT tout portage runtime)

Écrire `scripts/content/parity-check.ts` (one-shot, supprimé à l'étape 7) qui
compare, pour chacune des 60 contraintes actives :

1. **vs develop** : l'ensemble `{ iso3 | predicate(country) }` calculé avec les
   prédicats encore présents dans `constraints.ts` sur `countries.json`,
   contre la liste générée. **Tout écart est un bug de dérivation à corriger.
   Le harnais doit finir à zéro écart** — c'est le verrou de l'iso-fonctionnel.
2. **vs v2** : la liste générée contre
   `git show 7054426:content/constraints/<id>/answers.ts`. Écart **attendu et
   normal** : `latitude_south_hemisphere` contient `COD` (fix RDC `ebbea1f`,
   postérieur à la v2). Tout autre écart : vérifier lequel des deux est
   conforme au comportement develop actuel (c'est lui qui gagne) et consigner
   dans le Journal d'exécution.

Coller la sortie (0 écart develop ; écarts v2 listés) dans le Journal.

### Étape 4 — Portage de la couture runtime

Appliquer l'intention des diffs v2 sur le develop actuel, fichier par fichier
(le diff v2 est le guide, pas un patch applicable) :

- `src/features/game/logic/constraints.ts` — supprimer prédicats, imports
  countries.json, `ref()`, seuils (partis en `derivations.ts`). `Constraint` =
  `{ id, labelKey, category }`. Ajouter `matchesConstraint(id, iso3)` (lève sur
  id inconnu). Réexporter `ConstraintId` depuis `content/constraints`.
  `CONSTRAINTS`, `ARCHIVED_CONSTRAINTS`, `CONSTRAINT_BY_ID` conservent leurs
  formes et ordres actuels.
- `src/features/game/logic/validation.ts` — `validateGuess` passe par
  `matchesConstraint` (diff v2 exact).
- `src/features/countries/types.ts` — `Country` réduit à l'identité
  (`iso3`, `iso2`, `names`, `aliases`, `flagEmoji`, `popularityIndex?`) ;
  réexports des enums migrées.
- `src/features/countries/logic/search.ts`, `logic/popularity.ts` — sourcer
  depuis `content/countries/catalog` + `popularity` (diffs v2).
- `src/features/game/testing/simulation.ts`, `e2e/helpers.ts` — diffs v2.
- `convex/lib/gridGenerator.ts`, `convex/lib/gridContentCompatibility.ts`,
  `convex/gameWriteValidation.ts`, `convex/scheduling.ts`,
  `convex/adminReadModel.ts`, `src/features/admin/logic/display.ts` — diffs v2
  (imports relatifs vers `content/`).
- `scripts/local/analyze-pool.ts`, `export-analytics.ts`,
  `simulate-scheduling.ts`, `simulate-players.ts` — adapter les imports.

À chaque fichier : `pnpm typecheck` doit passer avant le suivant si possible.

### Étape 5 — Garde `check:content` + CI

1. Moissonner `scripts/content/check-content.ts` (v2) : 197 pays triés,
   codes/popularité synchronisés, 60 actives / 11 archivées, catalogues
   runtime alignés, `validateCountryCatalog`.
2. **L'étendre** avec le contrôle d'obsolescence : ré-exécuter les dérivations
   sur `COUNTRY_FACTS` et comparer aux `answers.ts` committés ; toute
   différence = erreur avec message actionnable
   (`« lancer pnpm build:answers »`).
3. `package.json` : scripts `check:content` et `build:answers`.
4. `.github/workflows/ci.yml` : ajouter `pnpm check:content` au job `quality`
   (comme le diff v2).

### Étape 6 — Adapter la regen (sans la lancer)

`scripts/countries/build-countries.ts` + `buildCountriesLib.ts` : conserver
toute la logique actuelle (fetch REST Countries + Wikimedia, patches, flagData)
mais remplacer l'émission de `countries.json`/`countryCodes.json` par
l'émission de `facts.ts` + `catalog.ts` + `countryCodes.ts` + `popularity.ts`
(mêmes sérialiseurs que le seed de l'étape 1 — factoriser), en mettant à jour
`FACTS_SNAPSHOT.date`. Enchaîner `build-answers` en fin de script (ou
documenter la séquence dans le script). Adapter `buildCountriesLib.test.ts` /
`countryPatches.test.ts` / `validateCountryCatalog.ts` au nouveau découpage
identité/faits. **Ne pas exécuter la regen réseau** ; sa première vraie
exécution est un acte délibéré post-merge.

### Étape 7 — Suppression du legacy et nettoyage

1. Supprimer `src/features/countries/data/countries.json` et
   `src/features/countries/data/countryCodes.json` (vérifier zéro import
   restant : `grep -rn "countries.json\|countryCodes.json" src convex scripts e2e`).
2. **Garder** `scripts/countries/flagData.json` et `countryPatches.ts`
   (entrées de curation).
3. Supprimer `scripts/content/seed-from-legacy.ts` et `parity-check.ts`
   (après avoir collé leurs sorties dans le Journal).
4. Tests : porter le test RDC (`constraints.test.ts`, ajouté par `ebbea1f`)
   sur les listes (`latitude_south_hemisphere` contient `COD`) ; reprendre les
   tests v2 de `constraints.test.ts` / `validation.test.ts` ; ajouter un test
   Vitest de `derivations.ts` sur 3-4 cas sensibles (frontière de seuil :
   `latitude_polar`, `density_more_japan`, `borders_solo`).
5. `AGENTS.md` : mise à jour **minimale** (§3 arborescence : `content/` ;
   §7 commandes : `check:content`, `build:answers` ; règle imports relatifs).
   La refonte éditoriale complète est en P2.

### Étape 8 — Checklist finale

```bash
pnpm lint
pnpm test
pnpm check:content
pnpm build            # + vérifier le poids bundle (check:bundle via quality)
pnpm simulate:scheduling   # sanity : le pool doit se comporter à l'identique
pnpm check:e2e-convex-url && pnpm test:e2e
```

Attendus : tout vert ; bundle en baisse (~227 KiB gzip, budget 280 KiB
inchangé) ; `simulate:scheduling` sans changement de comportement ;
`convex/_generated/` sans diff.

## 5. Pièges connus

- **Biome / tsconfig** : vérifier que `content/` et `scripts/content/` sont
  couverts par `pnpm lint` et `pnpm typecheck` (la v2 n'a pas eu besoin de
  toucher les tsconfig, mais le vérifier explicitement : un dossier ignoré
  passerait sous les radars).
- **Imports relatifs** : depuis `convex/lib/*` c'est `../../content/…` ;
  depuis `src/features/game/logic/*` c'est `../../../../content/…`. Biome
  gère l'ordre, pas la forme.
- **`popularityIndex`** : le champ reste consommé par la recherche
  (tri des résultats) et l'admin ; en v2 il vit dans le snapshot popularité,
  pas dans le catalogue — suivre le diff v2 de `search.ts`.
- **Ne pas « corriger » une liste au passage** : toute envie éditoriale
  (un pays discutable dans une liste) est hors périmètre — parité d'abord,
  révisions ensuite (P2+).
- **Commits** : signés GPG (si pinentry échoue sur une erreur ioctl, utiliser
  `--no-gpg-sign` sans redemander) ; messages français style
  `[REFACTOR] …` ; **pas** de trailer `Co-Authored-By`. Découpage suggéré :
  (1) types + snapshot seedé, (2) dérivations + listes générées + archivées,
  (3) couture runtime, (4) check:content + CI + regen adaptée,
  (5) suppression legacy + tests + docs minimales.
- Le hook pre-commit lance Biome + typecheck + Vitest sur ce qui est stagé :
  committer des états cohérents.

## 6. Hors périmètre P1 — ne pas faire

- `SOURCE.md` par contrainte, `content/README.md`, refonte `AGENTS.md` /
  `docs/content-pipeline.md` (P2).
- `ConstraintExplorerPanel` (P2, PR séparée).
- Fiches pays, UI, i18n (P3 — aucune clé i18n ne change en P1).
- Réorganisation de `countryPatches.ts` / `flagData.json` par pays.
- Lancer la regen réseau.
- Toucher au schéma Convex, aux endpoints, au rate limiting.
- Supprimer les branches `content-refactor` / `constraint-explorer` (elles
  restent jusqu'à validation finale de la moisson).

## 7. Journal d'exécution

> À remplir par l'exécutant : sortie du harnais de parité (étape 3), écarts
> vs v2 et leur arbitrage, décisions d'ambiguïté, mesure du bundle final.

### Décisions d'ambiguïté

- **En-tête `@generated`** : ajouté aux 4 fichiers snapshot (`countryCodes.ts`,
  `catalog.ts`, `facts.ts`, `popularity.ts`), pas seulement à `facts.ts`. Le
  modèle §1 traite tout le bloc SNAPSHOT comme généré ; la regen (étape 6)
  réécrira les quatre.
- **`popularity.ts` seedé** : `percentile = popularityIndex` du `countries.json`
  actuel (reproduit à l'identique `POPULARITY_BY_CODE` de `logic/popularity.ts`),
  `rawPageviews = wikipediaMonthlyViews` (présent pour les 197), `fallback: null`.
  Meta du snapshot (`measurementPeriod`, `algorithmVersion`) posée en
  placeholder honnête (`legacy-countries-json-pivot`), la regen mettra les
  vraies valeurs.
- **`CountryFacts.borders`** : `readonly string[]` et non `CountryCode[]` — les
  frontières contiennent des territoires hors catalogue (ESH, HKG, MAC).
- **`ActiveConstraintId`** : ajouté à `content/constraints/index.ts` ;
  `derivations.ts` l'importe en **type-only** (élidé par tsx) pour que le
  registre `DERIVATIONS satisfies Record<ActiveConstraintId, …>` vérifie la
  bijection sans créer de cycle de valeurs ni alourdir le bundle.
- **`tsconfig.tooling.json`** : `content/**/*.ts` ajouté explicitement à
  `include` (piège §5 — couverture typecheck garantie hors graphe d'imports).

### Étape 3 — harnais de parité

```
─── vs develop ───
0 écart — parité iso-fonctionnelle vérifiée sur les 60 contraintes actives.

─── vs v2 (écarts) ───
⚠ INATTENDU  water_island — -[AUS]
⚠ INATTENDU  population_more_canada — -[AFG,YEM]
· attendu    latitude_south_hemisphere — +[COD]
⚠ INATTENDU  physical_crosses_equator — -[GNQ]
⚠ INATTENDU  density_more_netherlands — -[IND]
⚠ INATTENDU  density_less_canada — +[BWA] -[GUY]
```

**Arbitrage des écarts vs v2** : les listes générées correspondent **exactement**
aux prédicats de `develop` sur le `countries.json` actuel (0 écart vs develop).
Les 5 écarts « inattendus » vs v2 sont de la **dérive de données** du
`countries.json` entre le commit v2 (août) et aujourd'hui — `develop` gagne
(règle §3.1), les listes générées sont donc conformes :

- `water_island -AUS` : `sourceCorrectionsByIso3` classe l'Australie `coastal`
  (mainland) et non `island` — la v2 la comptait île.
- `population_more_canada -AFG,-YEM`, `density_more_netherlands -IND`,
  `density_less_canada ±BWA/GUY` : populations/densités proches d'un seuil-repère,
  passées de l'autre côté depuis août.
- `physical_crosses_equator -GNQ` : la Guinée équatoriale n'est plus taguée
  `equator_crosser` dans les listes curées de `develop`.
- `latitude_south_hemisphere +COD` : attendu (fix RDC `ebbea1f`).

### Étapes 4–7 — portage, garde, regen, nettoyage

- **Découpage identité / faits du modèle pays** : `content/countries/type.ts`
  expose `Country` (identité, réexporté par `src/features/countries/types.ts`)
  **et** `CountryRecord` (forme complète mutable, `iso3: string`) pour le
  pipeline de régénération. `CountryCapital` reste mutable (le pipeline en
  construit).
- **`validateCountryCatalog.ts`** scindé : `validateCountryCatalog(catalog)`
  (identité, version v2) + `validateCountryFacts(facts, codes)` (les invariants
  gameplay de l'ancien validateur complet, re-hébergés sur `facts.ts`). Les deux
  sont appelés par `check:content` et testés.
- **`check-content.ts`** : version v2 **sans** le contrôle `SOURCE.md`
  (hors périmètre P1), **plus** le contrôle d'obsolescence (re-dérive les 60
  actives, compare aux `answers.ts` committés). Le scan de dossiers ne retient
  que ceux contenant `answers.ts` (ignore `__tests__/`).
- **Regen (`build-countries.ts`)** : émet le snapshot `content/` via le
  sérialiseur partagé `scripts/content/emitCountrySnapshot.ts` et enchaîne
  `pnpm build:answers`. **Non exécutée** (réseau) — première vraie regen = acte
  délibéré post-merge.
- **Supprimés** : `src/features/countries/data/{countries,countryCodes}.json`,
  `scripts/content/{seed-from-legacy,parity-check}.ts` (one-shots).
- **Conservés** : `scripts/countries/flagData.json`, `countryPatches.ts`
  (entrées de curation).
- **Tests** : `constraints.test.ts` / `validation.test.ts` portés (v2 + RDC
  equator-crossers sur les listes) ; `content/constraints/__tests__/derivations.test.ts`
  ajouté (bascules de seuil : `borders_solo`, `latitude_polar`,
  `density_more_japan`, `area_larger_france`).
- **AGENTS.md** : mise à jour minimale (§3 arborescence `content/` + règle
  imports relatifs ; §7 `check:content` / `build:answers`). Refonte éditoriale
  → P2.

### Étape 8 — checklist finale

| Vérif | Résultat |
| --- | --- |
| `pnpm lint` | ✓ (biome + tsc, 0 erreur ; 2 warnings `noUnusedImports` **préexistants** sur `convex/*.test.ts`) |
| `pnpm test` | ✓ 508 tests / 57 fichiers |
| `pnpm check:content` | ✓ 60 actives, 11 archivées, 197 pays |
| `pnpm build` | ✓ `typecheck:app` + `vite build` OK |
| `pnpm check:bundle` | ✓ **244.3 KiB** gzip chargement joueur (budget 280) — **−12.6 KiB** vs `develop` (256.9). Le chiffre « ~227 » du plan datait de la v2 (avant posthog-js) ; direction et ampleur conformes (les faits ne partent plus au navigateur). |
| `pnpm simulate:scheduling --seed=20260714` | ✓ **14/14** checks — comportement identique (197 pays, coverage 100 %, overlap max 0.846 < 0.85) |
| `pnpm check:e2e-convex-url` | ✓ Convex joignable, grille du jour 2026-08-28 |
| `pnpm test:e2e` | ✓ **121 passed** (2.9 min) contre `calculating-salamander-183` (staging) — tous moteurs, tous specs (game / archive / persistence / mobile) |
| `convex/_generated/` | ✓ aucun diff (pas de changement de schéma/API) |
