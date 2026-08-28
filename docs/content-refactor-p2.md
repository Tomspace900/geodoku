# P2 — Provenance documentée + première regen (refacto contenu)

> Plan d'exécution autonome, suite de [`content-refactor-p1.md`](content-refactor-p1.md)
> (mergée dans `develop`). Les décisions sont **actées**, ne pas les rediscuter.
> En cas d'ambiguïté non couverte : choisir l'option la plus proche de l'existant
> et la consigner dans le Journal d'exécution en fin de fichier.
> **Une exception ferme** : les 5 arbitrages éditoriaux de l'étape 6 sont des
> décisions **utilisateur** — préparer le dossier, ne PAS trancher.

## 0. Contexte

P1 a installé le modèle : snapshot de faits daté (`content/countries/facts.ts`),
dérivations pures (`content/constraints/derivations.ts`), 60 listes actives
générées-committées + 11 archivées figées, garde `check:content` (avec contrôle
d'obsolescence) en CI. Le tout iso-fonctionnel, parité vérifiée à zéro écart.

P2 apporte ce qui a été volontairement différé :

1. La **provenance documentée** : 71 `SOURCE.md` (un par contrainte) + procédure
   commune, moissonnés du commit `7054426` (branche `content-refactor`) et
   **adaptés au modèle P1** — c'est le point délicat, cf. étape 2.
2. La **refonte des docs** : `AGENTS.md` §3/§6, `docs/content-pipeline.md`,
   `content/README.md`.
3. Le **`ConstraintExplorerPanel`** admin, moissonné du commit `237594a`
   (branche `constraint-explorer`).
4. En clôture : la **première regen réseau** (`pnpm build:countries`), la revue
   du diff de listes qu'elle produit, et le **dossier d'arbitrage** des 5 cas
   éditoriaux hérités de la curation de juillet (consignés dans le Journal P1).
5. Le **ménage** du legacy devenu inutile.

Hors périmètre P2 (actés) : les **26 nouvelles contraintes** de la branche
`constraint-explorer` et leurs datasets `content/facts/` (→ P3) ; les fiches
pays (→ P4). **Ne pas supprimer la branche `constraint-explorer`** : c'est la
carrière de P3.

## 1. Cible documentaire

```
content/
  README.md                      # carte du dossier + modèle (facts → dérivation → listes)
  countries/SOURCE.md            # provenance du snapshot par FAMILLE de champs
  constraints/
    SOURCES.md                   # procédure de révision commune + références partagées
    <id>/SOURCE.md               # définition, dérivation/seuil, cas limites — 71 fichiers
    <id>/answers.ts              # inchangé (P1)
```

Principe de fond (décision P1 à faire respirer dans chaque doc) : **la source de
vérité d'une contrainte active est `dérivation + snapshot de faits` ; son
`answers.ts` est une matérialisation relue en diff.** Les 11 archivées restent
des listes figées à la main. Toute formulation v2 du type « `answers.ts` est la
source de vérité » doit être réécrite — c'était la thèse v2, elle est abandonnée.

## 2. Étapes d'exécution

### Étape 0 — Branche

Branche locale `content-p2` depuis `develop` à jour, **non poussée**. Merge à la
fin. Commits signés GPG (`--no-gpg-sign` en repli si pinentry échoue sur une
erreur ioctl), messages français `[DOCS]`/`[FEAT]`/`[CHORE]`, pas de trailer
`Co-Authored-By`.

### Étape 1 — Socle commun : SOURCES.md, README, SOURCE.md pays

1. `content/constraints/SOURCES.md` : partir de
   `git show 7054426:content/constraints/SOURCES.md` (78 lignes : références
   partagées par domaine — ONU M49, WDI, World Bank Boundaries, UE/G20/OTAN/
   Commonwealth, drapeaux, événements sportifs…) et **réécrire la « Procédure de
   révision »** pour le modèle P1 :
   - contrainte **active** : on ne modifie jamais `answers.ts` à la main — on
     révise l'entrée de curation (`countryPatches.ts`, `flagData.json`) ou la
     donnée du snapshot, puis `pnpm build:answers`, puis relecture du diff ISO3
     pays par pays ; ou on ajuste la dérivation/seuil (`derivations.ts`) si
     c'est la définition qui change ;
   - contrainte **archivée** : liste figée, ne bouge jamais ;
   - contrôles : `pnpm check:content`, `pnpm test`, `pnpm simulate:scheduling`,
     régénération du pool via `/admin` après revue ;
   - conserver le principe : « une source externe informe la décision, elle ne
     la remplace jamais — aucun changement de liste sans décision éditoriale
     visible dans le diff ».
2. `content/countries/SOURCE.md` : partir de la version v2
   (`git show 7054426:content/countries/SOURCE.md`) et l'étendre en **doc par
   famille de champs du snapshot** (décision P1 « provenance légère ») : pour
   chaque champ de `CountryFacts` (continent, waterAccess, borders, areaKm2,
   population, officialLanguages, latitude, subregion, flagColors/Symbols/
   Layout, events, memberships, capitals, drivingSide, geoTags, regime,
   physicalFeatures) : source (world-countries / REST Countries / curation
   `countryPatches`/`flagData`), et statut **importé** vs **curé**. La date de
   millésime vit dans `FACTS_SNAPSHOT.date`, pas ici.
3. `content/README.md` : partir de la v2, réécrire le § « Contraintes » selon le
   modèle P1 (dérivation, `@generated`, garde d'obsolescence, archivées figées).

### Étape 2 — Moisson des 71 SOURCE.md

Pour chaque id (60 actives + 11 archivées) :

```bash
git show 7054426:content/constraints/<id>/SOURCE.md > content/constraints/<id>/SOURCE.md
```

Puis **adaptation systématique** (mécanique, à appliquer uniformément) :

- **Frontmatter conservé** (`constraint_id`, `status`, `checked_at`,
  `review_after`). Garder les dates de juillet : `checked_at` date la revue de
  la **définition et des cas limites**, pas la donnée (le millésime des données
  est `FACTS_SNAPSHOT.date`). Corriger `status` si besoin (doit refléter
  actif/archivé réel — `check:content` le vérifiera).
- **Section « Définition »** : conserver le texte v2 (définition jouable).
- **Nouvelle section « Dérivation »** (actives uniquement) : une ou deux lignes —
  champ(s) du snapshot utilisés + seuil/pivot, en cohérence exacte avec
  `derivations.ts` (ex. `latitude_polar` : « |latitude| > 55 » ;
  `area_larger_france` : « areaKm2 > areaKm2(FRA), valeur live du repère »).
  Pour les archivées, à la place : « Liste figée à la main, hors dérivation. »
- **Supprimer/réécrire** toute phrase « `answers.ts` est la source de vérité »
  (cf. §1) et toute mention de révision manuelle de la liste pour une active.
- **Section « Cas limites »** : conserver telle quelle (c'est la valeur
  éditoriale de juillet).
- Les liens relatifs vers `../SOURCES.md` doivent rester valides.

### Étape 3 — Étendre `check:content` aux SOURCE.md

Ré-hériter de la v2 les contrôles retirés en P1
(`git show 7054426:scripts/content/check-content.ts`) et les adapter :

- chaque dossier `<id>/` contient un `SOURCE.md` ;
- frontmatter parsable : `constraint_id` == nom du dossier, `status` cohérent
  avec actif/archivé, `checked_at`/`review_after` au format `YYYY-MM-DD` ;
- présence de `content/constraints/SOURCES.md`, `content/countries/SOURCE.md`,
  `content/README.md`.
- **Pas** de police sur l'expiration de `review_after` (décision P1 : dates
  indicatives).

`pnpm check:content` reste vert à l'issue.

### Étape 4 — Refonte des docs projet

1. `docs/content-pipeline.md` : réécrire pour le modèle réel (le fichier décrit
   encore le pipeline pré-P1). Contenu : le graphe du §1 de
   [`content-refactor-p1.md`](content-refactor-p1.md), les commandes
   (`build:countries` réseau, `build:answers` hors-ligne, `check:content`), la
   procédure « modifier une contrainte » et « réviser un fait », le rôle de
   `countryPatches`/`flagData` comme entrées de curation, la protection des
   grilles publiées par `gridAnswers`.
2. `AGENTS.md` : passe éditoriale complète du §3 « Contenu » (le patch minimal
   P1 est en place ; le densifier façon AGENTS.md — une ligne par règle dure,
   renvoi à `docs/content-pipeline.md` pour le détail) et vérifier §7
   (commandes à jour). Ne pas gonfler : AGENTS.md porte les règles, pas les
   tutoriels.
3. `git show 7054426 -- AGENTS.md docs/content-pipeline.md` peut servir
   d'inspiration de formulation, en corrigeant la thèse (cf. §1).

### Étape 5 — ConstraintExplorerPanel (commit dédié)

Moissonner du commit `237594a` :

- `src/features/admin/components/ConstraintExplorerPanel.tsx` (~262 l.)
- `src/features/admin/logic/constraintExplorer.ts` + son test (~50 + 44 l.)
- le branchement dans `src/features/admin/AdminPage.tsx` (après les panneaux
  opérationnels).

Adapter la source de données : le panneau consommait les listes de la v1 — le
brancher sur `constraintAnswers(id)` / `CONSTRAINTS`
(`src/features/game/logic/constraints.ts`). Analyse 100 % client, aucune query
Convex nouvelle. Vérifier la conformité design system (`PanelCard`,
`PanelHeader`, tokens Geodoku — `pnpm check:design-system`) et les clés i18n
éventuelles (fr **et** en). C'est le seul livrable UI de P2.

### Étape 6 — Première regen réseau + dossier d'arbitrage

C'est le test grandeur nature du modèle P1. Séquence :

1. `pnpm build:countries` (réseau : world-countries npm + REST Countries +
   Wikimedia pageviews ; `--env-file=.env.local`). Premier vrai run du code
   adapté en P1 : des ajustements de fetch/mapping sont possibles — les
   corriger fait partie de l'étape. La regen réécrit le snapshot
   (`FACTS_SNAPSHOT.date` = date du jour) et enchaîne `build:answers`.
2. `pnpm check:content && pnpm test && pnpm simulate:scheduling`.
3. **Revue du diff** : relire le diff des `answers.ts` pays par pays, et le
   diff de `facts.ts` par famille de champs. Classer chaque changement de
   liste : donnée rafraîchie légitime / bug de mapping / cas limite à
   arbitrer.
4. **Dossier d'arbitrage — STOP utilisateur.** Présenter à l'utilisateur, sans
   trancher, au minimum les 5 cas hérités de juillet (Journal P1) plus tout
   nouveau cas surgi du diff :
   - `water_island` : l'Australie est-elle une « île » ? (v2 : oui ;
     develop : `coastal` via `sourceCorrectionsByIso3`)
   - `physical_crosses_equator` : la Guinée équatoriale compte-t-elle ?
     (continent au nord de l'équateur, île d'Annobón au sud — convention
     territoire vs continent)
   - `population_more_canada` (AFG, YEM), `density_more_netherlands` (IND),
     `density_less_canada` (BWA/GUY) : la regen sur données fraîches tranche
     peut-être d'elle-même — sinon, documenter le millésime retenu.
   Chaque dossier : faits, sources, options, recommandation.
