# Geodoku — Guide du projet

## 1. Le projet en une page

Geodoku est un mini-jeu web quotidien inspiré de Wordle et du Sudoku, sur le thème de la géographie.

**Principe.** Chaque jour, une grille 3×3 est proposée à tous les joueurs. Chaque ligne et chaque colonne impose une contrainte géographique (ex: « Asie », « Enclavé », « Plus de 50M d'habitants », « Frontalier de la France »). Pour chacune des 9 cases, le joueur doit trouver un pays qui valide **simultanément** la contrainte de sa ligne et celle de sa colonne. Il dispose de **5 vies** et ne peut pas réutiliser deux fois le même pays. Une case dont tous les pays valides ont déjà été placés ailleurs devient **bloquée** (impossible à remplir) ; la partie se termine quand les vies tombent à zéro **ou** quand plus aucune case n'est remplissable.

**Le twist — rareté.** Plus le pays trouvé est rare (parmi les choix des autres joueurs de la journée), plus le tier de rareté est élevé (🟪 commun → 🟥 ultra). Un joueur qui remplit « Asie × Enclavé » avec « Bhoutan » obtient un meilleur tier qu'avec « Mongolie ».

**Deux scores indépendants (V2).** Voir `[src/features/game/logic/rarity.ts](src/features/game/logic/rarity.ts)` et `[constants.ts](src/features/game/logic/constants.ts)`.

- **Grille** (`computeGridScore`) : `(cellules remplies + vies restantes) / 14` → pourcentage 0–100 % (9 cases + 5 vies = 14 points max). Mesure la performance de la partie.
- **Originalité** (`computeOriginalityScore`) : moyenne des valeurs de tier sur les **cases remplies** uniquement (grille vide = 0) — **découplé de la complétion** (que mesure déjà le score de grille) : ne juge que la qualité des choix faits. Valeurs : common 0, uncommon 40, rare 70, ultra 100. Grades : **S ≥ 70 · A ≥ 50 · B ≥ 30 · C ≥ 12 · D < 12**. Conséquence assumée : peu de cases mais toutes rares → score élevé (le score de grille raconte l'incomplétion).

**L'enjeu communautaire.** À la fin, le joueur partage sa grille sous forme d'emojis colorés (🟪🟦🟨🟥⬜⬛) avec `percent% · grade` (ex. `67% · A`), à la manière de Wordle. `⬛` = cases bloquées ; `⬜` = cases non remplies en défaite. Le partage (`[share.ts](src/features/game/logic/share.ts)`) ouvre la **feuille native** (Web Share API) **uniquement sur appareil tactile** (`canUseNativeShare` = `navigator.share` **et** pointeur principal `coarse` / `maxTouchPoints > 0`) et retombe sur le **presse-papiers** sur desktop et sur les navigateurs sans Web Share. Décision assumée — **ne pas** dégater vers « feuille native dès que `navigator.share` existe » : Safari/Chrome desktop l'exposent aussi, mais y ouvrir la feuille système est déroutant. `share_method` (`native`/`clipboard`) part dans l'event PostHog `result_shared`.

**Ce que Geodoku n'est PAS.** Pas de compte, pas de login, pas de leaderboard, pas de streak inter-jours, pas de stats globales, pas d'ads, pas de mobile app. Un site web minimaliste, une partie par jour, un partage. Point.

## 2. Stack technique

- **Frontend** : Vite + React + TypeScript (strict mode)
- **Styling** : Tailwind CSS + shadcn/ui (install manuelle par composant) + Lucide React
- **Backend** : Convex (cloud remote, pas local) — DB, mutations, queries, crons ; rate limiting via `@convex-dev/rate-limiter` (`[convex/rateLimit.ts](convex/rateLimit.ts)`, `[convex/convex.config.ts](convex/convex.config.ts)`)
- **Observabilité front** : `@vercel/analytics` + `@vercel/speed-insights` + **PostHog** (`posthog-js` / `@posthog/react`, analytics produit + error tracking) — voir §10 (`[src/main.tsx](src/main.tsx)`)
- **Package manager** : pnpm (Node **≥ 22.12**, Volta 22.19)
- **Lint/format** : Biome (pas ESLint, pas Prettier)
- **Tests** : Vitest + @testing-library/react (unitaires) ; **Playwright** (e2e multi-navigateurs — voir §8)
- **Hooks / CI** : husky + lint-staged (pre-commit : Biome + tsc + Vitest) ; GitHub Actions (`quality` + `e2e`) — voir §8
- **Recherche fuzzy** : match-sorter (normalisation NFD côté requête)
- **Fonts** : Newsreader (serif, via Google Fonts CDN) + Inter (sans-serif)

**Choix assumés et non négociables.** Pas de state manager externe (Redux/Zustand) : `useReducer` + `Context` suffisent. Pas de TanStack Query : Convex a ses propres hooks réactifs. Pas de Zod : les types Convex sont générés automatiquement. Pas de date-fns/dayjs : les dates sont des strings `YYYY-MM-DD` (`[src/lib/dates.ts](src/lib/dates.ts)`, réexporté par `[convex/lib/dates.ts](convex/lib/dates.ts)`). Pas de react-router en V1 : un toggle sur `window.location.pathname` suffit pour `/`, `/admin`, `/privacy`, `/changelog` (`[src/App.tsx](src/App.tsx)`).

## 3. Architecture des dossiers

```
geodoku/
├── convex/
│   ├── schema.ts                # tables : gridCandidates, grids, gridAnswers, guesses, dailyStats, gridFeedback
│   ├── convex.config.ts         # app Convex + composant @convex-dev/rate-limiter
│   ├── crons.ts                 # ensureDailyGrids (hourly) + autoRefillPool (daily 03:00 UTC)
│   ├── scheduling.ts            # ensureDailyGrids + assignGridForDate (module léger, hot-path cron)
│   ├── grids.ts                 # pool, queries/mutations publiques et admin
│   ├── guesses.ts               # submitGuess, recordFailedGuess, getGuessDistributionForDate
│   ├── gridData.ts              # queries/mutations internes (pool, satellite, seed idempotence)
│   ├── auth.ts                  # checkAdminToken, safeEqual
│   ├── cellKeys.ts              # CELL_KEYS (9 cases)
│   ├── rateLimit.ts             # token buckets guess + feedback (clé clientId)
│   ├── http.ts                  # GET /health (monitoring externe)
│   ├── seed.ts                  # autoSeedIfEmpty (deploy) + seedHistoricalGrids (J-30..today + demain)
│   ├── wipe.ts                  # wipeAllData (paginé, dev only)
│   ├── __tests__/               # auth, cellMetrics
│   └── lib/
│       ├── dates.ts             # réexport src/lib/dates.ts (ne pas dupliquer)
│       ├── gridConstants.ts     # tunables (hard filters, pool, scheduler weights)
│       ├── gridGenerator.ts     # pur : backtracking + finalize + generateDiversePool (importe pays/contraintes depuis src/)
│       ├── gridScheduler.ts     # pur : selectNextGrid (greedy : freshness + overuse + novelty pays ; garde cold-start)
│       ├── cellMetrics.ts       # pur : struggle, concentration (admin + export-analytics)
│       ├── gridGenerator.test.ts
│       └── gridScheduler.test.ts
├── scripts/
│   ├── simulate-scheduling.ts   # sim 30 jours sans Convex (pool + scheduler), versionné
│   ├── export-analytics.ts      # bundle Markdown admin → analytics-YYYY-MM-DD.md
│   ├── prod/                    # build & validation (versionné)
│   │   ├── build-countries.ts   # one-shot : génère countries.json (Wikimedia + popularité)
│   │   ├── buildCountriesLib.ts # flagFieldsForCode, aliases, gameplay tags, assignPopularity… (+ tests)
│   │   ├── flagData.json        # table curée flagColors/flagSymbols/flagLayout (source de vérité, 196 pays)
│   │   ├── patches.json         # overrides : aliases (borders/water), wikiTitles, NATO, Commonwealth, monarchies, peaks…
│   │   ├── patches.test.ts
│   │   └── analyze-pool.ts      # audit qualité du pool (représentation, redondance intra-grille, rendu de grilles, concentration)
│   └── dev/                     # audits locaux (gitignored ; exclu de tsconfig)
├── src/
│   ├── main.tsx                 # + Vercel Analytics / Speed Insights
│   ├── App.tsx                  # toggle /, /admin, /privacy, /changelog
│   ├── app/
│   │   ├── providers.tsx        # ConvexProvider
│   │   ├── AppFooter.tsx        # pied de page jeu / admin / legal
│   │   └── useDailyReload.ts    # reload au rollover jour UTC (onglet visible)
│   ├── i18n/                    # translate() FR/EN, LocaleContext, locales/{fr,en}.ts
│   ├── features/
│   │   ├── game/
│   │   │   ├── components/      # Header, GameGrid, Cell, GuessModal, ResultScreen, SolutionGrid, RarityBadge, AchievementCard, HowToPlayLink, LocaleSwitcher, GamePage
│   │   │   ├── hooks/useGameState.ts
│   │   │   ├── logic/           # reducer, validation, blockedDetection, rarity, share, constants, constraints (60 / 18)
│   │   │   │   └── __tests__/
│   │   │   └── types.ts
│   │   ├── countries/
│   │   │   ├── data/countries.json
│   │   │   ├── lib/search.ts    # match-sorter wrapper (+ __tests__)
│   │   │   └── types.ts         # type Country (regime, physicalFeatures, flagColors/Symbols, popularityIndex…)
│   │   ├── errors/              # ErrorBoundary, ErrorScreen ; hooks/useBackendDownTimeout
│   │   ├── legal/               # pages éditoriales statiques
│   │   │   ├── PrivacyPage.tsx  # /privacy
│   │   │   ├── ChangelogPage.tsx # /changelog (timeline daté + roadmap)
│   │   │   └── components/      # LegalLayout, LegalSection, LegalParagraph, LegalBullet, LegalContactSection, LegalSupportSection, constants
│   │   └── admin/
│   │       ├── AdminPage.tsx
│   │       ├── components/      # PoolOverviewPanel, GameCalendar, GridDayDetail, GridPreview, GameHealthPanel, StatGlyph, AdminAuthBoundary, AlertBanner, PanelCard, …
│   │       ├── logic/           # display.ts, analytics.ts, scheduling.ts (+ __tests__)
│   │       └── hooks/useAdminToken.ts
│   ├── components/
│   │   ├── editorial/           # DisplayHeader, Eyebrow, AccentBar
│   │   ├── AppMark.tsx
│   │   └── ui/                  # shadcn : button, input, accordion, dialog, drawer, calendar, command, checkbox
│   └── lib/
│       ├── utils.ts             # cn()
│       └── dates.ts             # todayUTC, tomorrowUTC, offsetUTC… (source unique UTC)
├── e2e/                         # tests Playwright (multi-navigateurs) — voir §8
│   ├── helpers.ts               # fetchTodayGrid (ConvexHttpClient), solveGrid (matching biparti), findBlockingPlan, fillCell, prepareSession…
│   ├── game.shared.spec.ts      # gameplay cœur (load, fill, mauvaise réponse, unicité, défaite) — tous navigateurs
│   ├── persistence.shared.spec.ts  # reprise / localStorage corrompu / périmé — tous navigateurs
│   ├── mobile.mobile.spec.ts    # tactile / layout (drawer, swipe) — profils mobiles
│   ├── completion.desktop.spec.ts  # victoire, partage, case bloquée, solution, feedback — chromium-desktop
│   └── navigation.desktop.spec.ts  # routes (/privacy, /changelog, /admin), bascule langue — chromium-desktop
├── .husky/pre-commit            # gate local : Biome (staged) + tsc + Vitest
├── .github/workflows/ci.yml     # GitHub Actions : jobs quality + e2e
├── playwright.config.ts         # 6 projets navigateur, routing par suffixe de fichier, workers=1
├── biome.json
├── tailwind.config.ts
├── vercel.json                  # SPA rewrites + headers sécurité
├── tsconfig.json                # `include: ["src", "scripts"]`, `exclude: ["scripts/dev"]`
├── vite.config.ts               # Vitest : `exclude` e2e/** (specs Playwright, sinon collectées par erreur)
└── package.json
```

### Pays, contraintes et difficulté (`countries.json`, `gridConstants.ts`, `gridGenerator.ts`)

- **60 contraintes / 18 catégories** (`[src/features/game/logic/constraints.ts](src/features/game/logic/constraints.ts)`) : `continent`, `water_access`, `borders_count`, `borders_pivot`, `area`, `population`, `language`, `flag`, `latitude`, `subregion`, `event`, `political` (EU, G20, NATO, Commonwealth), `regime` (monarchie), `physical` (équateur, Méditerranée, Caraïbes, pic > 5000 m), `density`, `nature` (désert, forêt tropicale), `society` (conduite à gauche, capitale ≠ plus grande ville), `ocean` (Atlantique, Pacifique, Indien). Les seuils quantitatifs (`> 2 M km²`, `Top 15`…) ont laissé place à des **comparaisons à un pays-repère** (« plus grand que la France », « moins dense que la Russie ») : le seuil = la valeur live du pays-repère, auto-cohérente si `countries.json` est régénéré. Le type `Country` porte les axes nécessaires : `regime`, `physicalFeatures`, `groups`, `flagColors`, `flagSymbols`, `flagLayout`, `events`, `popularityIndex`. Toutes les contraintes restent dans la sweet-spot (3..15 pays valides côté `MIN_CELL_SIZE` / `MAX_CELL_SIZE`).
- **Contraintes archivées — ne jamais supprimer une contrainte, l'archiver.** Une contrainte retirée du jeu (ex. les seuils quantitatifs `area_gt_500k`, `density_high`, `language_multilingual`) part dans `ARCHIVED_CONSTRAINTS` (`[constraints.ts](src/features/game/logic/constraints.ts)`), **pas à la poubelle** : d'anciennes grilles publiées la référencent encore et le **replay** a besoin du label **et** du prédicat (`validateGuess` évalue le prédicat live). `CONSTRAINTS` = contraintes **générables** (seule source du générateur/scheduler/coverage, jamais d'archivée) ; `CONSTRAINT_BY_ID` = lookup `actif + archivé` pour résoudre label/prédicat d'une grille quelconque (jeu, admin, replay). Garder la clé i18n seule ne suffit **pas** (la résolution passe par l'objet contrainte). Le test `translate` couvre actif + archivé.
- **Build `pnpm build:countries`.** Enrichit chaque pays avec des **pageviews mensuelles** (API REST Wikimedia `en.wikipedia`). Requêtes **séquentielles** avec intervalle entre pays et **retry / backoff** sur HTTP 429 ; échec du script si trop de pays sans métriques (évite de committer un JSON incomplet). Les titres d’article ambigus se surchargent via `**wikiTitles`\*\* dans `[scripts/prod/patches.json](scripts/prod/patches.json)` (ex. `Georgia_(country)`, `The_Gambia`). Les listes additionnelles (NATO, Commonwealth, monarchies, mers/équateur, pics > 5000 m) vivent aussi dans `patches.json` et sont consommées par `[buildCountriesLib.ts](scripts/prod/buildCountriesLib.ts)` (couvert par `buildCountriesLib.test.ts` + `patches.test.ts`).
- **Drapeaux — table curée, pas d'heuristique.** `flagColors` / `flagSymbols` / `flagLayout` viennent de `[scripts/prod/flagData.json](scripts/prod/flagData.json)` (table de vérité interprétative et quasi-statique, 196 pays ; les `additions` comme le Kosovo portent leurs drapeaux inline). Le build lève une erreur si un code manque (`flagFieldsForCode`). **Aucune dérivation depuis `flags.alt`** (l'ancien parser heuristique `parseFlagFromAlt` est supprimé : il ratait les croix de canton et confondait « Southern **Cross** » avec une croix). Règle de classification des croix : **canton oui** (Union Jack → Fidji, Tuvalu, Australie, NZ), **armoiries non** (Slovaquie, Slovénie…). Côté gameplay : `flagSymbols` ∈ {`star`, `crescent`, `cross`, `animal`} (4 contraintes) + `flagColors.length === 2` (`flag_two_colors`) — soit **5 contraintes `flag`** ; `flagLayout` et les symboles hors liste restent stockés mais inertes. Un signalement d'erreur de drapeau = patcher `flagData.json` puis régénérer (`validAnswers` figés, cf. §6).
- `**popularityIndex`.** [0, 1], **percentile rank** des vues sur l’ensemble du jeu (ex-aequo → rang moyen). Calcul dans `assignPopularity`. Pays sans pageviews obtenues au build : **fallback médiane 0,5\*\*.
- **Difficulté prédite supprimée (juin 2026).** Analyse prod (22 j) : r ≈ 0 vs observé — aucune valeur prédictive. `computeCellDifficulty` / `difficultyEstimate` / `cellDifficulties` retirés du générateur et de l'admin ; les labels `Constraint.difficulty` (easy/medium/hard) aussi — **anti-prédictifs** (taux d'échec agrégé : easy 35 % > medium 29 % > hard 28 %, r = −0,23). **Seul prédicteur validé : la notoriété des solutions** — `topKPopularity(3)` dans `[src/features/countries/lib/popularity.ts](src/features/countries/lib/popularity.ts)`, LODO-CV r ≈ 0,46 contre le taux d'échec par case ; percentile + top3 est statistiquement indistinguable du meilleur des 72 combos testés (6 recalculs d'index × 12 agrégations ; les agrégations « pool entier » dégradent — le signal est la notoriété des *quelques meilleures* portes de sortie). Affichée dans l'admin en score « notoriété » 0–100 (vert = connu = facile), calculée live depuis `validAnswers`, jamais stockée. Re-tuning : `pnpm analyze:observed` quand le volume de jours trackés a ~doublé (re-trancher top3 vs top4/top5).
- `**gridConstants.ts**` centralise _tous_ les tunables backend : hard filters (`MIN_CELL_SIZE`, `MAX_CELL_SIZE`, `MIN_CATEGORIES`, `MAX_SAME_CATEGORY`, `MAX_CONSTRAINT_OVERLAP`), pool (`TARGET_GRIDS_PER_SEED`, `MAX_ATTEMPTS_PER_SEED`, `MAX_OVERLAP_BETWEEN_GRIDS`, `MIN_VIABLE_GRIDS_PER_SEED`), poids du scheduler (`HISTORY_WINDOW`, `FRESH_CONSTRAINT_BONUS`, `OVERUSE_CONSTRAINT_MALUS`, `OVERUSE_THRESHOLD`, `FRESH_COUNTRY_BONUS`), garde cold-start (`MAX_NEW_CONSTRAINTS_PER_GRID`, `NEWCOMER_GRADUATION_USES`, `KNOWN_CONSTRAINT_WINDOW`), seuil `POOL_LOW_THRESHOLD`. Chaque constante est nommée et documentée à son point de définition — aucun poids/seuil n'est codé en dur dans la logique (générateur, scheduler) ni dans les scripts d'analyse. `OVERUSE_CONSTRAINT_MALUS` est le seul poids réellement structurant — le pool est si large vs la consommation que les autres poids sont robustes à un large éventail de valeurs. Pour calibrer : ajuster ici, lancer `pnpm simulate:scheduling` (génère un pool + sim 30 jours **+ rollout cold-start** sans Convex, avec un **résumé PASS/FAIL** santé pool & scheduling — **c'est LE validateur d'un changement de contraintes** : une contrainte est bonne si le pool généré reste sain et varié, pas selon un compte statique) puis, si OK, `wipe:db` + `seed:grids` en dev pour repartir d’un historique cohérent. `pnpm analyze:pool` complète avec un **audit qualité de contenu** : part par contrainte, redondance intra-grille (paires quasi-synonymes), **rendu lisible de grilles concrètes** (labels + pays exemples) et concentration des réponses (grilles étroites / cellules triviales).
- **Sur-représentation des contraintes — auto-régulée, ne rien ajouter.** Le générateur borne seul la part de chaque contrainte dans le pool : `MAX_CELL_SIZE` force une contrainte _large_ à ne se croiser qu'avec des partenaires _étroits_ → elle n'entre que dans peu de grilles. Mesuré (`pnpm analyze:pool`) : une contrainte à ~100 pays (« drapeau bleu ») plafonne vers **~19 %** du pool, le max toutes contraintes confondues est **~24 %** (`flag_has_star`) — la sur-représentation culmine à largeur _moyenne_ (~30–65 pays), pas chez les plus larges. À 24 %, le scheduler garde ≥ 76 % de grilles sans n'importe quelle contrainte : la fraîcheur fonctionne. **Un pondérage par usage et un seuil d'apparition `MAX_CONSTRAINT_SHARE` ont été testés puis rejetés** (juin 2026, cf. commentaire en tête de `generateDiversePool`) : le premier est marginal (et effondre le pool en version stricte via `MAX_OVERLAP`), le second affame les seeds étroits qui dépendent de partenaires larges (`peak` 10→4). Le vrai risque de génération est **inverse** : les seeds _groupés_ (Méditerranée, monarchie) qui n'atteignent pas leur cible de seeds — borné par `MAX_OVERLAP_BETWEEN_GRIDS`, pas par `MAX_ATTEMPTS_PER_SEED` (l'augmenter ne sert à rien). Ajouter une contrainte large n'est donc pas un problème ; mesurer avec `analyze:pool` avant tout mécanisme de bridage. **À ne pas confondre avec `MAX_CONSTRAINT_OVERLAP`** : ce dernier borne la redondance _intra-grille_ — deux contraintes quasi-synonymes dans la **même** grille (ex. `physical_caribbean_coast × continent_north_america`, ou des seuils imbriqués `area_larger_mexico × area_larger_france`), qui effondrent une grille en un seul thème — pas la part d'une contrainte dans le pool. C'est un overlap coefficient `|A∩B|/min(|A|,|B|)` appliqué dans `fillSlots` (pruning) + `finalizeGrid` (enforcement final), seuil calibré à 0,85 (cf. docstring `gridConstants.ts`).

