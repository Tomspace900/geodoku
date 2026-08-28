<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

# Geodoku — Guide du projet

## 1. Le projet en une page

Geodoku est un mini-jeu web quotidien inspiré de Wordle et du Sudoku, sur le thème de la géographie.

**Principe.** Chaque jour, une grille 3×3 est proposée à tous les joueurs. Chaque ligne et chaque colonne impose une contrainte géographique (ex: « Asie », « Enclavé », « Plus de 50M d'habitants », « Frontalier de la France »). Pour chacune des 9 cases, le joueur doit trouver un pays qui valide **simultanément** la contrainte de sa ligne et celle de sa colonne. Il dispose de **5 vies** et ne peut pas réutiliser deux fois le même pays. Une case dont tous les pays valides ont déjà été placés ailleurs devient **bloquée** (impossible à remplir) ; la partie se termine quand les vies tombent à zéro **ou** quand plus aucune case n'est remplissable.

**Le twist — rareté.** Plus le pays trouvé est rare (parmi les choix des autres joueurs de la journée), plus le tier de rareté est élevé (🟪 commun → 🟥 ultra). Un joueur qui remplit « Asie × Enclavé » avec « Bhoutan » obtient un meilleur tier qu'avec « Mongolie ».

**Score de fin — additif, en points (max 1000).** `computeScore` / `computeScoreBreakdown` dans [`scoreVariant.ts`](src/features/game/logic/scoreVariant.ts). Trois parts, additionnées :

- **Grille** : `50 × cases remplies` (max 450). L'anneau central — **cases uniquement, jamais les vies**.
- **Rareté** : cumulée, `Σ` sur les cases remplies, `50 ×` la fraction de rareté de chaque part — **plein dès qu'un pick est ultra** (part ≤ 0,1), puis décroissance linéaire jusqu'à 0 à `RARITY_ZERO_SHARE` (0,6) ; une case vide = 0, un pays très commun (≥ 0,6) = 0. Max 450 (grille tout-ultra).
- **Vies** : `20 × vies restantes` (max 100).

Barème tranché sur données réelles. La rareté d'une case s'appuie sur la **part brute du jour** (cohorte, coup du joueur inclus — `count/total`, [`rarity.ts`](src/features/game/logic/rarity.ts) `filledCellShare`/`filledCellTier`). **Une seule base de rareté partout** : score, couleur des cases en jeu, emojis de partage ET grille solution — un pays affiche donc le même tier sur tous les écrans (pas de leave-one-out : il inflait le score des premiers joueurs, qui redescendait ensuite, et désaccordait emojis ↔ grille solution). Sous `ESTIMATED_MAX_TOTAL` (5, `constants.ts`) soumissions, la part est encore mince → rareté signalée provisoire (marqueur « ≈ », `ScoreBreakdown.estimated`) ; le score étant live (`useQuery` réactif), il **évolue et s'affine** au fil de la journée à mesure que la cohorte se remplit. Affichage : anneau (grille) + couronne à **2 arcs** (rareté, couleur du tier moyen ; vies, rouge comme les cœurs, masqué à 0 vie), total au centre — [`ScoreDisplay.tsx`](src/features/game/components/ScoreDisplay.tsx). **La couleur de l'arc rareté (`averageRarityTier`) dérive de la fraction de rareté moyenne — la grandeur que l'arc mesure — pas de la moyenne des parts brutes**, pour que couleur et nombre affiché restent cohérents (à points par case égaux, couleur égale ; une seule case très commune ne fait plus basculer la couronne). Explication in-situ : `ScoreInfoDialog` (icône Info sur `ResultScreen`) + `RarityLegend` (aussi dans How-to-play).

**L'enjeu communautaire.** À la fin, le joueur partage sa grille sous forme d'emojis colorés (🟪🟦🟨🟥⬜⬛) avec `<total> pts`, à la manière de Wordle. `⬛` = cases bloquées ; `⬜` = cases non remplies en défaite. Le partage ([`share.ts`](src/features/game/logic/share.ts)) ouvre la **feuille native** (Web Share API) **uniquement sur appareil tactile** (`canUseNativeShare` = `navigator.share` **et** pointeur principal `coarse` / `maxTouchPoints > 0`) et retombe sur le **presse-papiers** sur desktop. **Ne pas** élargir vers « feuille native dès que `navigator.share` existe » — Safari/Chrome desktop l'exposent aussi. Les deux chemins envoient **exactement la même chaîne** (`formatShareString`), et `navigator.share` ne reçoit qu'**un seul champ `text`**, URL comprise en fin de corps : **jamais `{title, text, url}`**. La feuille iOS transmet chaque champ comme un item distinct et l'app réceptrice n'en garde souvent qu'un — avec une `url` séparée, Messages/WhatsApp/Mail n'envoyaient que le lien, sans score ni emojis, de façon variable selon l'app cible (d'où l'impression que « le partage dépend du navigateur »). L'aperçu de lien qu'un champ `url` ferait gagner ne vaut pas le contenu perdu. Un échec de copie (`ShareOutcome` `failed`) se dit à l'écran mais n'émet pas d'event. `share_method` (`native`/`clipboard`) part dans l'event PostHog `result_shared`.

**Mode entraînement (`/archive`).** Les grilles des **7 derniers jours** (J-1 → J-7) sont rejouables une fois la partie du jour terminée — sinon la route **redirige vers `/`** (garde d'expérience, pas de sécurité : l'endpoint est public et sans identité). Essais **illimités** : on compte les essais ratés au lieu de décompter des vies, donc une partie ne se perd que par **blocage**. Les cases se colorent normalement, sur la **cohorte figée** du jour concerné (complète → score exact et stable, sans marqueur « ≈ »). **Cohorte close ⇒ un pays absent de la distribution vaut une part de 0, donc ultra** (`isCohortComplete` / `filledCellShare`, [`rarity.ts`](src/features/game/logic/rarity.ts)) : sur une grille passée l'absence est définitive et signifie « personne ne l'a choisi », alors que sur la grille du jour elle signifie « pas encore » (le coup du joueur n'est pas encore agrégé). Sans cette distinction, un pays inédit n'avait aucun badge **et laissait le score bloqué sur `null`** — c'est la même lecture que la grille solution, qui applique `rarityByCountry[iso] ?? 0` depuis toujours. Score sur **900** : grille + rareté, part vies neutralisée, avec le nombre d'essais affiché à part ([`TrainingResultScreen`](src/features/archive/components/TrainingResultScreen.tsx)). Titres de fin réutilisés du quotidien (paliers calibrés sur /1000, donc le haut du barème sort plus rarement — assumé). **Pas de partage** (les emojis n'ont de sens comparés que le même jour), pas de notation de difficulté, et surtout **aucune écriture Convex** : les cohortes passées restent pures et le seam `guesses.isReplay` reste dormant. Une date future (ou aujourd'hui) est refusée **côté serveur et côté client** — `classifyReplayDate` ([`replayWindow.ts`](src/features/game/logic/replayWindow.ts)) est le module pur partagé par les deux ; un petit malin qui bricole l'URL tombe sur `ErrorScreen variant="time-traveller"`.

**Ce que Geodoku n'est PAS.** Pas de compte, pas de login, pas de leaderboard, pas de streak inter-jours, pas de stats globales, pas d'ads, pas de mobile app. Un site web minimaliste, une partie par jour (plus l'entraînement sur les 7 dernières), un partage. Point.

## 2. Stack technique

- **Frontend** : Vite + React + React Router (mode déclaratif) + TypeScript (strict mode)
- **Styling** : Tailwind CSS + shadcn/ui (install manuelle par composant) + Lucide React
- **Backend** : Convex (cloud remote, pas local) — DB, mutations, queries, crons ; rate limiting via `@convex-dev/rate-limiter` ([`convex/rateLimit.ts`](convex/rateLimit.ts), [`convex/convex.config.ts`](convex/convex.config.ts))
- **Observabilité front** : `@vercel/analytics` + `@vercel/speed-insights` + **PostHog** — voir §10 ([`src/main.tsx`](src/main.tsx))
- **Package manager** : pnpm (Node **≥ 22.12**, Volta 22.19)
- **Lint/format** : Biome **2.x** (pas ESLint, pas Prettier) — Biome 2 lint aussi le CSS, d'où `css.parser.tailwindDirectives: true` (sans quoi `@apply` ne parse pas) et `noUnknownAtRules: "off"` (`@tailwind` n'est pas standard). `noImportantStyles` est off : le `!important` est un outil délibéré face aux utilitaires Tailwind. `.claude/` est exclu — les worktrees y sont des checkouts d'autres branches, avec leur propre config.
- **Tests unitaires** : Vitest + @testing-library/react (`e2e/**` exclu dans [`vite.config.ts`](vite.config.ts))
- **Tests e2e** : Playwright ([`playwright.config.ts`](playwright.config.ts), [`e2e/`](e2e/))
- **Hooks / CI** : Git hook `pre-commit` (lint-staged) ; GitHub Actions — voir §8
- **Recherche fuzzy** : match-sorter (normalisation NFD côté requête)
- **Fonts** : Newsreader (serif) + Inter (sans-serif)

**Choix assumés et non négociables.** Pas de state manager externe : `useReducer` + `Context`. Pas de TanStack Query. Pas de Zod. Pas de date-fns : dates en `YYYY-MM-DD` ([`src/lib/dates.ts`](src/lib/dates.ts)). Routage déclaratif minimal avec React Router pour `/`, `/admin`, `/privacy` et `/changelog` ([`src/App.tsx`](src/App.tsx)) : jeu et pages éditoriales eager, admin seul chargé en lazy.

## 3. Architecture

```
content/                  # snapshot de contenu versionné, TERMINAL (n'importe rien de src/convex)
  README.md               # carte du dossier + modèle facts → dérivation → listes
  countries/              # catalog (identité) + countryCodes + facts + popularity (générés, datés) + SOURCE.md
  constraints/            # index (registre typé) + derivations (prédicats) + SOURCES.md + <id>/{answers.ts, SOURCE.md}
src/features/<feature>/   # game, archive, countries, admin, legal, errors
  logic/                  # pur, testé, zéro React/Convex
  testing/                # simulation partagée par Vitest/E2E/scripts
  hooks/                  # glue logique + Convex + React
  components/             # consomment l'état, dispatchent des actions
convex/                   # schema, grids, guesses, scheduling, seed, crons
convex/lib/               # gridGenerator, gridScheduler, gridConstants (purs)
scripts/content/            # dérivation & garde du snapshot content/ (check-content, build-answers, emit)
scripts/ci/                 # exécutés en CI (check-e2e-convex-url)
scripts/countries/          # pipeline contenu pays (build-countries, flagData, patches)
scripts/local/              # outillage local versionné (analytics, simulate, sync gh…)
scripts/dev/                # scratch perso (gitignored)
e2e/                      # Playwright — helpers.ts + *.shared|desktop|mobile.spec.ts
.husky/pre-commit         # Biome (staged) + tsc + Vitest
.github/workflows/ci.yml  # quality + e2e
```

**Règles de placement.**

- Logique métier pure → `features/<feature>/logic/`. Testée en isolation.
- Hooks → seule couche logique + Convex + React.
- Composants → pas de calcul significatif ; reducer + dispatch.
- Pas de copie `src/` ↔ `convex/lib/` sauf [`convex/lib/dates.ts`](convex/lib/dates.ts) qui réexporte [`src/lib/dates.ts`](src/lib/dates.ts). `gridGenerator`, `gridScheduler`, `gridConstants` importent depuis `src/`.
- `content/` est **terminal** (n'importe rien de `src/`, `convex/`, features). Les imports **vers** `content/` sont toujours **relatifs** (`../../content/…`), jamais l'alias `@/` : Convex et `tsx` ne résolvent pas les `paths` du tsconfig. `src/features/countries/types.ts` réexporte `Country` (identité) + les énums depuis `content/countries/type` pour garder l'import familier `@/features/countries/types`.
- **Vies = union discriminée** `LivesState` ([`types.ts`](src/features/game/types.ts)), jamais un compteur nu : `{kind:"limited",remaining}` en daily, `{kind:"unlimited",failedAttempts}` en entraînement. Toute lecture passe par [`logic/lives.ts`](src/features/game/logic/lives.ts) — le reducer, le score et la persistance n'ont donc **aucune branche de mode**. Le format persisté du daily garde en revanche un `remainingLives` numérique (compatibilité du shadow v2).
- `archive` dépend de `game` (reducer, validation, composants de grille), jamais l'inverse. Les sanitizers d'entraînement vivent dans `game/logic/sanitizePersisted.ts` et prennent des **primitives**, pour que le domaine du jeu ignore la feature `archive`.

**Contenu (pays, contraintes, pool).** Règles critiques :

- **Archiver, jamais supprimer** une contrainte (`ARCHIVED_CONSTRAINTS` + `CONSTRAINT_BY_ID` pour replay).
- Une contrainte **active** n'a pas de prédicat runtime : sa liste ISO3 est **dérivée** de [`content/constraints/derivations.ts`](content/constraints/derivations.ts) sur le snapshot de faits, **générée** par `pnpm build:answers` dans `content/constraints/<id>/answers.ts`, **committée** et relue en diff. `matchesConstraint(id, iso3)` lit cette liste. `pnpm check:content` (job `quality`) échoue si un `answers.ts` est obsolète.
- Les 11 listes **archivées** sont figées à la main (pas d'en-tête `@generated`), hors dérivation.
- Chaque contrainte porte un `SOURCE.md` (définition, dérivation, cas limites) ; le socle (`constraints/SOURCES.md`, `content/README.md`, `content/countries/SOURCE.md`) porte le principe et la provenance par famille de champs. `check:content` vérifie présence et frontmatter.
- Deux leviers pour réviser une contrainte active : la **définition** change → `derivations.ts` (+ `CONSTRAINTS`) ; une **donnée** est fausse → curation (`countryPatches.ts`, `flagData.json`) ou `pnpm build:countries`. Jamais `answers.ts` à la main.
- Après un levier : `pnpm build:answers` → relire le diff ISO3 → `pnpm simulate:scheduling` → régénération du pool via `/admin` si OK.
- Le snapshot `content/countries/` (identité, faits, popularité) est régénéré par `pnpm build:countries` (réseau), qui enchaîne `build:answers`.
- Drapeaux → [`scripts/countries/flagData.json`](scripts/countries/flagData.json) curé, pas d'heuristique.

Détail complet : [`docs/content-pipeline.md`](docs/content-pipeline.md).

## 4. Conventions de code

**TypeScript.** `strict: true`. Pas de `any`. Préférer `type` aux `interface`. Unions discriminées plutôt qu'optionals. Pas de `// @ts-ignore`.

**React.** Fonctions pures > `useMemo`/`useCallback` par défaut. Un module React public principal par fichier, avec exports nommés ; helpers privés colocalisés. Pas de classes, sauf Error Boundaries imposées par l'API React.

**Style.** `forEach`/`flatMap` plutôt que `for...of` sauf `break`/`await`. Fonctions nommées pour les exports de logique. Commentaires en français (business), anglais (algos). Pas de magic numbers.

**Imports.** Alias `@/` pour `src/`. Biome gère l'ordre.

**i18n.** Tout texte joueur via `translate()` ([`src/i18n/`](src/i18n/)). Ajouter les clés dans `locales/fr.ts` **et** `en.ts`. Contraintes actives + archivées couvertes par le test `translate`.

**Tests unitaires.**

- Co-localisés dans `__tests__/`.
- Priorité logique pure. Peu de tests composants visuels. Pas de tests hooks Convex.
- Un test = une assertion fonctionnelle.

**Tests e2e (Playwright).** Dans [`e2e/`](e2e) : vraie app (Vite) contre Convex, grille du jour via `ConvexHttpClient` — **jamais de réponses devinées**. Routage par suffixe (`*.shared` = tous moteurs · `*.desktop` = Chromium seul · `*.mobile` = profils tactiles). `workers: 1` (grille Convex partagée). Helpers clés ([`e2e/helpers.ts`](e2e/helpers.ts)) : `solveGrid`, `pickCountry`, `fillCell`. Les propriétés qui ne sont pas garanties par chaque grille publiée, comme l'existence d'un plan de blocage, restent couvertes par des tests Vitest déterministes plutôt que par des E2E conditionnels.

**Documentation.** Après chaque feature, se demander si `README`, `AGENTS.md`, `/changelog` ou une docstring méritent une mise à jour — **pas systématiquement**. Mettre à jour quand la feature change une convention, commande, structure, contrat d'API, flux ou décision documentée.

## 5. Design system

Philosophie **Editorial Intellectual** (NYT Games) : spacieux, typographique, tokens Geodoku uniquement (pas de palette Tailwind native ni tokens shadcn parasites).

**Patterns nommés** — importer les composants, ne pas recopier : `DisplayHeader`, `Eyebrow`, `AccentBar` ([`src/components/editorial/`](src/components/editorial/)) ; admin : `PanelCard`, `PanelHeader`, `StatGlyph` ([`src/features/admin/components/`](src/features/admin/components/)).

**Règles dures (résumé).** Pas de bordures pour sectionner. Pas de `#000` / `bg-black/*`. Shadow : `shadow-editorial` par défaut. Toujours `<Button variant="...">` sauf `Cell.tsx` et fermeture modale `ResultScreen`. `brand` (accent violet) réservé aux CTA/accents ponctuels ; `brand` ≠ `rarity.*`.

**Référence complète** (palette, variants, `rounded-*`, typo) : [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

**Audit automatique.** `pnpm check:design-system` est la règle versionnée — à lancer après toute feature visuelle (voir §11). Le skill local `/verify-design-system` reste un confort optionnel.

## 6. Backend Convex

**Architecture en pool.** Pool de grilles candidates (`available`) + **scheduler greedy** (`selectNextGrid`) qui maximise diversité vs les 15 dernières grilles. Pipeline : `generateDiversePool` → finalize → `selectNextGrid` avec garde cold-start (`MAX_NEW_CONSTRAINTS_PER_GRID`). Détail : [`convex/lib/gridGenerator.ts`](convex/lib/gridGenerator.ts), [`gridScheduler.ts`](convex/lib/gridScheduler.ts).

**Migration du pool legacy.** Tant qu'un stock legacy non vide existe sans `activeGenerationId`, le refill automatique retourne `legacy_migration_required` et ne le remplace pas. La première bascule vers un pool générationnel doit être déclenchée explicitement par « Regénérer le pool » dans `/admin`, après `pnpm simulate:scheduling`. Un stock legacy vide reste auto-réparable.

**Tables.** `gridCandidates`, `grids`, `gridAnswers` (snapshot satellite `validAnswers`), `guesses`, `dailyStats`, `gridFeedback`, `poolState` (génération active + lease) et `operationReceipts` (déduplication, rétention 7 jours).

**Crons** ([`convex/crons.ts`](convex/crons.ts)) : `ensureDailyGrids` (horaire) ; `reconcilePoolAndSchedule` (03:00 UTC si stock bas, hors migration legacy explicite).

**Endpoints jeu** ([`convex/grids.ts`](convex/grids.ts), [`guesses.ts`](convex/guesses.ts)) : `getTodayGrid`, `submitTodayGuess`, `recordTodayFailedGuess`, `getTodayGuessDistribution`, `recordTodayGameEnd`, `submitTodayGridFeedback`. Chaque écriture reçoit un `operationId` idempotent ; les anciennes interfaces restent transitoirement disponibles pendant le rollout.

**Endpoints archive** (mode entraînement, **lecture seule**) : `getReplayableGrids` (J-1 → J-7, **sans `validAnswers`** — la liste ne doit rien révéler) et `getReplayGrid({date})` (grille + réponses). Ce dernier est gardé par `assertReplayableDate` ([`gameWriteValidation.ts`](convex/gameWriteValidation.ts)) : **le refus des dates `>= todayUTC()` est le point critique** — sans lui, `/archive/<demain>` livrerait la grille du lendemain avec ses réponses. Une date hors fenêtre **lève** ; une grille absente renvoie `null` (trou de données, pas une demande illégitime). La rareté figée est lue via `guesses.getGuessDistributionForDate` — promu de « legacy à supprimer » à endpoint du parcours joueur. Aucune mutation, donc aucun rate-limit ni `operationId` sur ce chemin.

**Endpoints admin** (token `ADMIN_TOKEN`) : `getScheduledGrids`, `getGridCellMetrics`, `getPoolStats`, `refreshPool`, `retryPoolFinalization`, `runEnsureTomorrow`, etc. Après activation, `refreshPool` retourne d'éventuels warnings de finalisation ; leur retry ne doit jamais relancer une génération.

**Rate limiting** ([`convex/rateLimit.ts`](convex/rateLimit.ts)) : clé `clientId` (localStorage), buckets `guess` + `feedback`.

**Rollout en cours.** La persistence minimale v3 est dual-write avec un shadow v2 pendant la fenêtre de rollback. Ne retirer ni ce shadow ni les endpoints legacy avant la fin de l'observation. Procédure complète : [`docs/rollout-write-integrity.md`](docs/rollout-write-integrity.md).

**Admin UI** ([`src/features/admin/AdminPage.tsx`](src/features/admin/AdminPage.tsx)) : `PoolOverviewPanel` (santé pool), `GameCalendar` + `GridDayDetail` (métriques par jour, facilité via `topKPopularity`, struggle observé), `GameHealthPanel` (win rate ~30 j), `ConstraintExplorerPanel` (intersection des listes ISO3 + chevauchement générateur, analyse 100 % client). Pas de panneau de tuning : ajuster `gridConstants.ts` + simuler.

**Règles Convex.** Pas de `.filter()` sur queries — index `by_<field>_and_<field>`. `gridGenerator`/`gridScheduler`/`gridConstants` restent **purs** (importables depuis Vitest et scripts).

## 7. Commandes utiles

```bash
# Dev
pnpm dev                          # Vite (--host)
pnpm convex:dev                   # Convex cloud dev

# Qualité (aussi dans pre-commit Husky)
pnpm lint                         # biome check + tsc
pnpm typecheck
pnpm test                         # Vitest (e2e/ exclu)
pnpm format
pnpm check:design-system          # audit tokens/DS sur src/**/*.tsx (job quality)
pnpm check:bundle                 # vite build + budget bundle joueur 280 KiB (job quality)

# E2E Playwright — nécessite une grille du jour
pnpm check:e2e-convex-url         # ping VITE_CONVEX_URL avant e2e (CI + local)
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:reset               # environnement dev perso jetable uniquement
pnpm sync:e2e-convex-url          # met à jour vars.VITE_CONVEX_URL (gh) après recreate develop

# Build
pnpm build

# Contenu & pool
pnpm build:countries             # regen réseau du snapshot content/ (+ enchaîne build:answers)
pnpm build:answers               # re-dérive content/constraints/<id>/answers.ts (hors-ligne)
pnpm check:content               # cohérence content/ (job quality) : obsolescence des listes + provenance SOURCE.md
pnpm analyze:pool
pnpm simulate:scheduling          # validateur changement contraintes
pnpm simulate:players             # dry-run par défaut ; --execute pour écrire (develop/dev)
pnpm analyze:observed
pnpm export:analytics             # écrit par défaut dans docs/reports/ (gitignored)

# Reproduire / observer prod (ou develop) en local — LE workflow par défaut
pnpm dump:prod                    # copie l'état prod → cloud dev local
pnpm dump:develop                 # copie l'état develop → cloud dev local
pnpm dump:prod-to-develop         # ops : aligner develop sur prod (confirmation interactive)
# … puis re-générer le pool via l'UI /admin (refreshPool). JAMAIS wipe+seed pour ça.

# Dev local VIDE / nouvel environnement UNIQUEMENT (ne reproduit PAS prod)
pnpm seed:grids
pnpm wipe:db                      # dev:* uniquement + ALLOW_DESTRUCTIVE_DEV_COMMANDS=true côté Convex
pnpm exec convex env set ADMIN_TOKEN "xxx"
```

> **⚠️ Reproduire prod/develop en local = `pnpm dump:[env]` puis régénérer le pool via l'UI
> `/admin` (`refreshPool`) — jamais `wipe:db` + `seed:grids`.** Ces deux dernières
> n'initialisent qu'un dev local vide ou un nouvel env ; elles ne reproduisent PAS
> l'état ni le comportement de prod (pool et grilles servies différents). Prod et
> develop ont des **données persistantes** : on ne les wipe jamais. Pour diagnostiquer
> un souci observé en prod, on **dump puis on observe**.

**Pre-commit** ([`.husky/pre-commit`](.husky/pre-commit)) : `lint-staged` (Biome sur fichiers stagés, auto-fix + re-stage) → si fichiers stagés : `typecheck` → `pnpm test` (skip si rien en stage, ex. `amend --no-edit`). Pas d'e2e (trop lent) — e2e en CI. `core.hooksPath` posé au `pnpm install` (`prepare`). Bypass : `git commit --no-verify` ou `HUSKY=0`.

## 8. CI, Vercel et `convex/_generated`

**GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) :

- `quality` (sans secret) — lint, typechecks, Vitest, design system et bundle. Push `main`/`develop` + PR vers `main`/`develop`.
- `e2e` — `pnpm check:e2e-convex-url` puis Playwright (étape dédiée en CI, fail-fast avant install navigateurs) ; `vars.VITE_CONVEX_URL` = deploy `preview/develop` (si URL invalide : `pnpm sync:e2e-convex-url` en local). Pas de deploy key ni seed (develop déjà seedé, cron horaire). **Sérialisé** (`concurrency: e2e-develop`). ⚠️ soumet de vrais guesses → bruite les stats develop (staging assumé). **Sauté sur les PR Dependabot** (`github.actor`) pour cette raison précise : un bump de dépendance ne vaut pas de polluer les stats de staging. Le build reste couvert, `quality` lançant `check:bundle` (qui fait un `vite build`), et la suite complète tourne au merge dans `develop`.

**Mapping branche → environnement :**

| Contexte           | Front             | Backend Convex                 | Données                    |
| ------------------ | ----------------- | ------------------------------ | -------------------------- |
| `main`             | Vercel Production | prod                           | persistantes               |
| `develop`          | Vercel Preview    | `preview/develop`              | persistantes               |
| autre branche WIP  | Vercel Preview    | `preview/<branch>`             | seedées auto au 1er deploy |
| `dependabot/*`     | aucun déploiement | aucun                          | —                          |
| local              | `pnpm dev`        | cloud dev perso (`convex dev`) | gérées manuellement        |

L'`ignoreCommand` de [`vercel.json`](vercel.json) coupe le déploiement des branches `dependabot/*` : sans lui, chaque bump de patch créait un preview Vercel **et** un déploiement Convex preview jetables.

**Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)) — cible `develop` (le flux est `develop → main`, une PR sur `main` serait inmergeable), cadence mensuelle, **un seul groupe prod+dev** : des groupes séparés bloquent les bumps couplés (`convex-test` exige un `convex` récent). Les **majeures npm sont ignorées** — elles demandent du code à adapter et se font délibérément, pas en cliquant une PR.

**Build Vercel :**

```bash
pnpm exec convex deploy --preview-run seed:autoSeedIfEmpty --cmd 'vite build' --cmd-url-env-var-name VITE_CONVEX_URL
```

`--preview-run` seed uniquement en preview, jamais en prod. Clé : `CONVEX_DEPLOY_KEY` par environnement.

Le CLI Convex exécute d'abord `--cmd 'vite build'`, puis pousse les fonctions,
index et schéma. Vercel n'expose toutefois le bundle qu'après le succès de la
commande complète : le push Convex précède donc toujours l'exposition du nouveau
frontend aux joueurs, et un échec du push fait échouer le déploiement Vercel.

**`convex/_generated/` est versionné** — régénérer avec `pnpm convex:dev` ou `pnpm exec convex codegen` après changement schéma/API et commiter le diff.

## 9. Anti-patterns à bannir

- 🚫 Over-engineering, features spéculatives, code mort.
- 🚫 Logique dans les composants au-delà du formatting.
- 🚫 Données dérivées stockées.
- 🚫 Tests de composants visuels (low ROI).
- 🚫 Bordures pour sectionner (cf. design system).
- 🚫 Commentaires qui paraphrasent le code.

## 10. Analytics produit (PostHog)

Complémentaire à Convex (`gridFeedback`/`dailyStats` = santé grilles ; PostHog = parcours joueur). **Convex = source de vérité** en cas de chevauchement.

**Init** ([`src/main.tsx`](src/main.tsx)) : `autocapture: false`, `persistence: "localStorage"` (pas de cookies). Pas de `identify()`, pas de PII. Tenir [`/privacy`](src/features/legal/PrivacyPage.tsx) à jour.

**Conventions.** Events `snake_case`, passé (`game_completed`). `posthog?.capture(...)` avec optional chaining. `grid_date` sur events partie. **Vérifier le catalogue avant d'en ajouter.**

| Domaine | Events |
| ------- | ------ |
| Partie | `game_started`, `session_resumed`, `cell_opened`, `guess_submitted`, `guess_failed`, `game_completed` (n'émet plus `grid_score_percent` — dérivable de `filled_cells`+`lives_left`) |
| Saisie | `guess_modal_closed` |
| Résultat | `result_screen_viewed`, `result_shared` (portent `score_total`/`score_grid`/`score_rarity`/`score_lives` — les anciens `originality_*`/`grid_score_percent` sont **retirés**, groupements dashboards à recréer), `difficulty_rated`, `solution_viewed`, `scoring_info_opened` (prop `source`: `result_screen`) |
| UI | `how_to_play_*`, `locale_changed`, `footer_link_clicked`, `survey_link_clicked` / `survey_dismissed` (prop `source`: `result_screen`/`solution_screen`/`footer` ; banderole sondage post-partie via `SurveyCta` — écran de résultat sous le partage + écran de solution — gated par feature flag PostHog `survey_active` ; `geodoku:survey-done` dissocie clic (masquage définitif, cf. `isSurveyDone`) et fermeture (masquage jour courant seulement, réapparaît le lendemain) ; lien permanent et discret dans `AppFooter` (même flag, toujours affiché quel que soit `geodoku:survey-done`, mais un clic dessus masque aussi la banderole) pour rester accessible aux joueurs qui changent d'avis après avoir fermé la banderole) |
| Entraînement | `archive_opened`, `training_started` (`grid_date`, `resumed`, `restart`), `training_completed` (`grid_date`, `outcome`, `filled_cells`, `failed_attempts`), `training_result_viewed` (`grid_date`, `outcome`, `score_total`/`score_grid`/`score_rarity` sur 900, `failed_attempts`) — **noms distincts des events daily** pour ne pas corrompre les groupements existants. Corollaire : le mode entraînement n'émet **aucun** event daily, `cell_opened` compris (il alimente le tunnel du quotidien) ; `game_started`/`game_completed`/`result_screen_viewed`/`cell_opened` restent daily-only. Seul `scoring_info_opened` est partagé, distingué par `source: training_result_screen`. |
| Légal | `legal_page_viewed`, `legal_page_left` |
| Fiabilité | `backend_timeout_shown`, `$exception` |

Source de vérité détaillée : grep `posthog?.capture` dans le code.

## 11. Checklist avant PR / fin de ticket

**Toujours**

- `pnpm lint` et `pnpm test` (aussi exécutés au pre-commit Husky)

**Selon le périmètre**

| Changement | Vérification |
| ---------- | ------------ |
| Logique pure (`logic/`, `convex/lib/*`) | tests unitaires ciblés + `pnpm test` |
| UI / styles | `pnpm check:design-system` (skill local `/verify-design-system` optionnel) |
| Parcours jeu (grille, modale, résultat, persistance) | `pnpm test:e2e` contre un backend avec grille du jour ; `wipe` + `seed` uniquement sur un dev perso jetable |
| Mode entraînement / fenêtre de rejeu | tests `replayWindow` + `trainingPersistence` + `dailyGate` ; `e2e/archive.shared.spec.ts` (inclut le refus serveur des dates futures) |
| Contraintes / pool / scheduler | `pnpm simulate:scheduling` ; pour observer sur données réalistes : `pnpm dump:prod` puis régénération via `/admin` (`refreshPool`) — **pas** `wipe`+`seed` |
| Schéma ou API Convex | `pnpm convex:dev` / codegen + commiter `convex/_generated/` |
| Texte utilisateur | clés `fr` + `en` via `translate()` |
| Nouvel event analytics | grep catalogue §10 / code existant |
| Convention / commande / flux documenté | mettre à jour `AGENTS.md` ou `README` si pertinent (cf. §4 Documentation) |

**E2E — conventions.** `*.shared.spec.ts` → tous navigateurs ; `*.desktop.spec.ts` → Chromium ; `*.mobile.spec.ts` → profils mobile. Workers sérialisés. Voir [`playwright.config.ts`](playwright.config.ts).