5. Après décision utilisateur : appliquer (curation `countryPatches` /
   `flagData` ou dérivation), `pnpm build:answers`, mettre à jour la section
   « Cas limites » et `checked_at` des `SOURCE.md` concernés **uniquement**.
6. Si des listes ont changé : `pnpm simulate:scheduling`, puis rappeler à
   l'utilisateur la régénération du pool via `/admin` (`refreshPool`) après
   merge — les grilles déjà publiées restent protégées par `gridAnswers`.

### Étape 7 — Ménage du legacy

Actés en session de design (l'utilisateur a déjà validé le principe) :

```bash
git stash drop 'stash@{0}'        # « WIP Refacto Codex » — vérifié : aucun contenu inédit
git worktree remove .claude/worktrees/content-refactor
git branch -D content-refactor    # entièrement moissonnée (P1 : listes ; P2 : SOURCE.md)
```

⚠️ Avant le drop du stash : vérifier que `stash@{0}` est bien « WIP Refacto
Codex » (l'index des stashes bouge). **Garder `constraint-explorer`** (carrière
de P3 : 26 contraintes, `content/facts/`, i18n). Ne pas toucher aux stashes
develop 1-7 (ménage séparé, hors périmètre).

### Étape 8 — Checklist finale

```bash
pnpm lint
pnpm test
pnpm check:content
pnpm check:design-system          # le panneau explorer est de l'UI
pnpm build                        # + check:bundle via quality
pnpm simulate:scheduling
pnpm check:e2e-convex-url && pnpm test:e2e
```

Attendus : tout vert ; les SOURCE.md n'affectent ni bundle ni runtime ; seuls
l'explorer (admin, lazy) et les éventuels changements de listes post-arbitrage
touchent le comportement.

## 3. Pièges connus

- **Ne pas réintroduire la thèse v2** dans les textes moissonnés (cf. §1) —
  c'est l'erreur la plus probable de la moisson.
- Les SOURCE.md sont du **contenu**, pas du code : Biome ne les lint pas, la
  cohérence vient de `check:content` (étape 3) et de la relecture.
- L'explorer v1 datait d'avant `matchesConstraint` : ne pas copier ses accès
  aux données v1, seulement sa logique d'intersections et son UI.
- La regen touche `popularity.ts` (pageviews Wikipédia frais) : c'est attendu,
  ça n'influence que l'analyse de difficulté admin, pas le jeu.
- Un échec réseau partiel de la regen ne doit **jamais** produire un snapshot
  partiel committé : tout-ou-rien (vérifier le comportement du script, le
  durcir si besoin).
- e2e : écrit de vrais guesses sur staging (assumé, comme la CI).

## 4. Journal d'exécution

### Décisions d'ambiguïté

- **Runner de la regen** : lancée par Claude (clé `REST_COUNTRIES_API_KEY` +
  réseau présents dans `.env.local`). Deux passes : la 1ʳᵉ pour le dossier
  d'arbitrage, la 2ᵉ après le patch `countryPatches.ts` (Australie). Valeurs
  population/pageviews identiques entre les deux (même source, même mois).
- **Sérialisation** : `pnpm build:countries` émet du JSON (`JSON.stringify`,
  clés entre guillemets) ; les fichiers `content/` committés en P1 étaient
  normalisés par Biome (clés nues). `pnpm biome check --write content/` après
  chaque regen ramène au format committé — sans quoi le diff est illisible
  (~1800 lignes de bruit sur `catalog.ts`). Intégré au réflexe de revue.
- **`checked_at` des SOURCE.md** : bumpé à `2026-08-28` **uniquement** sur les
  4 contraintes dont la liste a bougé (`water_island`, `population_more_canada`,
  `density_more_netherlands`, `density_more_japan`). Les 67 autres gardent la
  date de juillet (revue de définition inchangée).
- **`scripts/dev/`** : le §3 d'`AGENTS.md` liste `scripts/dev/` (scratch
  gitignored) mais le dossier n'existe pas dans l'arbre suivi — laissé tel quel,
  hors périmètre P2.
