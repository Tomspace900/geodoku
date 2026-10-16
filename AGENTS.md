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

**Mode entraînement (`/archive`).** Les grilles des **7 derniers jours** (J-1 → J-7) sont rejouables une fois la partie du jour terminée — sinon la route **redirige vers l'accueil de sa langue** (garde d'expérience, pas de sécurité : l'endpoint est public et sans identité). Essais **illimités** : on compte les essais ratés au lieu de décompter des vies, donc une partie ne se perd que par **blocage**. Les cases se colorent normalement, sur la **cohorte figée** du jour concerné (complète → score exact et stable, sans marqueur « ≈ »). **Cohorte close ⇒ un pays absent de la distribution vaut une part de 0, donc ultra** (`isCohortComplete` / `filledCellShare`, [`rarity.ts`](src/features/game/logic/rarity.ts)) : sur une grille passée l'absence est définitive et signifie « personne ne l'a choisi », alors que sur la grille du jour elle signifie « pas encore » : le coup du joueur, envoyé en arrière-plan, n'est pas encore agrégé, et on l'ajoute localement (`1 / (total + 1)`, marqué « ≈ ») pour que badge et score ne restent jamais en attente d'un envoi qui n'arrive pas. Sans cette distinction, un pays inédit n'avait aucun badge **et laissait le score bloqué sur `null`** — c'est la même lecture que la grille solution, qui applique `rarityByCountry[iso] ?? 0` depuis toujours. Score sur **900** : grille + rareté, part vies neutralisée, avec le nombre d'essais affiché à part ([`TrainingResultScreen`](src/features/archive/components/TrainingResultScreen.tsx)). Titres de fin réutilisés du quotidien (paliers calibrés sur /1000, donc le haut du barème sort plus rarement — assumé). **Pas de partage** (les emojis n'ont de sens comparés que le même jour), pas de notation de difficulté, et surtout **aucune écriture Convex** : les cohortes passées restent pures et le seam `guesses.isReplay` reste dormant. Une date future (ou aujourd'hui) est refusée **côté serveur et côté client** — `classifyReplayDate` ([`replayWindow.ts`](src/features/game/logic/replayWindow.ts)) est le module pur partagé par les deux ; un petit malin qui bricole l'URL tombe sur `ErrorScreen variant="time-traveller"`.

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

**Choix assumés et non négociables.** Pas de state manager externe : `useReducer` + `Context`. Pas de TanStack Query. Pas de Zod. Pas de date-fns : dates en `YYYY-MM-DD` ([`src/lib/dates.ts`](src/lib/dates.ts)). Routage déclaratif minimal avec React Router ([`src/App.tsx`](src/App.tsx)) : accueil, `/about`, `/privacy`, `/changelog` et `/archive[/:date]`, chacune sous chaque langue (`/fr/…`, `/en/…`, §4 i18n), plus `/admin`. Jeu et pages éditoriales eager, archive et admin chargées en lazy.

## 3. Architecture