**Règles de placement.**

- Toute logique métier pure vit dans `features/<feature>/logic/`. Zéro import React, zéro import Convex. Testée en isolation.
- Les hooks React (`features/<feature>/hooks/`) sont la seule couche qui connecte logique pure + Convex + état React.
- Les composants ne calculent rien de significatif. Ils consomment l'état du reducer et dispatchent des actions.
- Pas de copie statique entre `src/` et `convex/lib/` : `gridGenerator.ts`, `gridScheduler.ts` et `gridConstants.ts` importent directement `countries.json`, `constraints`, types depuis `src/`. **Exception** : `convex/lib/dates.ts` réexporte `[src/lib/dates.ts](src/lib/dates.ts)` (une seule implémentation). Si une autre copie devenait inévitable (sandboxing), porter un commentaire `// Copie de src/... — ne pas éditer ici, regénérer si la source change.` en tête du fichier dupliqué.

## 4. Conventions de code

**TypeScript.**

- `strict: true` non négociable.
- Pas de `any`. Si une lib tierce n'a pas de types, écrire un `.d.ts` local.
- Préférer les `type` aux `interface` sauf pour les contrats réutilisables étendus.
- Unions discriminées plutôt que optionals : `{ status: "filled"; ... } | { status: "empty" }`.
- Pas de `// @ts-ignore`. `// @ts-expect-error` avec commentaire explicatif si vraiment nécessaire.

