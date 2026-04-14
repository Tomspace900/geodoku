# Geodoku — Guide du projet

## 1. Le projet en une page

Geodoku est un mini-jeu web quotidien inspiré de Wordle et du Sudoku, sur le thème de la géographie.

**Principe.** Chaque jour, une grille 3×3 est proposée à tous les joueurs. Chaque ligne et chaque colonne impose une contrainte géographique (ex: « Asie », « Enclavé », « Plus de 50M d'habitants », « Frontalier de la France »). Pour chacune des 9 cases, le joueur doit trouver un pays qui valide **simultanément** la contrainte de sa ligne et celle de sa colonne. Il dispose de **3 vies** et ne peut pas réutiliser deux fois le même pays.

**Le twist.** Plus le pays trouvé est rare (parmi les choix des autres joueurs de la journée), meilleur est le score. Un joueur qui remplit une case « Asie × Enclavé » avec « Bhoutan » obtient un meilleur bonus qu'un joueur qui met « Mongolie ». Le score final est en pourcentage, calculé comme `completion × 20pts + bonus_rareté` sur un max de 405, puis normalisé.

**L'enjeu communautaire.** À la fin, le joueur partage sa grille sous forme d'emojis colorés (🟩🟨🟧🟥⬛) avec son score, à la manière de Wordle.

**Ce que Geodoku n'est PAS.** Pas de compte, pas de login, pas de leaderboard, pas de streak inter-jours, pas de stats globales, pas d'ads, pas de mobile app. Un site web minimaliste, une partie par jour, un partage. Point.

## 2. Stack technique

- **Frontend** : Vite + React + TypeScript (strict mode)
- **Styling** : Tailwind CSS + shadcn/ui (install manuelle par composant) + Lucide React
- **Backend** : Convex (cloud remote, pas local) — DB, mutations, queries, crons
- **Package manager** : pnpm
- **Lint/format** : Biome (pas ESLint, pas Prettier)
- **Tests** : Vitest + @testing-library/react
- **Recherche fuzzy** : match-sorter (normalisation NFD côté requête)
- **Fonts** : Newsreader (serif, via Google Fonts CDN) + Inter (sans-serif)

**Choix assumés et non négociables.** Pas de state manager externe (Redux/Zustand) : `useReducer` + `Context` suffisent. Pas de TanStack Query : Convex a ses propres hooks réactifs. Pas de Zod : les types Convex sont générés automatiquement. Pas de date-fns/dayjs : les dates sont des strings `YYYY-MM-DD`. Pas de react-router en V1 : un toggle sur `window.location.pathname` suffit pour séparer `/` de `/admin`.

## 3. Architecture des dossiers

```
geodoku/
├── convex/
│   ├── schema.ts                # tables : gridCandidates, grids, guesses, dailyStats
│   ├── crons.ts                 # génération nocturne + promotion quotidienne
│   ├── grids.ts                 # actions/queries/mutations publiques et admin
│   ├── guesses.ts               # mutation submitGuess
│   ├── gridData.ts              # queries/mutations internes (accès DB)
│   └── lib/
│       ├── gridGenerator.ts     # algo pur : backtracking + scoring
│       ├── countriesData.ts     # re-export de countries.json
│       ├── constraintsData.ts   # copie des contraintes (predicates)
│       └── types.ts             # copie du type Country
├── scripts/
│   ├── build-countries.ts       # one-shot : génère countries.json
│   └── validate-constraints.ts  # rapport de calibrage
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # toggle / (GamePage) ou /admin (AdminPage)
│   ├── app/
│   │   └── providers.tsx        # ConvexProvider
│   ├── features/
│   │   ├── game/
│   │   │   ├── components/      # Header, GameGrid, Cell, GuessModal, ResultScreen, AchievementCard, HowToPlayLink, GamePage
│   │   │   ├── hooks/useGameState.ts
│   │   │   ├── logic/           # reducer, validation, rarity, share, constants, constraints
│   │   │   │   └── __tests__/
│   │   │   └── types.ts
│   │   ├── countries/
│   │   │   ├── data/countries.json
│   │   │   ├── lib/search.ts    # match-sorter wrapper
│   │   │   │   └── __tests__/
│   │   │   └── types.ts         # type Country
│   │   └── admin/
│   │       ├── AdminPage.tsx
│   │       ├── components/
│   │       └── hooks/useAdminToken.ts
│   ├── components/ui/           # shadcn dump
│   └── lib/utils.ts             # cn()
├── biome.json
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

**Règles de placement.**

- Toute logique métier pure vit dans `features/<feature>/logic/`. Zéro import React, zéro import Convex. Testée en isolation.
- Les hooks React (`features/<feature>/hooks/`) sont la seule couche qui connecte logique pure + Convex + état React.
- Les composants ne calculent rien de significatif. Ils consomment l'état du reducer et dispatchent des actions.
- Toute duplication de fichier dans `convex/lib/` par rapport à `src/features/` doit porter un commentaire en tête : `// Copie de src/... — ne pas éditer ici, regénérer si la source change.`

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

- Tous les tests sont co-localisés dans `__tests__/` à côté du code testé.
- On teste la logique pure en priorité. Très peu de tests sur les composants (faible ROI sur du visuel). Aucun test sur les hooks Convex (mock pénible).
- Un test = une assertion fonctionnelle, pas un test par ligne de code.

## 5. Design system — Editorial Intellectual

Inspiration : publications digitales haut de gamme type NYT Games. Spacieux, sophistiqué, typographique. L'expérience doit ressembler à la lecture d'un broadsheet bien composé, pas à une app.

### 5.1 Fonts

- **Newsreader** (serif) : titres, display, headlines. Jamais pour du texte long.
- **Inter** (sans-serif) : body, labels, données, boutons.
- **Règle éditoriale** : toujours associer un titre serif avec un label sans-serif en ALL CAPS espacé (tracking wide) pour créer un effet de « caption » magazine.

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

**Rarity tiers (couleurs fonctionnelles).**

| Tier              | Hex       | Emoji partage |
| ----------------- | --------- | ------------- |
| `rarity.common`   | `#56606e` | 🟩            |
| `rarity.uncommon` | `#e5e2e1` | 🟨            |
| `rarity.rare`     | `#842cd3` | 🟧            |
| `rarity.ultra`    | `#9f403d` | 🟥            |

**Règle d'application rareté** : background = couleur à 10% opacity, texte = couleur à 100%. Pill arrondi complet.

### 5.3 Règles dures

**Interdictions absolues.**

- ❌ Pas de `border: 1px solid` pour sectionner. On délimite par shift de background.
- ❌ Pas de noir pur `#000`. Toujours `on-surface` (`#2d3435`).
- ❌ Pas de blanc pur dans les backgrounds principaux (`#ffffff` est réservé aux cellules remplies et cartes flottantes).
- ❌ Pas d'ombres lourdes. L'ombre d'élévation unique autorisée est `0 20px 40px rgba(45, 52, 53, 0.06)` (classe `shadow-editorial`).
- ❌ Pas d'icônes en navigation sans label texte associé.
- ❌ Pas de borders à 100% opacity. Si un séparateur est vraiment nécessaire pour l'accessibilité, `outline-variant` à 15% opacity max.

**Principes positifs.**

- ✅ **Embrasser le whitespace.** Si une section semble chargée, doubler le padding. Pas exagérer, doubler.
- ✅ **Layering tonal.** L'élévation est suggérée par superposition de surfaces de tons légèrement différents, pas par des ombres.
- ✅ **Hiérarchie typographique.** Les différences de taille/poids/famille remplacent les boxes et les traits.
- ✅ **Glassmorphism pour les flottants.** Modales et HUD : `bg-white/80 backdrop-blur-md`.
- ✅ **Asymétrie intentionnelle.** Ne pas centrer systématiquement. Un titre `display-lg` légèrement off-center casse le feeling « template web ».

### 5.4 Composants récurrents

**Boutons.**

- **Primary** : `bg-on-surface text-white rounded-md`. Hover : légère opacity. Pas d'ombre.
- **Secondary** : `bg-surface-highest text-on-surface rounded-md`. Hover : shift d'un tier (`surface-highest` → plus foncé, à définir au cas par cas).
- **Ghost** : pas de background. Label en ALL CAPS, taille `label-md`, `text-on-surface-variant`. Hover : underline subtil.

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

### 5.5 Typographie suggérée (classes Tailwind)

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

## 6. Backend Convex — ce qu'il faut savoir

**Schéma actuel.**

- `gridCandidates` : grilles générées, status `pending | approved | rejected | used`
- `grids` : grilles assignées à une date, clé = `date` (YYYY-MM-DD)
- `guesses` : compteur par `(date, cellKey, countryCode)`
- `dailyStats` : dénormalisation `(date, cellKey) → totalGuesses` pour rareté O(1)

**Crons.**

- 23:00 UTC : `generateDailyCandidates` — génère 5 candidats avec l'algo de backtracking
- 23:30 UTC : `ensureTodayGrid` — assigne une grille approuvée à la date du lendemain. Fallback : auto-approve le meilleur candidate pending si la queue est vide.

**Auth admin.**

- Token bearer via variable d'environnement Convex `ADMIN_TOKEN`.
- Toutes les mutations admin prennent `adminToken: string` et throwent `ConvexError("Unauthorized")` si mismatch.
- Côté client : localStorage via hook `useAdminToken`.

**Règles Convex à respecter.**

- Pas de `.filter()` sur les queries — utiliser les index.
- Nommage des index : `by_<field>_and_<field>` (snake_case avec `and`).
- Toute duplication de fichier (countries, constraints) de `src/` vers `convex/lib/` est un mal nécessaire dû au sandboxing Convex — porter un commentaire explicite en tête.

<!-- convex-ai-start -->

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## 7. Commandes utiles

```bash
# Dev
pnpm dev                          # Vite dev server
pnpm dlx convex@latest dev        # Convex dev en remote cloud

# Build / CI
pnpm build                        # tsc + vite build
pnpm lint                         # Biome
pnpm test                         # Vitest

# Génération de données
pnpm build:countries              # régénère countries.json
pnpm validate:constraints         # rapport de calibrage des contraintes

# Admin Convex
pnpm dlx convex@latest env set ADMIN_TOKEN "xxx"
```

## 8. Anti-patterns à bannir

- 🚫 **Over-engineering.** Pas de state manager, pas d'abstraction générique « au cas où », pas de couche d'indirection sans besoin concret. Ce projet est un mini-jeu, pas une plateforme.
- 🚫 **Logique dans les composants.** Si un composant calcule quelque chose au-delà du formatting d'affichage, extraire en fonction pure dans `logic/`.
- 🚫 **Données dérivées stockées.** Pas de `borderCount` si `borders.length` existe. Pas de `isFilled` si le status suffit.
- 🚫 **Features spéculatives.** Pas de code mort « pour plus tard ». Si une feature n'est pas demandée, elle n'existe pas.
- 🚫 **Tests de composants visuels.** Low ROI. On teste ce qui casse : la logique pure.
- 🚫 **Bordures pour sectionner** (cf. design system).
- 🚫 **Commentaires de type `// increment counter`** qui paraphrasent le code. Les commentaires expliquent le _pourquoi_, pas le _quoi_.