```
content/                  # snapshot de contenu versionné, TERMINAL (n'importe rien de src/convex)
  README.md               # carte du dossier + modèle facts → dérivation → listes
  sources.ts               # registre des sources externes (nom, URL, millésime), partagé par les about.ts
  countries/              # catalog (identité) + countryCodes + facts + popularity (générés, datés) + SOURCE.md
  constraints/            # index (registre typé) + derivations (prédicats) + abouts.ts (registre "à propos") + SOURCES.md + <id>/{answers.ts, about.ts, SOURCE.md}
src/features/<feature>/   # game, archive, countries, admin, legal, errors
  logic/                  # pur, testé, zéro React/Convex
  testing/                # simulation partagée par Vitest/E2E/scripts
  hooks/                  # glue logique + Convex + React
  components/             # consomment l'état, dispatchent des actions
convex/                   # schema, grids, guesses, scheduling, seed, crons
convex/lib/               # gridGenerator, gridScheduler, gridConstants (purs)
scripts/content/            # dérivation & garde du snapshot content/ (check-content, build-answers, emit)
scripts/build/              # pré-rendu au build (prerender, pageHead), appelé par vite.config.ts
scripts/ci/                 # exécutés en CI (check-bundle-size, check-design-system)
scripts/countries/          # pipeline contenu pays (build-countries, flagData, patches)
  harvest/                # récoltes réseau isolées (Wikidata…) → data/*.ts committé, relu en diff
  data/                   # datasets de faits datés (curés ou récoltés)
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
- `content/` est **terminal** (n'importe rien de `src/`, `convex/`, features), et à l'intérieur du dossier tous les imports sont **relatifs internes**. La règle est vérifiée par `validateContentSeam` (`pnpm check:content`) : ni `tsx` ni Vite ne la feraient échouer — ils résolvent les `paths` du tsconfig — et le typecheck Convex ne couvre que la part de `content/` qu'il importe. Les imports **vers** `content/` depuis `src/`, `convex/`, `scripts/` et `e2e/` sont eux aussi toujours relatifs (`../../content/…`), jamais l'alias `@/` : le bundler Convex ne résout pas les `paths`. `src/features/countries/types.ts` réexporte `Country` depuis `content/countries/type` pour garder l'import familier `@/features/countries/types` ; les scripts du pipeline, en **amont** de `content/`, importent `content/countries/type` directement.
- **Vies = union discriminée** `LivesState` ([`types.ts`](src/features/game/types.ts)), jamais un compteur nu : `{kind:"limited",remaining}` en daily, `{kind:"unlimited",failedAttempts}` en entraînement. Toute lecture passe par [`logic/lives.ts`](src/features/game/logic/lives.ts) — le reducer, le score et la persistance n'ont donc **aucune branche de mode**. Le format persisté du daily garde en revanche un `remainingLives` numérique (compatibilité du shadow v2).
- `archive` dépend de `game` (reducer, validation, composants de grille), jamais l'inverse. Les sanitizers d'entraînement vivent dans `game/logic/sanitizePersisted.ts` et prennent des **primitives**, pour que le domaine du jeu ignore la feature `archive`.

**Contenu (pays, contraintes, pool).** Règles critiques :

- **Archiver, jamais supprimer** une contrainte (`ARCHIVED_CONSTRAINTS` + `CONSTRAINT_BY_ID` pour replay).
- Une contrainte **active** n'a pas de prédicat runtime : sa liste ISO3 est **dérivée** de [`content/constraints/derivations.ts`](content/constraints/derivations.ts) sur le snapshot de faits, **générée** par `pnpm build:answers` dans `content/constraints/<id>/answers.ts`, **committée** et relue en diff. `matchesConstraint(id, iso3)` lit cette liste. `pnpm check:content` (job `quality`) échoue si un `answers.ts` est obsolète.
- Les 12 listes **archivées** sont figées à la main (pas d'en-tête `@generated`), hors dérivation.
- **Périmètre territorial** : un pays inclut son territoire **pleinement intégré**, et rien d'autre (DOM français, Canaries, Açores, Jan Mayen, îles BES… ; pas les territoires britanniques d'outre-mer, la Polynésie, le Groenland ni Heard-et-MacDonald). Règle commune à toutes les familles géographiques — volcans, océans, fuseaux, relief — écrite une fois dans [`content/constraints/SOURCES.md`](content/constraints/SOURCES.md) et qui prime sur le découpage de la source. Sans elle, chaque dataset imposait sa convention : le Royaume-Uni « possédait un volcan » par Tristan da Cunha pendant que la France n'avait qu'un fuseau horaire.
- Contraintes **en réserve** (`RESERVE_CONSTRAINT_IDS`, [`content/constraints/index.ts`](content/constraints/index.ts)) : conçues et sourcées mais écartées du jeu actif (arbitrage gameplay). **Ni** générables **ni** rejouables — volontairement hors de `ConstraintId` (un id de réserve dans une grille échoue bruyamment) ; seul leur `SOURCE.md` subsiste (`status: archived`, sans `answers.ts`). `check:content` garde présence + absence d'`answers.ts` + non-chevauchement. Réactivation : réintroduire dans `CONSTRAINTS` + `derivations.ts` + i18n, puis `pnpm build:answers`.
- Chaque contrainte porte un `SOURCE.md` (définition, dérivation, cas limites) ; le socle (`constraints/SOURCES.md`, `content/README.md`, `content/countries/SOURCE.md`) porte le principe et la provenance par famille de champs. `check:content` vérifie présence et frontmatter.
- Chaque contrainte active/archivée porte aussi un `about.ts` (source(s) + millésime, `basis` `source`/`convention`, clarification ≤ 160 caractères sans nom de pays hors libellé) — c'est ce texte, pas le `SOURCE.md`, qu'affiche le toast joueur au tap sur un en-tête de contrainte. Registre séparé [`content/constraints/abouts.ts`](content/constraints/abouts.ts) : **jamais** dans `index.ts`, que Convex importe — les textes joueur n'ont rien à faire côté serveur. Sources externes centralisées dans [`content/sources.ts`](content/sources.ts). Gardé par `validateConstraintAbouts` (`pnpm check:content`).
- Deux leviers pour réviser une contrainte active : la **définition** change → `derivations.ts` (+ `CONSTRAINTS`) ; une **donnée** est fausse → curation (`countryPatches.ts`, `flagData.json`) ou `pnpm build:countries`. Jamais `answers.ts` à la main.
- `content/countries/facts.ts` est **généré** : les champs dérivés des datasets de `scripts/countries/data/` (fuseaux, volcans, relief, forêt, centres urbains, rangs de production, charbon, souveraineté, point culminant, indicateurs WDI, IDH, éditions des événements) sont re-fusionnés par `check:content` ([`validateDatasetFacts.ts`](scripts/countries/validateDatasetFacts.ts)) — un dataset révisé sans `pnpm build:countries`, ou une édition à la main, échoue en CI. Les champs venus du réseau (population, capitales, adhésions, pageviews) n'ont d'autre juge que la regen.
- [`content/countries/factProvenance.ts`](content/countries/factProvenance.ts) déclare la provenance de chaque **ligne affichée de la fiche pays** (`SheetRowId`, pas `keyof CountryFacts` : un champ composite se décompose en lignes de sources distinctes), même union `basis` + `SourceId[]` que les `about.ts`. Aucun écran ne la lit : la fiche pays (#125) est retirée de `develop` et sa branche `fiches-pays` la reprendra — la donnée et ses gardes restent pour elle. Une ligne qui recoupe une contrainte reprend la provenance de son `about.ts` (test [`factProvenance.test.ts`](content/countries/__tests__/factProvenance.test.ts)) ; `validateFactProvenance` compte ses sources dans la garde « source référencée ».
- Les faits sont chargés en **lazy** : seul [`countrySheetData.ts`](src/features/countries/logic/countrySheetData.ts) importe `content/countries/facts.ts` côté joueur, pour `getConstraintValues` (préchargé au montage de la grille solution). `check:bundle` ([`check-bundle-size.ts`](scripts/ci/check-bundle-size.ts)) échoue si `facts.ts` atteint le graphe initial. Les noms `countrySheet*` restent ceux de la future fiche (#125).
- **Histoire.** `history_from_*` lisent `dominations`, dataset curé [`historicalDominations.ts`](scripts/countries/data/historicalDominations.ts) : un pays passé **un jour** sous la puissance compte, et non le seul souverain *immédiatement antérieur* du Factbook (`formerSovereigns`, que plus aucune contrainte ne lit). Règles d'inclusion dans [`SOURCES.md`](content/constraints/SOURCES.md#histoire-et-souveraineté), chaque refus gardé dans `excluded` avec sa règle ; une année qu'aucune source ne donne reste `null`, jamais estimée. `formerSovereigns` reste gardé pour la fiche par [`validateSovereigntySources.ts`](scripts/countries/validateSovereigntySources.ts) : une omission ne s'accepte que motivée dans `ACCEPTED_OMISSIONS`.
- **Valeur d'une contrainte** ([`constraintValue.ts`](src/features/countries/logic/constraintValue.ts)) : sous chaque pays, le Drawer de la grille solution affiche ce que le fait dit *en plus* du libellé (« 2ᵉ producteur de cacao », « 59 % de forêt ») — `null` quand la valeur répéterait le libellé. Une extraction par contrainte, `satisfies Record<ConstraintId, …>` : une contrainte ajoutée sans décision ne compile pas. **Une contrainte archivée n'a jamais de valeur** : sa liste est figée alors que les faits se régénèrent, la valeur courante la contredirait (le Salvador à 287 hab./km² dans « > 300 »). Lue dans le chunk lazy des faits (`getConstraintValues`), jamais depuis `facts.ts` directement. Les lignes du Drawer sont de l'information, pas des boutons.
- Après un levier : `pnpm build:answers` → relire le diff ISO3 → `pnpm simulate:scheduling` → régénération du pool via `/admin` si OK.
- Le snapshot `content/countries/` (identité, faits, popularité) est régénéré par `pnpm build:countries` (réseau), qui enchaîne `build:answers`.
- **Récoltes réseau** (`scripts/countries/harvest/`, `pnpm harvest:capitals` / `highest-points` / `world-bank` / `hdi` / `forest`) : un script par source, séparé de `build-countries`, qui écrit un dataset de `scripts/countries/data/` relu en diff puis committé ; `build:countries` le fusionne hors-ligne. Overrides curés avec motif obligatoire, préservés à chaque récolte ; jamais de repli silencieux (une capitale sans libellé fr/en passe en override). Chaque récolte imprime le millésime à reporter à la main dans `content/sources.ts`, que `validateSourceVintages` (`check:content`) compare exactement au dataset. Détail par source : [`docs/content-pipeline.md`](docs/content-pipeline.md).
- Drapeaux → [`scripts/countries/flagData.json`](scripts/countries/flagData.json) curé, pas d'heuristique.

Détail complet : [`docs/content-pipeline.md`](docs/content-pipeline.md).

## 4. Conventions de code

**TypeScript.** `strict: true`. Pas de `any`. Préférer `type` aux `interface`. Unions discriminées plutôt qu'optionals. Pas de `// @ts-ignore`.