**React.**

- Fonctions pures > `useMemo`/`useCallback` par défaut. On ajoute la mémo seulement si profilée.
- Pas de `forwardRef` sauf pour les composants shadcn générés.
- Props : déstructurer dans la signature, pas d'objet `props`.
- Un composant = un fichier = un export default. Helpers pures exportées nommément.
- Pas de classes. Hooks uniquement.

**Style de code.**

- `forEach` et `flatMap` plutôt que `for...of` sauf nécessité de `break`/`await` séquentiel.
- Fonctions nommées plutôt qu'arrow functions pour les exports de logique.
- Commentaires en français dans le code business, en anglais dans le code technique bas-niveau (générateur, algos).
- Pas de magic numbers. Constantes en haut de fichier.

**Imports.**

- Alias `@/` pour tout ce qui vient de `src/`.
- Ordre : libs externes, puis `@/features`, puis relatifs (`./`, `../`).
- Biome gère l'ordre automatiquement.

**Tests.**

- Tous les tests **unitaires** sont co-localisés dans `__tests__/` à côté du code testé.
- On teste la logique pure en priorité. Très peu de tests sur les composants (faible ROI sur du visuel). Aucun test sur les hooks Convex (mock pénible).
- Un test = une assertion fonctionnelle, pas un test par ligne de code.
- **E2E (Playwright)** dans `[e2e/](e2e)` (voir §8) : pilotent la **vraie app** (serveur Vite) contre Convex et lisent la grille du jour via `ConvexHttpClient` — **jamais de réponses devinées**. Routés vers les projets navigateur **par suffixe de nom de fichier** (`*.shared` = tous moteurs · `*.desktop` = chromium-desktop seul : flux lourds + presse-papiers · `*.mobile` = profils tactiles) plutôt que par `test.skip` → ~zéro skip. `workers: 1` (série) car tous les navigateurs partagent une grille Convex et la satureraient en parallèle. Helpers clés (`[e2e/helpers.ts](e2e/helpers.ts)`) : `solveGrid` (matching biparti → victoire déterministe), `findBlockingPlan` (case ⬛), `fillCell` (ouverture+saisie+`Enter`, retryable).