- **`buildCountriesLib.test.ts:151`** : fixture `applySourceCorrections` utilise
  `AUS` + `{ waterAccess: "coastal" }` comme exemple de mécanique — inchangée
  (ne lit pas `sourceCorrectionsByIso3`, toujours verte). Naming légèrement
  daté après le patch Australie, mais fonctionnellement correct.

### Adaptations des SOURCE.md (moisson)

Moisson mécanique des 71 fichiers du commit `7054426` via un script jetable
(scratchpad) : frontmatter conservé, `## Définition` / `## Cas limites` /
`## Révision` verbatim, **nouvelle `## Dérivation`** insérée après `## Sources`
(champ du snapshot + seuil/pivot en cohérence exacte avec `derivations.ts` ;
« Liste figée à la main » pour les 11 archivées). Thèse v2 « c'est la liste qui
tranche » réécrite dans les 12 `## Cas limites` actives portant des seuils
(area/density/population) — pointée vers « la dérivation tranche sur la donnée
figée du snapshot ; une regen peut faire basculer un cas limite ». Aucun `status`
n'a eu à être corrigé (frontmatter v2 déjà cohérent). `SOURCES.md` : titres de
domaine conservés verbatim (ancres `../SOURCES.md#…` valides), `## Principe` et
`## Procédure de révision` réécrits pour le modèle P1.