**React.** Fonctions pures > `useMemo`/`useCallback` par défaut. Un module React public principal par fichier, avec exports nommés ; helpers privés colocalisés. Pas de classes, sauf Error Boundaries imposées par l'API React.

**Style.** `forEach`/`flatMap` plutôt que `for...of` sauf `break`/`await`. Fonctions nommées pour les exports de logique. Commentaires en français (business), anglais (algos). Pas de magic numbers.

**Imports.** Alias `@/` pour `src/`. Biome gère l'ordre.

**i18n.** Tout texte joueur via `translate()` ([`src/i18n/`](src/i18n/)). Ajouter les clés dans `locales/fr.ts` **et** `en.ts`. Contraintes actives + archivées couvertes par le test `translate`.

**La langue vient de l'URL, et toutes les langues sont au même niveau** (#140, [`localePath.ts`](src/i18n/localePath.ts)) : `/fr/…`, `/en/…`, `/admin` hors i18n. Aucune langue n'est « par défaut » : le jeu vise un public international, et la première version (français à la racine, anglais sous `/en`) faisait arriver en français un anglophone qui tapait l'adresse. Ajouter une langue = l'ajouter à `LOCALES` et traduire. Les adresses **sans langue** (`/`, `/about`, `/privacy`, `/changelog`, `/archive…`) n'ont pas de page : le middleware Vercel [`middleware.ts`](middleware.ts) les redirige en 302, avant tout affichage, vers la même page dans la langue du visiteur — son choix (cookie `geodoku_locale`), sinon `Accept-Language`, sinon l'anglais (`preferredLocale`). Elles sont le `x-default` des `hreflang` ; Googlebot, sans langue, part vers l'anglais et découvre le reste par les `hreflang` et le sitemap. Son matcher est un littéral (lu statiquement par Vercel) : une nouvelle page publique doit y être ajoutée, ce que garde `middleware.test.ts`. En dev (pas de middleware), `HomeRedirect` ([`App.tsx`](src/App.tsx)) fait le même choix côté client pour `/` et les adresses inconnues. Tout lien interne passe par `localizedPath` (`useLocale`), jamais un chemin en dur. Le choix du joueur (sélecteur FR/EN ou toast) vit dans un **cookie** et non en localStorage, pour que le middleware le lise ([`localeCookie.ts`](src/i18n/localeCookie.ts)) ; l'ancienne clé `geodoku:locale` n'est plus lue que pour y être recopiée une fois. Un **lien direct** (`/en/about`) affiche toujours la page demandée : quand la langue du joueur en diffère, [`LocaleSuggestionToast`](src/i18n/components/LocaleSuggestionToast.tsx) la propose, rédigé dans la langue proposée (`suggestedLocale`) — on suggère, on ne redirige pas, comme le recommande Google. Pour la suggestion, l'ordre est **choix, puis pays, puis navigateur** : le middleware transmet la langue du pays de connexion (`x-vercel-ip-country` → `countryLocale`, cookie de session `geodoku_country_locale` qui ne contient que la langue). Ainsi un téléphone réglé en anglais à Bordeaux est redirigé vers `/en` (le navigateur décide de la redirection) puis se voit proposer le français. Seuls les pays à langue dominante claire comptent : Belgique, Suisse, Canada et Luxembourg ne suggèrent rien. Le lien de partage est la racine `geodoku.app` : qui le reçoit arrive dans sa propre langue.

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