**Documentation.**

- Après chaque feature, **se demander si un fichier de doc mérite une mise à jour** (`README`, `CLAUDE.md`, `/changelog`, docstrings) — **pas systématiquement** : beaucoup de changements (fix isolé, refacto interne, renommage) ne touchent rien de documenté. Mettre à jour quand la feature change une **convention, une commande, une structure de dossier, un contrat d'API, un flux ou une décision** que la doc décrit (ou devrait décrire).

## 5. Design system — Editorial Intellectual

Inspiration : publications digitales haut de gamme type NYT Games. Spacieux, sophistiqué, typographique. L'expérience doit ressembler à la lecture d'un broadsheet bien composé, pas à une app.

### 5.1 Fonts

- **Newsreader** (serif) : titres, display, headlines. Jamais pour du texte long.
- **Inter** (sans-serif) : body, labels, données, boutons.
- **Règle éditoriale n°1** : toujours associer un titre serif avec un label sans-serif en ALL CAPS espacé (tracking wide) pour créer un effet de « caption » magazine.
- **Règle éditoriale n°2 — l'accentuation d'un mot.** Dans une phrase en body, on peut mettre **un seul mot** (rarement deux) en `text-brand font-medium` pour porter la phrase. C'est notre équivalent du mot en italique dans un journal. Règles : un seul accent par phrase, jamais deux accents côte-à-côte, jamais sur un mot-outil (article, préposition), toujours sur le mot qui porte le sens. Si tu hésites entre deux mots, n'en accentue aucun.

### 5.2 Palette

**Off-white hierarchy.** On n'utilise jamais de blanc pur ni de noir pur.

| Token                | Hex       | Usage                                                   |
| -------------------- | --------- | ------------------------------------------------------- |
| `surface`            | `#f9f9f9` | Background principal                                    |
| `surface-low`        | `#f2f4f4` | Sections secondaires, headers de grille, cellules vides |
| `surface-lowest`     | `#ffffff` | Cellules remplies, cartes flottantes                    |
| `surface-highest`    | `#dde4e5` | Zone de jeu active, boutons primaires, hover states     |
| `on-surface`         | `#2d3435` | Texte principal (charcoal, jamais `#000`)               |
| `on-surface-variant` | `#56606e` | Texte secondaire, labels                                |
| `outline-variant`    | `#adb3b4` | Séparateurs, à utiliser à **15% opacity max**           |

**Format de stockage.** Les tokens vivent dans `[src/index.css](src/index.css)` en **canaux HSL bruts** (`<h s% l%>` sans wrapper `hsl()`) et sont consommés via `hsl(var(--…) / <alpha-value>)` dans Tailwind. C'est ce qui fait fonctionner les utilitaires d'opacité (`bg-brand/10`, `text-on-surface-variant/60`, `bg-outline-variant/15`…). **Ne jamais** réintroduire des valeurs `hsl(…)` ou `#hex` dans les `--color-`\* : ça casserait silencieusement toutes les opacités.

**Accent éditorial.**

| Token   | Hex       | Usage                                                                                                             |
| ------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `brand` | `#842cd3` | Accent de marque unique : titres, chiffres hero, mots mis en valeur, underline bar, icônes décoratives de trophée |

`brand` est **la seule couleur chaude** du système. Elle signifie « moment fort » : un score, un achievement, un mot qui porte la phrase. Règle d'application : texte à 100%, background à 10% opacity (`bg-brand/10`). Pas de gradient, pas de deuxième teinte violette, pas d'utilisation décorative gratuite — si tout est accentué, rien ne l'est.

Les tokens `brand` et `rarity.*` sont **sémantiquement distincts** : `brand` est l'identité éditoriale (accent de marque), `rarity.*` qualifient la rareté fonctionnelle d'une cellule. Ne pas utiliser `rarity.*` pour du branding ou inversement.

**Tokens sémantiques additionnels.**

| Token     | Hex (light) | Usage                                                                                                                                                |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `success` | `#16a34a`   | Indicateur positif — tier « easy » de difficulté, confirmations de validation.                                                                       |
| `warning` | `#d97706`   | Alerte douce — tier « medium » de difficulté, stock pool en baisse (`PoolHealthBanner`), bandeau « struggle indisponible / ventilation en attente ». |
| `error`   | `#dc2626`   | Erreur ou état bloquant — tier « hard » de difficulté, alertes « pool vide / grille manquante », message d'erreur dans `GuessModal`.                 |

Règle d'application : background à 10–15% opacity, texte à 100% (même convention que `rarity.*`).

Note : `warning` et `error` partagent visuellement les valeurs HSL avec `rarity-rare`/`rarity-ultra` mais sont **sémantiquement distincts** — `warning`/`error` qualifient des états applicatifs, `rarity-*` qualifient la rareté fonctionnelle d'une cellule. Garder la distinction pour pouvoir diverger les teintes plus tard si besoin.

**Rarity tiers (couleurs fonctionnelles).**

Les couleurs UI sont **volontairement alignées** sur les émojis de partage Wordle pour que le joueur retrouve instinctivement les mêmes codes visuels en jeu et en partage.

| Tier              | Hex       | Couleur | Emoji partage |
| ----------------- | --------- | ------- | ------------- |
| `rarity.common`   | `#7c3aed` | violet  | 🟪            |
| `rarity.uncommon` | `#2563eb` | bleu    | 🟦            |
| `rarity.rare`     | `#d97706` | ambre   | 🟨            |
| `rarity.ultra`    | `#dc2626` | rouge   | 🟥            |

**Règle d'application rareté** : background = couleur à 10% opacity, texte = couleur à 100%. Pill arrondi complet.

### 5.3 Règles dures

**Interdictions absolues.**

- ❌ Pas de `border: 1px solid` pour sectionner. On délimite par shift de background.
- ❌ Pas de noir pur `#000`. Toujours `on-surface` (`#2d3435`). Y compris pour les voiles de modales : `bg-on-surface/40`, jamais `bg-black/*`.
- ❌ Pas de blanc pur dans les backgrounds principaux (`#ffffff` est réservé aux cellules remplies, cartes flottantes, et glassmorphism `bg-white/80 backdrop-blur-md`).
- ❌ Pas de `text-white` hors variant `default` du `<Button>` (où il vient via `text-surface-lowest`).
- ❌ Pas d'ombres lourdes. L'ombre d'élévation unique autorisée est `0 20px 40px rgba(45, 52, 53, 0.06)` (classe `shadow-editorial`). Donc pas de `shadow-sm|md|lg|xl|2xl`, pas de `drop-shadow-*`.
- ❌ Pas d'icônes en navigation sans label texte associé.
- ❌ Pas de borders à 100% opacity. Si un séparateur est vraiment nécessaire pour l'accessibilité, `outline-variant` à 15% opacity max. Pour marquer une sélection (highlight), utiliser `ring-1 ring-inset ring-<token>` plutôt que `border-1` (n'affecte pas le layout).
- ❌ **Pas de `<button>` HTML natif avec classes Tailwind** — toujours `<Button variant="...">`. Exceptions tolérées : bouton-case de grille de jeu, icon-button de fermeture modale (sans label texte).
- ❌ **Pas de palette Tailwind native** (`text-gray-*`, `bg-slate-*`, `text-zinc-*`, `bg-amber-*`, etc.). Utiliser les tokens Geodoku (`surface-*`, `on-surface`, `brand`, `rarity.*`, `success`, `warning`, `error`).
- ❌ **Pas de tokens shadcn parasites** (`muted-foreground`, `accent-foreground`, `border-input`, `ring-ring`, `ring-offset-background`, `bg-primary`, `bg-accent`, `destructive`, etc.). Tous les composants `src/components/ui/*` (button, dialog, drawer, input, checkbox, accordion, calendar, command) ont été refondus aux tokens Geodoku après installation via la CLI shadcn. Les définitions shadcn par défaut (`--primary`, `--accent`, `--ring`, etc.) ont été supprimées de [src/index.css](src/index.css) et [tailwind.config.ts](tailwind.config.ts) — toute réintroduction est un bug.

**Principes positifs.**