### Première regen réseau — diff classé

`pnpm build:countries` : 197 pays, 0 fallback pageviews, `FACTS_SNAPSHOT.date`
inchangée (2026-08-28). `check:content` + `pnpm test` (511) + `simulate:scheduling`
(14/14) verts.

- `facts.ts` : ~126 `population` rafraîchies (WPP 2024) ; Bulgarie `+eurozone`
  (aucune contrainte active ne clé dessus). Zéro dérive latitude / borders /
  langues / continent.
- `popularity.ts` : ~354 percentiles rafraîchis — admin difficulté uniquement.
- `catalog.ts` / `countryCodes.ts` : identité pays **inchangée** (seul l'en-tête
  `@generated` obsolète `seed-from-legacy.ts` → `pnpm build:countries`).
- **`answers.ts` — 3 bascules de seuil-repère sur données fraîches** :
  `population_more_canada +AFG` (Afghanistan 35 M seed → 43,8 M WPP > Canada) ;
  `density_more_netherlands +IND` (Inde ≈ 435 > Pays-Bas ≈ 434) ;
  `density_more_japan −GRD` (Grenade ≈ 317 < Japon ≈ 325). Les deux premiers
  sont des « candidats de révision » du Journal P1 résolus par la donnée ;
  `−GRD` est un cas neuf surgi du diff.