**Endpoints jeu** ([`convex/grids.ts`](convex/grids.ts), [`guesses.ts`](convex/guesses.ts)) : `getTodayGrid`, `submitTodayGuess`, `recordTodayFailedGuess`, `getTodayGuessDistribution`, `recordTodayGameEnd`, `submitTodayGridFeedback`. Chaque écriture reçoit un `operationId` idempotent. **Saisie local-first** : un bon pays est validé contre `validAnswers` côté client, la case se remplit tout de suite et `submitTodayGuess` part en arrière-plan ([`useGameState`](src/features/game/hooks/useGameState.ts)) ; un envoi sans accusé reste dans les opérations en attente et est rejoué au chargement suivant, avec le même `operationId`. D'où l'argument `date` de `submitTodayGuess` : un coup rejoué après minuit UTC est refusé (`date_mismatch`) au lieu d'être compté sur la grille du lendemain, sauf s'il avait déjà été compté (son reçu est renvoyé).

**Endpoints archive** (mode entraînement, **lecture seule**) : `getReplayableGrids` (J-1 → J-7, **sans `validAnswers`** — la liste ne doit rien révéler) et `getReplayGrid({date})` (grille + réponses). Ce dernier est gardé par `assertReplayableDate` ([`gameWriteValidation.ts`](convex/gameWriteValidation.ts)) : **le refus des dates `>= todayUTC()` est le point critique** — sans lui, `/archive/<demain>` livrerait la grille du lendemain avec ses réponses. Une date hors fenêtre **lève** ; une grille absente renvoie `null` (trou de données, pas une demande illégitime). La rareté figée est lue via `guesses.getGuessDistributionForDate` — promu de « legacy à supprimer » à endpoint du parcours joueur. Aucune mutation, donc aucun rate-limit ni `operationId` sur ce chemin.