- ✅ **Embrasser le whitespace.** Si une section semble chargée, doubler le padding. Pas exagérer, doubler.
- ✅ **Layering tonal.** L'élévation est suggérée par superposition de surfaces de tons légèrement différents, pas par des ombres.
- ✅ **Hiérarchie typographique.** Les différences de taille/poids/famille remplacent les boxes et les traits.
- ✅ **Glassmorphism pour les flottants.** Modales et HUD : `bg-white/80 backdrop-blur-md`.
- ✅ **Asymétrie intentionnelle.** Ne pas centrer systématiquement. Un titre `display-lg` légèrement off-center casse le feeling « template web ».

### 5.4 Composants récurrents

**Boutons.** Toujours `<Button variant="...">` depuis `[src/components/ui/button.tsx](src/components/ui/button.tsx)`. Cinq variants couvrent l'intégralité des usages — toute classe `bg-*`/`text-*`/`border-*` ajoutée par-dessus est un _code smell_ (vérifier d'abord si un variant existant matche).

| Variant               | Apparence                                                                                              | Quand l'utiliser                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `default` (= primary) | `bg-on-surface text-surface-lowest rounded-md`, hover `bg-on-surface/90`                               | CTA principal d'une vue (ex. « Recommencer », « Confirmer »)                    |
| `secondary`           | `bg-surface-highest text-on-surface rounded-md`, hover `bg-surface-highest/70`                         | Action secondaire à côté du primary (ex. « Annuler », « Voir la solution »)     |
| `ghost`               | Pas de bg, `text-on-surface-variant` hover `text-on-surface`                                           | Bouton tertiaire « quiet » à texte lisible (ex. « Comment jouer », « FR / EN ») |
| `ghost-label`         | `text-[10px] font-semibold tracking-widest uppercase text-on-surface-variant`, hover `text-on-surface` | Action discrète façon eyebrow ALL CAPS (ex. « Déconnexion »)                    |
| `link`                | `underline decoration-outline-variant/40 text-on-surface-variant`, hover `text-on-surface`             | Lien texte inline (ex. « Skip feedback », « Voir mon résultat »)                |

Sizes : `default` (h-10), `sm` (h-9), `lg` (h-11), `icon` (h-10 w-10), `auto` (h-auto p-0). Les variants `ghost-label` et `link` forcent `auto` par défaut via `compoundVariants`.

**Inputs.**

- Style underline minimaliste. Seul le bord inférieur visible, `outline-variant` à 40% opacity.
- Focus : underline transitionne vers `on-surface` (charcoal) avec épaisseur 2px.
- Pas de border-radius visible.

**Badges de rareté.**

- Pill arrondi (`rounded-full`).
- Padding `px-2 py-0.5`.
- `text-xs font-medium`.
- Background à 10% opacity de la couleur du tier, texte à 100%.

**Cartes / modales.**

- Background `surface-lowest` sur un fond `surface-low`. C'est le shift qui crée l'effet « papier stacké ».
- Rounded : `rounded-lg` pour les cartes, pas plus.
- Shadow : `shadow-editorial` uniquement si vraiment nécessaire (modal plein écran, surtout pas sur les cartes inline).

**Grilles de données (ex: GameGrid).**

- **Jamais de bordures**. Les cellules sont séparées par :
  - Background différent (cellule vide `surface-low`, cellule remplie `surface-lowest`).
  - Un `gap-1` ou `gap-2` maximum qui laisse transparaître le fond de section.

### 5.5 Patterns éditoriaux nommés

Les patterns ci-dessous ont un **nom canonique** et un **composant partagé**. **Avant d'en composer un à la main, importer le composant correspondant.** La référence visuelle reste `src/features/game/components/ResultScreen.tsx` pour les patterns inline.

`**display-header`\*\* — triplette titre + barre + eyebrow.

Composant : `[<DisplayHeader>](src/components/editorial/DisplayHeader.tsx)`. Props `{ title, eyebrow?, as?: 'h1'|'h2'|'h3', size?: 'md'|'lg', centered?: boolean }`. Rend :

1. Un titre serif italique `font-medium leading-none` (size `md` = `text-2xl`, `lg` = `text-3xl`).
2. Une `[<AccentBar>](src/components/editorial/AccentBar.tsx)` (`h-1 w-12 bg-brand rounded-full`).
3. Une `[<Eyebrow>](src/components/editorial/Eyebrow.tsx)` optionnelle en dessous.

Exception : quand un `<DialogTitle>` Radix est requis pour l'a11y (cas de `HowToPlayLink`), composer manuellement `DialogTitle + AccentBar` (sans `DisplayHeader`).

`**hero-number**` — un chiffre ou un score mis en évidence.

- `font-serif font-medium text-brand`.
- Taille `text-5xl` (score final, modale) à `text-6xl` (landing, si jamais).
- Accompagné obligatoirement d'une ligne de caption juste en dessous : `text-xs text-on-surface-variant`, décrivant ce que le chiffre mesure.
- Jamais deux `hero-number` dans la même vue. Si deux chiffres se disputent l'attention, l'un doit être un `hero-number` et l'autre en body.

Reste inline (1 seule occurrence dans `ResultScreen.tsx` aujourd'hui). Si une 2e apparaît, extraire en `<HeroNumber>`.

`**accent-word**` — un mot en violet dans une phrase.

Voir §5.1 règle éditoriale n°2. Implémentation : `<span className="text-brand font-medium">mot</span>`. Pas de composant dédié — c'est une micro-convention typographique, pas un atome d'UI.

`**eyebrow**` — les micro-labels all-caps.

Composant : `[<Eyebrow>](src/components/editorial/Eyebrow.tsx)`. Props `{ children, as?: 'p'|'span'|'div', className? }`. Rend `text-[10px] tracking-widest uppercase text-on-surface-variant`.

Pour la variante « panel header » (section title), passer `className="font-semibold"` — ou utiliser directement `[<PanelHeader>](src/features/admin/components/PanelHeader.tsx)` qui le fait pour toi.

### 5.5.1 Composants partagés admin

Les panels admin ont leurs propres composants atomiques. **Avant de composer un panel à la main, importer ces composants.**

| Composant                                                              | Usage                                                                                                                                        |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `[<PanelCard>](src/features/admin/components/PanelCard.tsx)`           | `<section className="rounded-lg bg-surface-low p-4 md:p-5">` — wrapper de tous les panels admin                                              |
| `[<PanelHeader>](src/features/admin/components/PanelHeader.tsx)`       | Titre eyebrow + slot `children` pour badges/actions                                                                                          |
| `[<DifficultyPill>](src/features/admin/components/DifficultyPill.tsx)` | Pill 0-100 par tier de difficulté (`value` numérique ou `tier+children`)                                                                     |
| `[<StatusPill>](src/features/admin/components/StatusPill.tsx)`         | État d'un jour : `scheduled` / `predicted` (brand, Sparkles) / `active` (aujourd'hui, success, Radio) / `past` (archivé, Archive)            |
| `[<TagPill>](src/features/admin/components/TagPill.tsx)`               | Pill neutre pour contrainte/catégorie (`bg-surface-low text-on-surface-variant`)                                                             |
| `[<StatGlyph>](src/features/admin/components/StatGlyph.tsx)`           | Icône + valeur d'une métrique (style KDA, vocabulaire partagé) ; `showLabel` ajoute le mot inline, `<StatLegend>` rend la légende des icônes |

### 5.5.2 Convention `rounded-`\*