### Dossier d'arbitrage — décisions reçues

| Cas | Type | Décision utilisateur |
| --- | --- | --- |
| `population_more_canada +AFG`, `density_more_netherlands +IND`, `density_more_japan −GRD` | donnée fraîche | **Accepter les 3** tels quels |
| `water_island` — Australie | convention | **Île** (lecture v2) → `sourceCorrectionsByIso3.AUS = { waterAccess: "island" }`, regen, `water_island +AUS` |
| `physical_crosses_equator` — Guinée équatoriale | convention | **Exclue** — statu quo, aucune modif |

Divergences v2 **non reproduites** par la donnée fraîche (aucune action) :
`density_less_canada ±BWA/GUY`, `population_more_canada −YEM` — la regen confirme
`develop`, pas la curation de juillet.

Post-décision : patch `countryPatches.ts` + 2ᵉ `pnpm build:countries` ;
`checked_at` + `## Cas limites` mis à jour sur les 4 SOURCE.md concernés.
**Rappel** : régénérer le pool via `/admin` (`refreshPool`) après merge —
`density_more_japan`, `density_more_netherlands`, `population_more_canada` et
`water_island` ont changé ; les grilles publiées restent protégées par
`gridAnswers`.

### Ménage du legacy

- `git tag archive/content-refactor` (→ `7054426`) puis `git branch -D
  content-refactor` + `git worktree remove .claude/worktrees/content-refactor`.
- `stash@{0}` « WIP Refacto Codex » (3ᵉ tentative distincte : module
  `migrations/2da136e-…`, `contentRefactor.test.ts`) matérialisée en
  `git tag archive/codex-content-refactor-step-1` (→ `ab6ec62`) + patch de
  secours `.git/geodoku-archive/codex-content-refactor-step-1.patch`. Stash
  retirée de la pile ; les 7 stashes `develop` intactes.
- `constraint-explorer` **conservée** (carrière P3).

### ConstraintExplorerPanel

Moisson du commit `237594a`. `constraintExplorer.ts` + son test : repris
verbatim. `ConstraintExplorerPanel.tsx` re-plombé : `countries.json` →
`COUNTRY_CATALOG` (import relatif `../../../../content/countries/catalog`),
`getConstraintAnswers` → `constraintAnswers` (retourne déjà un `Set`),
`COUNTRY_BY_CODE` typé `Map<string, …>` (les listes sont des
`ReadonlySet<string>`). Actives uniquement, chrome en littéraux français
(cohérent avec l'admin). Vérifié en local (`/admin`) : intersection
`continent_europe ∩ language_french` = 5/197 (BEL, FRA, LUX, MCO, CHE).
`check:design-system` vert.

### Checklist finale

| Vérif | Résultat |
| --- | --- |
| `pnpm lint` | ✓ (2 warnings `noUnusedImports` **préexistants** sur `convex/*.test.ts`) |
| `pnpm test` | ✓ 511 tests / 58 fichiers (+3 `constraintExplorer.test.ts`) |
| `pnpm check:content` | ✓ 60 actives, 11 archivées, 197 pays — + garde `SOURCE.md` |
| `pnpm check:design-system` | ✓ 14 règles, 0 violation |
| `pnpm build` + `pnpm check:bundle` | ✓ chargement joueur **244.4 KiB** gzip (budget 280, = P1) ; l'explorer part dans le chunk `AdminPage` lazy |
| `pnpm simulate:scheduling` | ✓ 14/14 |
| `pnpm check:e2e-convex-url` | ✓ grille du jour 2026-08-28 |
| `pnpm test:e2e` | ✓ 121 passed (2.8 min) contre `calculating-salamander-183` |
| `convex/_generated/` | ✓ aucun diff (aucun changement schéma/API) |