**Endpoints admin** (token `ADMIN_TOKEN`) : `getScheduledGrids`, `getGridCellMetrics`, `getPoolStats`, `refreshPool`, `retryPoolFinalization`, `runEnsureTomorrow`, etc. Après activation, `refreshPool` retourne d'éventuels warnings de finalisation ; leur retry ne doit jamais relancer une génération.

**Rate limiting** ([`convex/rateLimit.ts`](convex/rateLimit.ts)) : clé `clientId` (localStorage), buckets `guess` + `feedback`.

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
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:reset               # environnement dev perso jetable uniquement

# Build
pnpm build

# Contenu & pool
pnpm build:countries             # regen réseau du snapshot content/ (+ enchaîne build:answers)
pnpm build:answers               # re-dérive content/constraints/<id>/answers.ts (hors-ligne)
pnpm check:content               # cohérence content/ (job quality + pre-commit) : obsolescence des listes + fraîcheur des faits dérivés + cohérence souveraineté + seam terminal + provenance SOURCE.md + sources des contraintes (about.ts)
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

**Pre-commit** ([`.husky/pre-commit`](.husky/pre-commit)) : `lint-staged` (Biome sur fichiers stagés, auto-fix + re-stage) → si fichiers stagés : `typecheck` → `pnpm test` → `pnpm check:content` (~1 s, attrape l'oubli de `build:answers` avant l'aller-retour CI) (skip si rien en stage, ex. `amend --no-edit`). Pas d'e2e (trop lent) — e2e en CI. `core.hooksPath` posé au `pnpm install` (`prepare`). Bypass : `git commit --no-verify` ou `HUSKY=0`.

## 8. CI, Vercel et `convex/_generated`

**GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) :

- `quality` (sans secret) — lint, typechecks, Vitest, design system et bundle. Push `main`/`develop` + PR vers `main`/`develop`.
- `e2e` — Playwright contre `vars.VITE_CONVEX_URL` = deploy `preview/develop`, d'adresse fixe (cf. ci-dessous). Pas de deploy key ni seed (develop déjà seedé, cron horaire). **Sérialisé** (`concurrency: e2e-develop`). ⚠️ soumet de vrais guesses → bruite les stats develop (staging assumé). **Sauté sur les PR Dependabot** (`github.actor`) pour cette raison précise : un bump de dépendance ne vaut pas de polluer les stats de staging. Le build reste couvert, `quality` lançant `check:bundle` (qui fait un `vite build`), et la suite complète tourne au merge dans `develop`.

**Mapping branche → environnement :**