| Classe                | Usage                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rounded-md`          | Boutons (matché par le variant `default`/`secondary` du `<Button>`)                                                                                                                                                                                                                                                                                                                                                      |
| `rounded-lg`          | Cartes / panels de section (matché par `<PanelCard>`)                                                                                                                                                                                                                                                                                                                                                                    |
| `rounded-full`        | Badges, pills (matché par `<DifficultyPill>`, `<StatusPill>`, `<TagPill>`, `<RarityBadge>`)                                                                                                                                                                                                                                                                                                                              |
| `rounded-xl`          | **Cellules interactives, surfaces flottantes et dialogs** — cellules de grille de jeu (`Cell`), mini-cellules de preview (`GridPreview`), cartes flottantes en `shadow-editorial` (`GridDayDetail`, `GameCalendar`, `AchievementCard`), `DialogContent`, `ResultScreen` desktop. Convention spécifique à Geodoku : `rounded-xl` (12px) donne une « softness » d'interactivité qu'on ne veut pas sur les sections plates. |
| `rounded-t-2xl`       | **Drawer mobile** uniquement (cf. shadcn Drawer, ResultScreen bottom-up). Pas de `rounded-2xl` complet.                                                                                                                                                                                                                                                                                                                  |
| `rounded-3xl` et plus | **Interdit.**                                                                                                                                                                                                                                                                                                                                                                                                            |

### 5.6 Typographie suggérée (classes Tailwind)

```
display-lg    → font-serif text-4xl md:text-5xl font-medium italic
display-sm    → font-serif text-2xl font-medium
headline-lg   → font-serif text-xl font-medium
headline-sm   → font-serif text-base font-medium
label-lg      → font-sans text-sm font-semibold uppercase tracking-wider
label-md      → font-sans text-xs font-semibold uppercase tracking-widest
body          → font-sans text-sm
body-lg       → font-sans text-base
caption       → font-sans text-xs text-on-surface-variant
```

Ces classes ne sont pas toutes définies dans Tailwind, elles servent de vocabulaire partagé pour discuter du design. À utiliser comme guide, pas comme API.

### 5.7 Vérification automatique : `/verify-design-system`

Le skill `[/verify-design-system](.claude/skills/verify-design-system/SKILL.md)` audite le code à la recherche des violations §5.3 (couleurs interdites, tokens shadcn parasites, shadows non-editorial, bordures dures, rounded non conformes, `<button>` HTML natifs, patterns dupliqués). À lancer **après chaque feature qui touche au visuel**, avant ouverture de PR. Aucun fix automatique — un rapport actionnable `file:line` par catégorie.

## 6. Backend Convex — ce qu'il faut savoir

**Architecture en pool.** On ne génère plus une grille par jour à l’aveugle : on entretient un **pool** de grilles candidates pré-générées (status `available`), et un **scheduler greedy** choisit chaque jour celle qui maximise la diversité par rapport aux 15 dernières grilles publiées. Pipeline :

1. `generateDiversePool` (`[convex/lib/gridGenerator.ts](convex/lib/gridGenerator.ts)`) parcourt chaque contrainte comme **seed**, tente jusqu'à `MAX_ATTEMPTS_PER_SEED` backtrackings, garde les grilles qui passent les hard filters (tailles de cellule, catégories, **non-redondance** `MAX_CONSTRAINT_OVERLAP`) et n'overlap pas trop avec les grilles déjà en pool (`MAX_OVERLAP_BETWEEN_GRIDS`).
2. Chaque grille est **finalisée** avec ses métadonnées (`countryPool`, `categories`, `seedConstraint`, tailles de cellules).
3. `selectNextGrid` (`[convex/lib/gridScheduler.ts](convex/lib/gridScheduler.ts)`) score chaque grille disponible : `fresh_constraints × bonus − overuse × malus + new_countries × bonus`, prend la meilleure, l'insère dans `grids` et la marque `used`. **Garde cold-start** : quand on ajoute un lot de contraintes neuves à un catalogue mûr, elles sont les seules « jamais vues » → des grilles bourrées de nouveautés rafleraient le score et tout le lot tomberait en quelques jours. Le scheduler plafonne donc chaque grille à `MAX_NEW_CONSTRAINTS_PER_GRID` « newcomer » (contrainte vue moins de `NEWCOMER_GRADUATION_USES` fois sur les `KNOWN_CONSTRAINT_WINDOW` dernières grilles publiées), tissant le lot progressivement (~1/jour). Compter les *usages* (pas la simple présence) empêche une contrainte tout juste introduite de revenir en passager les jours suivants : elle reste bridée jusqu'à « graduer ». La garde ne s'active **que** si l'historique atteint `KNOWN_CONSTRAINT_WINDOW` (catalogue mûr) ; en seeding from-scratch l'historique est plus court → toute contrainte est légitimement neuve, pas de bridage. C'est pourquoi `selectNextGrid` reçoit la fenêtre **complète** (`KNOWN_CONSTRAINT_WINDOW`, plus récente en tête), dont seules les `HISTORY_WINDOW` premières alimentent freshness/overuse.

**Schéma actuel.**

- `gridCandidates` : pool de grilles ; status `available | used`. Champs : `rows`, `cols`, `metadata` (`seedConstraint`, `constraintIds`, `categories`, `avgCellSize`, `minCellSize`, `countryPool` ; champs legacy optionnels `difficultyEstimate`, `difficultyTags`, `cellDifficulties` sur les docs antérieurs), `usedAt`, `usedForDate`. **Pas de `validAnswers` inline** — vit dans la table satellite `gridAnswers`.
- `grids` : grille assignée à une date (clé = `date` YYYY-MM-DD). Champs : `rows`, `cols`, `countryPool` (dénormalisé depuis `metadata.countryPool` pour éviter de relire le satellite côté scheduler/admin), `candidateId` ; `difficulty` legacy optionnel sur les docs antérieurs.
- `gridAnswers` : **satellite 1-to-1** keyé sur `candidateId`, porte uniquement `validAnswers`. Séparé pour alléger les `.collect()` du scheduler et des queries admin (un doc `gridCandidates` passe ainsi de ~3.5 KB à ~1.2 KB).
- `guesses` : compteur par `(date, cellKey, countryCode)` ; `isReplay` optionnel (cohorte live vs futurs rejeux — exclus de la rareté affichée).
- `dailyStats` : dénormalisation `(date, cellKey) → totalGuesses` pour rareté O(1) ; `failedAttempts` optionnel (échecs sur pays valides mais mauvais croisement → struggle admin).
- `gridFeedback` : agrégat par date. **Parties** (`recordGameEnd`) : `wins`, `losses`, `lostByLivesCount`, `lostByBlockedCount`, `totalLivesLeft`, `totalFilledCells`, `totalGuessesSubmitted`. **Ratings** (`submitGridFeedback`) : `tooEasyCount`, `balancedCount`, `tooHardCount`, `totalRatings`.

**Crons** (`[convex/crons.ts](convex/crons.ts)`).

- **Toutes les heures** — `ensureDailyGrids` (mutation légère dans `scheduling.ts`) : assigne today + tomorrow depuis le pool via `selectNextGrid` ; si pool vide, planifie `autoRefillPool` via le scheduler. Idempotent (early-return si grilles présentes) → fait office de self-heal automatique.
- **Daily 03:00 UTC** — `autoRefillPool` : si `available < POOL_LOW_THRESHOLD`, lance `generatePoolImpl` pour reremplir le stock (additif).

**Endpoints publics (jeu).**

`[convex/grids.ts](convex/grids.ts)` :

- `getTodayGrid` (query) — grille du jour ou `null` ; jointure satellite `gridAnswers` → `validAnswers`.
- `recordGameEnd` (mutation) — compteurs de fin de partie dans `gridFeedback` (win/loss, cause, vies/cases/essais) ; rate-limited ; idempotent côté client (localStorage).
- `submitGridFeedback` (mutation) — note de difficulté facultative (`too_easy` / `balanced` / `too_hard`) ; **ne touche pas** aux compteurs win/loss.

`[convex/guesses.ts](convex/guesses.ts)` :

- `submitGuess` (mutation) — soumission réussie ; incrémente `guesses` + `dailyStats`.
- `recordFailedGuess` (mutation) — pays valide mais mauvais croisement ; incrémente `dailyStats.failedAttempts`.
- `getGuessDistributionForDate` (query) — rareté live par case (exclut `isReplay === true`).

**Endpoints admin** (`[convex/grids.ts](convex/grids.ts)`, token via `[convex/auth.ts](convex/auth.ts)`) :

- `getScheduledGrids` (query) — grilles depuis J-30, métadonnées candidate. **Payload light** : pas de `validAnswers` ; `gridPopTop3` (notoriété moyenne, satellite lu côté serveur) calculé uniquement pour les dates ≥ today (pastille calendrier).
- `getScheduledGridPreviewDetail` (query) — lazy `{rows, cols, validAnswers}` pour une date planifiée.
- `getCandidatePreviewDetail` (query) — lazy preview pour un `candidateId` (jour prédit).
- `getPoolStats` (query) — taille du pool, couverture contrainte/pays.
- `getUpcomingScheduledPreview` (query) — 1..14 jours : `scheduled` / `predicted` / `missing` ; embarque `gridPopTop3` par jour.
- `getGridFeedbackStats` (query) — winRate, split défaites, difficulté ressentie. **Léger** → `GameHealthPanel`.
- `getGridCellMetrics(date)` (query) — **lourd, au clic** : struggle, fillRate, picks, validAnswers. Un jour à la fois (`GridDayDetail`, `export-analytics`).
- `refreshPool` (action) — vide le stock `available` puis regénère.
- `runEnsureTomorrow` (action) — today + tomorrow (manuel du cron).
- `scheduleGridForDate` (action) — une date via `internal.scheduling.assignGridForDate`.

**Internes utiles** (agents / ops, pas d'appel front direct) :

- `grids.generatePoolImpl`, `refreshPoolImpl`, `autoRefillPool` (cron refill)
- `scheduling.ensureDailyGrids`, `assignGridForDate`
- `gridData` : `hasAnyGrid`, `getAvailablePoolGrids`, `hasGridForDate`, `insertPoolGrid`, `deleteAvailableCandidatesBatch`, helpers `getCandidateAnswers` / `getGridAnswers`
- `seed.seedHistoricalGrids`, `seed.autoSeedIfEmpty` ; `wipe.wipeAllData`

**Rate limiting** (`[convex/rateLimit.ts](convex/rateLimit.ts)`) : clé `clientId` (localStorage). Buckets `guess` (soumissions) et `feedback` (`recordGameEnd` + `submitGridFeedback`). Pas anti-bot déterminé — plafond de facture Convex.

**Auth admin.**

- Token bearer via variable d'environnement Convex `ADMIN_TOKEN` ; vérification `[checkAdminToken](convex/auth.ts)`.
- Toute mutation/action admin prend `adminToken: string` et throw `ConvexError("Unauthorized")` si mismatch.
- Côté client : `sessionStorage` via hook `useAdminToken` (effacé à la fermeture de l’onglet).

**Admin (UI).**

`[src/features/admin/AdminPage.tsx](src/features/admin/AdminPage.tsx)` compose :

- `PoolOverviewPanel` — `PoolHealthBanner` unifié (statut sain/baisse/critique calqué sur l'alerte « grille de demain » : icône + données inline `en stock · utilisées · total` + bouton « Regénérer le pool » à droite, confirmation modale), alerte demain avec bouton « Planifier maintenant ».
- `GameCalendar` + `GridDayDetail` — calendrier unifié (jour passé : pastille **winRate observé** ; futur planifié : pastille **facilité estimée des solutions** via `gridPopTop3` ; prédit : brand ; manquant : rouge). Sélection → `GridDayDetail` : **header de grille** = ligne engagement (`engagés` · `terminées` en violet `brand` · `abandon` en rouge `error` · `victoires`) puis ligne **facilité estimée** (badge jauge `EaseStat`) + **écart** (`DeltaStat`, flèche de sens + |écart|, teinté vert/orange/rouge par sévérité) sur les grilles passées, facilité seule sur les futures. Grille **passée/active** (`getGridCellMetrics`) : chaque case sur **2 lignes** — (1) `% réussite` observé + KDA réussites/échecs/essais (`StatGlyph`), (2) badge **facilité estimée** (jauge + score) + **écart** prédit/observé ; grille **future/prédite** (preview lazy `getScheduledGridPreviewDetail` / `getCandidatePreviewDetail`) : badge facilité seul par case. La facilité (0–100, vert = solutions connues = facile, picto `Gauge`) est calculée live via `topKPopularity` depuis `validAnswers` (`[popularity.ts](src/features/countries/lib/popularity.ts)`, helpers couleur dans `[display.ts](src/features/admin/logic/display.ts)`), jamais stockée. **L'écart compare la facilité à la réussite observée _par case_** (ce que `topKPopularity` prédit, r≈0,46), pas au `% victoires` de la grille entière (échelle différente). `predictionDelta` (seuils `DELTA_GOOD_MAX`/`DELTA_OFF_MAX`) vit dans `[analytics.ts](src/features/admin/logic/analytics.ts)`. Composant `GridPreview` partagé passé/futur, légende jauge sous la grille.
- `GameHealthPanel` — synthèse agrégée ~30 j (win rate global en hero + parties/jour · pic · creux) puis tendance 7 j (tableau à en-têtes `StatGlyph`). Tout depuis la query légère `getGridFeedbackStats`.

Pas de panneau de tuning des constantes : on ajuste dans `gridConstants.ts`, on simule (`simulate-scheduling`), puis `wipe:db` + `seed:grids` en dev pour un reset complet, ou « Regénérer le pool » dans `/admin` pour renouveler le stock futur sans toucher aux grilles planifiées.

**Règles Convex à respecter.**

- Pas de `.filter()` sur les queries — utiliser les index.
- Nommage des index : `by_<field>_and_<field>` (snake_case avec `and`).
- `gridGenerator`, `gridScheduler`, `gridConstants` sont **purs** (pas de `convex/server` ni de `_generated`) : on peut les charger depuis Vitest, depuis `scripts/simulate-scheduling.ts`, et depuis les actions Convex sans duplication.

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

## 7. Commandes utiles

```bash
# Dev
pnpm dev                          # Vite dev server (--host)
pnpm convex:dev                   # Convex dev en remote cloud

# Build / CI
pnpm build                        # tsc --noEmit + vite build
pnpm lint                         # biome check + tsc --noEmit
pnpm typecheck                    # tsc --noEmit seul
pnpm format                       # biome format --write
pnpm test                         # vitest run (unitaires ; e2e/ exclu via vite.config)
pnpm preview                      # vite preview (build local requis)

# Tests e2e (Playwright) — démarre le serveur dev tout seul, lit la grille du jour via Convex
pnpm test:e2e                     # lance la suite (réutilise un `pnpm dev` en cours sinon le démarre)
pnpm test:e2e:ui                  # mode UI interactif (timeline, re-run, debug)
pnpm test:e2e:reset               # wipe:db + seed:grids + playwright test (reset complet, dev local)

# Génération de données
pnpm build:countries              # régénère countries.json (fetch Wikimedia EN + popularityIndex percentile)
pnpm analyze:pool                 # audit qualité du pool : représentation + redondance intra-grille + rendu de grilles + concentration [--runs=3]

# Simulation hors-ligne (sans Convex) — pool + 30 jours de scheduling, pass/fail checks
pnpm simulate:scheduling

# Export analytics admin → Markdown (ADMIN_TOKEN + VITE_CONVEX_URL dans .env.local)
pnpm export:analytics             # scripts/export-analytics.ts [--days=30] [--out=foo.md]

# Analyse stats difficulté observée vs features (LODO-CV, bootstrap) — mêmes env vars
pnpm analyze:observed             # scripts/prod/analyze-observed-difficulty.ts [--days=N]

# Seed historique (échoue si `grids` non vide — wipe en dev avant reseed)
pnpm seed:grids                   # npx convex run seed:seedHistoricalGrids

# Tuning loop (dev local) :
#   1. ajuster les tunables dans convex/lib/gridConstants.ts (hard filters, scheduler weights)
#   2. simuler hors-ligne avec `pnpm simulate:scheduling` pour valider la santé du pool
#   3. wipe + reseed pour régénérer un historique cohérent côté Convex (dev)
#      ou « Regénérer le pool » dans /admin (prod/preview, stock futur uniquement)
#   4. inspecter dans /admin (PoolOverviewPanel + GameCalendar + GridDayDetail)
pnpm wipe:db                      # npx convex run wipe:wipeAllData (paginé)