| Contexte           | Front             | Backend Convex                 | Données                    |
| ------------------ | ----------------- | ------------------------------ | -------------------------- |
| `main`             | Vercel Production | prod                           | persistantes               |
| `develop`          | Vercel Preview    | `preview/develop` (n'expire jamais) | persistantes               |
| autre branche WIP  | Vercel Preview    | `preview/<branch>`             | seedées auto au 1er deploy, expirent après 5 j |
| `dependabot/*`     | aucun déploiement | aucun                          | —                          |
| local              | `pnpm dev`        | cloud dev perso (`convex dev`) | gérées manuellement        |

**`preview/develop` ne doit jamais expirer.** Convex supprime un preview deployment
5 jours après sa création sur les offres Free/Starter (14 jours sur les offres
payantes), quelle que soit l'activité. Pour `develop`, cela changeait l'adresse
(et cassait `vars.VITE_CONVEX_URL`) et effaçait les données tous les 5 jours :
le déploiement est donc réglé pour ne jamais expirer dans le dashboard Convex,
depuis le 2026-10-20. Recréé ce jour-là (`seed:autoSeedIfEmpty`), il a été
réaligné sur la prod par `pnpm dump:prod-to-develop` le même jour. Aucun outil ne
resynchronise l'adresse : si les e2e ne joignent plus Convex, c'est que ce réglage
a sauté. Les previews des autres branches expirent
toujours après 5 jours, et c'est voulu : elles sont jetables.

L'`ignoreCommand` de [`vercel.json`](vercel.json) coupe le déploiement des branches `dependabot/*` : sans lui, chaque bump de patch créait un preview Vercel **et** un déploiement Convex preview jetables.

**Suppression des branches.** Le repo supprime la branche de tête après merge (`delete_branch_on_merge`), ce qui nettoie les branches de travail et Dependabot. `develop` en est exemptée par le ruleset « develop — suppression interdite », dont la seule règle est l'interdiction de suppression : les push forcés après rebase restent permis. Sans lui, le merge d'une PR `develop → main` supprimait `develop` (2026-10-15), et GitHub redirigeait alors vers `main` les PR qui la visaient. `main` est gardée par son propre ruleset, « Main protection ».

**Dependabot** ([`.github/dependabot.yml`](.github/dependabot.yml)) — cible `develop` (le flux est `develop → main`, une PR sur `main` serait inmergeable), cadence mensuelle, **un seul groupe prod+dev** : des groupes séparés bloquent les bumps couplés (`convex-test` exige un `convex` récent). Les **majeures npm sont ignorées** — elles demandent du code à adapter et se font délibérément, pas en cliquant une PR. Avant une majeure, lire ses `peerDependencies` : React Router 8 exige React ≥ 19.2.7 et a tourné deux mois sur React 18 sans que rien ne casse à l'écran, jusqu'au pré-rendu ; il reste en 7.x tant que React 19 n'est pas passé. Majeures en attente : #144. `world-countries` est ignoré entièrement : c'est une source du snapshot `content/countries/`, que `check:content` confronte aux monnaies et gentilés committés — il se met à jour avec `pnpm build:countries`, jamais par un bump isolé.

**Build Vercel :**

```bash
pnpm exec convex deploy --preview-run seed:autoSeedIfEmpty --cmd 'vite build' --cmd-url-env-var-name VITE_CONVEX_URL
```

`--preview-run` seed uniquement en preview, jamais en prod. Clé : `CONVEX_DEPLOY_KEY` par environnement.

Le CLI Convex exécute d'abord `--cmd 'vite build'`, puis pousse les fonctions,
index et schéma. Vercel n'expose toutefois le bundle qu'après le succès de la
commande complète : le push Convex précède donc toujours l'exposition du nouveau
frontend aux joueurs, et un échec du push fait échouer le déploiement Vercel.

**Pré-rendu** (#139). Tout `vite build` se termine par le plugin `geodoku-prerender`
([`vite.config.ts`](vite.config.ts), [`scripts/build/prerender.ts`](scripts/build/prerender.ts)) :
build SSR de [`src/entry-server.tsx`](src/entry-server.tsx), puis un vrai HTML par page
publique et par langue (`PRERENDERED_PAGES`, [`pageMeta.ts`](src/app/pageMeta.ts)), avec
titre, description, canonical, `hreflang` et `og:image:alt` propres à la page ; l'accueil seul
porte les données structurées (JSON-LD, `structuredData`), dans sa langue. Les robots des moteurs IA
n'exécutent pas le JavaScript : sans ce HTML, ils ne voyaient qu'un `<div id="root">` vide.
Une modale ne passe pas au pré-rendu : `HowToPlayLink` y ajoute donc ses règles, sous
`import.meta.env.SSR`, masquées à l'écran (`sr-only`) — le contenu exact de la modale ouverte
aux nouveaux visiteurs, absent du rendu client, sans rien changer à l'affichage.
Le client garde `createRoot().render()` ; le HTML servi est l'app en chargement, déjà
stylée, que React remplace par un rendu identique. Fichiers au format `cleanUrls` de
[`vercel.json`](vercel.json) (`fr/privacy.html`, `en/privacy.html`…), avec `trailingSlash: false` : `/fr/privacy/`
est redirigé vers `/fr/privacy`, une seule adresse par page. Les adresses sans langue n'ont
pas de fichier (middleware, §4 i18n) ; `index.html` n'est que le gabarit. Les autres routes du SPA
(`/fr/archive…`, `/en/archive…`, `/admin`) sont réécrites vers `/app-shell` (le fichier
`app-shell.html` ; avec `cleanUrls`, viser `.html` donne un 404), le gabarit vide, pour ne
pas afficher l'accueil avant `/archive` ; son en-tête ne décrivant aucune page réelle, ce
gabarit porte un `noindex`. **Toute nouvelle route du SPA doit y être ajoutée**,
sinon elle répond 404 : le reste reçoit `404.html`, ce même gabarit avec un vrai statut 404
(#141) — le joueur est renvoyé vers l'accueil, un robot voit une page inexistante.
`sitemap.xml` est généré depuis les pages pré-rendues, jamais écrit à la main. Sous
Node, rien ne doit toucher au navigateur au chargement d'un module. Le client Convex y
reçoit une adresse factice (`import.meta.env.SSR`, branche absente du bundle navigateur) :
il ne se connecte qu'à la première souscription, qui n'a jamais lieu au pré-rendu, donc
le build n'a besoin ni du réseau ni de `VITE_CONVEX_URL`, que le job `quality` de la CI
n'a pas.

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

**Init** ([`src/main.tsx`](src/main.tsx)) : `autocapture: false`, `persistence: "localStorage"` (pas de cookies). **Pas d'init sans jeton** : les previews Vercel n'ont volontairement pas de `VITE_POSTHOG_PROJECT_TOKEN` (stats non polluées), chaque appel posthog y est un no-op. Pas de `identify()`, pas de PII. Tenir [`/privacy`](src/features/legal/PrivacyPage.tsx) à jour.

**Conventions.** Events `snake_case`, passé (`game_completed`). `posthog?.capture(...)` avec optional chaining. `grid_date` sur events partie. **Vérifier le catalogue avant d'en ajouter.**

| Domaine | Events |
| ------- | ------ |
| Partie | `game_started`, `session_resumed`, `cell_opened`, `guess_submitted` (émis à l'accusé serveur, avec `replayed` et `submit_latency_ms` hors rejeu), `guess_failed`, `game_completed` (n'émet plus `grid_score_percent` — dérivable de `filled_cells`+`lives_left`) |
| Saisie | `guess_modal_closed` |
| Résultat | `result_screen_viewed`, `result_shared` (portent `score_total`/`score_grid`/`score_rarity`/`score_lives` — les anciens `originality_*`/`grid_score_percent` sont **retirés**, groupements dashboards à recréer), `difficulty_rated`, `solution_viewed`, `scoring_info_opened` (prop `source`: `result_screen`) |
| UI | `how_to_play_*`, `locale_changed` (prop `source`: `footer`/`suggestion`), `locale_suggestion_shown` / `locale_suggestion_dismissed` (props `from`/`to`/`basis` : `choice`/`country`/`browser` ; toast de suggestion d'une autre langue, #140 — `locale_changed` venu du toast porte aussi `basis`), `footer_link_clicked`, `survey_link_clicked` / `survey_dismissed` (props `source`: `result_screen`/`solution_screen`/`footer` et `survey_id` ; banderole sondage post-partie via `SurveyCta` — écran de résultat sous le partage + écran de solution — gated par feature flag PostHog `survey_active` ; `geodoku:survey-done` mémorise l'interaction **par sondage** (`SURVEY_ID`, à changer avec les URLs : un clic sur l'ancien sondage ne masque pas le nouveau) et dissocie clic (masquage définitif, cf. `isSurveyDone`) et fermeture (masquage du jour courant, réapparaît le lendemain, plus du tout après `MAX_SURVEY_DISMISSALS` fermetures) ; lien permanent et discret dans `AppFooter` (même flag, toujours affiché quel que soit `geodoku:survey-done`, mais un clic dessus masque aussi la banderole) pour rester accessible aux joueurs qui changent d'avis après avoir fermé la banderole) |
| Sources | `constraint_source_viewed` (`grid_date`, `mode`: `daily`/`training`, `surface`: toujours `playing`, `constraint_id`) — tap sur un en-tête de contrainte **en jeu uniquement** (toast de source, [`useConstraintSourceToast`](src/features/game/hooks/useConstraintSourceToast.ts)) ; sur la grille solution, l'en-tête ouvre le Drawer de contrainte à la place (`solution_constraint_opened`, ci-dessous) — `surface` reste dans l'event pour ne pas casser les groupements existants, bien qu'il ne prenne plus qu'une seule valeur |
| Grille solution | `solution_cell_opened` (`grid_date`, `mode`, `cell`, `answer_count`) et `solution_constraint_opened` (`grid_date`, `mode`, `constraint_id`, `answer_count`) — tap sur une case ou un en-tête de la grille solution, qui ouvre le Drawer partagé ([`useSolutionDrawer`](src/features/game/hooks/useSolutionDrawer.ts)). Les deux events sont **partagés** daily/entraînement, distingués par `mode`, jamais émis en cours de partie (la grille solution n'existe qu'une fois `status !== "playing"`). `country_sheet_opened` est retiré avec la fiche pays (#125) ; il reviendra avec elle. |
| Entraînement | `archive_opened`, `training_started` (`grid_date`, `resumed`, `restart`), `training_completed` (`grid_date`, `outcome`, `filled_cells`, `failed_attempts`), `training_result_viewed` (`grid_date`, `outcome`, `score_total`/`score_grid`/`score_rarity` sur 900, `failed_attempts`) — **noms distincts des events daily** pour ne pas corrompre les groupements existants. Corollaire : le mode entraînement n'émet **aucun** event daily, `cell_opened` compris (il alimente le tunnel du quotidien) ; `game_started`/`game_completed`/`result_screen_viewed`/`cell_opened` restent daily-only. `scoring_info_opened` et `constraint_source_viewed` sont partagés, distingués par leur prop `mode`/`source`. |
| Légal | `legal_page_viewed`, `legal_page_left` (prop `page` : `privacy`, `changelog`, `about`) |
| Fiabilité | `backend_timeout_shown`, `$exception` |

Source de vérité détaillée : grep `posthog?.capture` dans le code.

## 11. Checklist avant PR / fin de ticket

**Toujours**

- `pnpm lint` et `pnpm test` (aussi exécutés au pre-commit Husky)
- Issue référencée dans le commit, et sous-issue **fermée à l'arrivée sur `develop`** avec son statut « Sur develop » (cf. §12)

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

**Après un merge de contenu dans `main` : régénérer le pool en production.** Le
refill automatique n'a lieu qu'en dessous de `POOL_LOW_THRESHOLD` (50 candidats,
[`gridConstants.ts`](convex/lib/gridConstants.ts)) — avec ~950 grilles en stock
et une par jour, ce seuil n'arrive jamais. Une contrainte ajoutée, une liste
re-dérivée ou un fait corrigé **ne parviennent donc à aucun joueur** tant que
« Regénérer le pool » (`refreshPool`) n'a pas été lancé dans `/admin` sur la prod.
Aucune garde ne le signale : `getGridContentIssue` vérifie la validité des grilles
futures, pas leur fraîcheur éditoriale. Les grilles déjà publiées restent
protégées par `gridAnswers`.

## 12. Suivi des tâches (issues GitHub)

Le suivi vit dans les **issues GitHub** du repo et dans le Project
[Geodoku](https://github.com/users/Tomspace900/projects/1) (privé). Plus de Kanban
Markdown : un bug, une idée ou un chantier sans issue n'est pas suivi. Un correctif
trivial peut s'en passer.

- **Une tâche = une issue**, avec un label de type : `bug`, `feature`, `ux`,
  `contenu`, `tech`, `admin`, `analytics`, `release`, `idée`. Un gros chantier est
  une issue `epic` découpée en **sous-issues**, avec un **milestone** s'il avance par
  lots (refonte du contenu #38 → P4 #42, milestone « P4 — Fiches pays », un lot par
  sous-issue).
- **Champs du Project** : `Status` (Backlog · Prêt · En cours · Sur develop · En prod ·
  Abandonné) et `Priorité` (🔴 Haute · 🟠 Moyenne · 🟢 Basse). Une issue ouverte entre
  seule dans le Project, en Backlog ; la priorité se pose à la main.
- **Cycle de vie** : « En cours » au démarrage. Une **sous-issue se ferme dès que son
  travail arrive sur `develop`** (statut « Sur develop »), à la main : `gh issue close N
  --comment "<hash>"`, car `Closes #N` ne ferme qu'au merge dans `main`, la branche
  par défaut. L'**issue principale** du chantier (epic) et son issue de mise en prod
  restent ouvertes jusqu'à la prod : la PR `develop → main` porte `Closes #<epic>`,
  puis toutes les sous-issues passent en « En prod ». Le workflow « Item closed » du
  Project doit donc poser « Sur develop », pas « En prod ». Abandon : fermer en
  « not planned » et passer en « Abandonné ».
- **Plans longs** : un plan d'exécution peut vivre dans `docs/` le temps du chantier,
  avec son issue comme point d'entrée. À la mise en prod, ses décisions durables
  passent dans `AGENTS.md`, `content/constraints/SOURCES.md` ou
  `docs/content-pipeline.md`, ses points ouverts dans des issues, et le plan est
  retiré : l'historique git le garde. Une décision durable ne vit jamais
  seulement dans un commentaire d'issue.
- **Repo public** : rien de privé dans une issue ni un commentaire. Pas de chiffres du
  sondage joueurs (ses docs sont gitignorés), pas de données de prod, pas de secrets.