# Admin Convex
pnpm exec convex env set ADMIN_TOKEN "xxx"
```

## 8. CI, Vercel et `convex/_generated`

**Mapping branche → environnement :**

| Contexte          | Front             | Backend Convex                 | Données                    |
| ----------------- | ----------------- | ------------------------------ | -------------------------- |
| `main`            | Vercel Production | prod                           | persistantes               |
| `develop`         | Vercel Preview    | `preview/develop`              | persistantes               |
| autre branche WIP | Vercel Preview    | `preview/<branch>`             | seedées auto au 1er deploy |
| local             | `pnpm dev`        | cloud dev perso (`convex dev`) | gérées manuellement        |

**Build command Vercel (tous environnements) :**

```bash
pnpm exec convex deploy --preview-run seed:autoSeedIfEmpty --cmd 'vite build' --cmd-url-env-var-name VITE_CONVEX_URL
```

`--preview-run` n'exécute `autoSeedIfEmpty` que sur les déploiements **preview** (`develop`, branches WIP) — **jamais en production** (`main`), qui reste seedée une fois pour toutes. `autoSeedIfEmpty` est idempotent : no-op si des grids existent déjà (`develop`), seed complet (pool + J-30..today + demain via `ensureDailyGrids`) si vide (nouvelle branche WIP). Une seule commande pour tous les environnements.

**Variable d'environnement clé sur Vercel : `CONVEX_DEPLOY_KEY`**, une clé par environnement :

- Production → clé prod ([dashboard.convex.dev](https://dashboard.convex.dev))
- Preview → clé preview dédiée

**Autres variables Convex à poser (`convex env set` ou dashboard) :**

- `ADMIN_TOKEN` — token bearer pour les mutations admin (UI `/admin`)

`**convex/_generated/` est versionné** : sans lui, `pnpm build` / `tsc` échouent sur toute CI qui clone sans lancer `convex dev`. Après un changement de schéma ou d'API Convex, régénérer avec `pnpm convex:dev` (ou `pnpm exec convex codegen`) et **commiter le diff\*\*.

**Hooks pre-commit (local) — `[.husky/pre-commit](.husky/pre-commit)`.** husky + lint-staged. À chaque commit : Biome (`biome check --write` sur les fichiers **stagés**, auto-corrigés et re-stagés), puis `tsc --noEmit`, puis `vitest`. L'e2e n'y est **pas** (trop lent, dépend du serveur/navigateurs — il vit en CI). Auto-installé via le script `prepare: husky` au `pnpm install` (rien à faire sur un nouveau clone). Bypass ponctuel : `git commit --no-verify`.

**GitHub Actions — `[.github/workflows/ci.yml](.github/workflows/ci.yml)`** (runners publics gratuits, repo public). Deux jobs :

- `quality` (sans secret) — `pnpm lint` + `pnpm test`. Sur push `main`/`develop` + PR vers `main`.
- `e2e` — `pnpm test:e2e` sur push `develop`/`main` + PR vers `main`. Tourne contre **`preview/develop`** (variable repo `VITE_CONVEX_URL`) : **pas de deploy key, pas de seed** (develop est déjà seedé, son cron horaire maintient la grille du jour). Gardé par la variable repo `RUN_E2E=true` ; **sérialisé** (`concurrency: e2e-develop`, l'env est partagé) ; `cancel-in-progress` collapse les rafales de push. ⚠️ l'e2e envoie de **vrais guesses** → bruite les stats/rareté de `preview/develop` (assumé, c'est l'env de staging).

**Vitest ne doit pas collecter les specs Playwright.** `[vite.config.ts](vite.config.ts)` ajoute `"e2e/**"` à `test.exclude` — sinon le glob par défaut de Vitest (`*.spec.ts`) ramasse `e2e/*.spec.ts` (qui importent `@playwright/test`, incompatible avec le runner Vitest) et `pnpm test` casse.

**Protection de `main`** (réglée via l'API GitHub, **pas** versionnée dans le repo). PR obligatoire (0 review — projet solo), **checks requis** `Lint, typecheck & unit tests` **et** `Playwright e2e`, force-push & suppression interdits, `enforce_admins: true` (la règle s'applique aussi à l'admin — sinon le propriétaire bypasse tout). → la prod ne part que de code dont les deux suites sont vertes. Échappatoire si un check ne peut pas tourner et bloque un merge : `gh api -X DELETE repos/<owner>/<repo>/branches/main/protection/enforce_admins` (puis `-X POST` pour réactiver).

## 9. Anti-patterns à bannir

- 🚫 **Over-engineering.** Pas de state manager, pas d'abstraction générique « au cas où », pas de couche d'indirection sans besoin concret. Ce projet est un mini-jeu, pas une plateforme.
- 🚫 **Logique dans les composants.** Si un composant calcule quelque chose au-delà du formatting d'affichage, extraire en fonction pure dans `logic/`.
- 🚫 **Données dérivées stockées.** Pas de `borderCount` si `borders.length` existe. Pas de `isFilled` si le status suffit.
- 🚫 **Features spéculatives.** Pas de code mort « pour plus tard ». Si une feature n'est pas demandée, elle n'existe pas.
- 🚫 **Tests de composants visuels.** Low ROI. On teste ce qui casse : la logique pure.
- 🚫 **Bordures pour sectionner** (cf. design system).
- 🚫 **Commentaires de type `// increment counter`** qui paraphrasent le code. Les commentaires expliquent le _pourquoi_, pas le _quoi_.

## 10. Analytics produit (PostHog)

**Rôle.** PostHog (`posthog-js` + `@posthog/react`) capture le **comportement par joueur** (parcours, funnels, rétention, langue, fiabilité). C'est **complémentaire**, pas redondant avec l'admin Convex : `gridFeedback` / `dailyStats` agrègent la **santé des grilles** (win rate, struggle, rareté) côté serveur ; PostHog raconte ce que Convex ne sait pas — l'entonnoir d'engagement, l'abandon, le ressenti par session. En cas de chevauchement (win rate, justesse des guess), **Convex reste la source de vérité** ; PostHog ajoute la dimension par-utilisateur.

**Init** (`[src/main.tsx](src/main.tsx)`). `posthog.init(VITE_POSTHOG_PROJECT_TOKEN, { api_host: VITE_POSTHOG_HOST, defaults, autocapture: false, persistence: "localStorage" })` puis `<PostHogProvider client={posthog}>` enveloppe l'app. Deux réglages **volontaires, à ne pas défaire** : `autocapture: false` (on ne veut que des events métier nommés) et `persistence: "localStorage"` (**aucun cookie posé** → pas de bandeau de consentement). Variables d'env : `VITE_POSTHOG_PROJECT_TOKEN`, `VITE_POSTHOG_HOST` (cf. `[src/vite-env.d.ts](src/vite-env.d.ts)`).

**Posture vie privée.** Aucune PII : pas de `posthog.identify()`, pas d'email, pas de nom. Identifiant anonyme en localStorage, sans cookie. Le `clientId` (rate-limit) reste **côté Convex** et n'est pas envoyé à PostHog. La page `/privacy` mentionne PostHog comme statistiques d'usage anonymes et sans cookie (§ `privacy.thirdPartyBody` dans `[src/i18n/locales](src/i18n/locales)`) — tenir ce texte à jour si la capture évolue.

**Conventions d'events.** Nom en `snake_case`, verbe au passé (`game_completed`, `result_shared`). Capture via le hook `usePostHog()` dans les composants/hooks (`posthog?.capture(...)`, toujours optional-chaining — le client peut être absent). Les exceptions de rendu passent par `posthog.captureException` dans `[ErrorBoundary](src/features/errors/components/ErrorBoundary.tsx)`. Propriété transverse `grid_date` sur les events liés à une partie. **Avant d'ajouter un event, vérifier qu'il n'existe pas déjà** (catalogue ci-dessous) pour éviter les doublons.

**Catalogue d'events** (source de vérité = le code, pas le dashboard) :

| Domaine | Events | Fichier |
| ------- | ------ | ------- |
| Cycle de partie | `game_started`, `session_resumed`, `cell_opened`, `guess_submitted`, `guess_failed`, `game_completed` | `[useGameState](src/features/game/hooks/useGameState.ts)`, `[GamePage](src/features/game/components/GamePage.tsx)` |
| Saisie | `guess_modal_closed` | `[GuessModal](src/features/game/components/GuessModal.tsx)` |
| Résultat / partage | `result_screen_viewed`, `result_shared`, `difficulty_rated`, `achievement_unlocked`, `solution_viewed` | `[ResultScreen](src/features/game/components/ResultScreen.tsx)`, `[AchievementCard](src/features/game/components/AchievementCard.tsx)`, `[GamePage](src/features/game/components/GamePage.tsx)` |
| Onboarding / UI | `how_to_play_opened`, `how_to_play_closed`, `how_to_play_dont_show_toggled`, `locale_changed`, `footer_link_clicked` | `[HowToPlayLink](src/features/game/components/HowToPlayLink.tsx)`, `[LocaleSwitcher](src/features/game/components/LocaleSwitcher.tsx)`, `[AppFooter](src/app/AppFooter.tsx)` |
| Pages légales | `legal_page_viewed`, `legal_page_left` | `[useLegalPageAnalytics](src/features/legal/hooks/useLegalPageAnalytics.ts)` |
| Fiabilité | `backend_timeout_shown`, `$exception` | `[GamePage](src/features/game/components/GamePage.tsx)`, `[ErrorBoundary](src/features/errors/components/ErrorBoundary.tsx)` |

**Dashboard.** « Analytics basics (wizard) » (`project/200018/dashboard/742421`, EU). Créé par le wizard d'install sur les **premiers** events seulement ; le reste du catalogue n'y est pas encore visualisé (funnel d'engagement, onboarding, langue, fiabilité…).
