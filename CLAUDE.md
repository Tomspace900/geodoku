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
│       ├── gridGenerator.ts     # algo pur : backtracking + scoring (importe pays + contraintes depuis src/)
│       └── gridGenerator.test.ts
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
- Si un fichier est **dupliqué** dans `convex/lib/` par rapport à `src/features/` (copie statique, pas un import), il doit porter un commentaire en tête : `// Copie de src/... — ne pas éditer ici, regénérer si la source change.` — `gridGenerator.ts` n’est pas une copie : il importe directement `countries.json`, `constraints`, types depuis `src/`.

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

**Accent éditorial.**

| Token   | Hex       | Usage                                                                                                             |
| ------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `brand` | `#842cd3` | Accent de marque unique : titres, chiffres hero, mots mis en valeur, underline bar, icônes décoratives de trophée |

`brand` est **la seule couleur chaude** du système. Elle signifie « moment fort » : un score, un achievement, un mot qui porte la phrase. Règle d'application : texte à 100%, background à 10% opacity (`bg-brand/10`). Pas de gradient, pas de deuxième teinte violette, pas d'utilisation décorative gratuite — si tout est accentué, rien ne l'est.

Le hex est identique à `rarity.rare` mais les deux tokens sont **sémantiquement distincts** : `rarity.rare` qualifie la rareté fonctionnelle d'une cellule (peut évoluer indépendamment si le tiering de rareté change), `brand` est l'identité éditoriale. Ne pas utiliser `rarity.rare` pour du branding ou inversement.

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

### 5.5 Patterns éditoriaux nommés

Les patterns ci-dessous ont un **nom canonique**. La référence visuelle pour tous est `src/features/game/components/ResultScreen.tsx`. Avant d'en composer un à la main, relire ce fichier.

**`display-header`** — triplette titre + barre + eyebrow.

Trois éléments superposés, empilés verticalement, centrés (ou légèrement off-center pour les écrans de contenu) :

1. Un titre serif italique (`font-serif italic font-medium`), taille `text-3xl` (header de modale) à `text-5xl` (hero de page).
2. Une barre d'accent `w-12 h-1 bg-brand rounded-full`. Pas plus large, pas plus épaisse — la discrétion est le point.
3. Un eyebrow label : `text-[10px] tracking-widest text-on-surface-variant uppercase`, en dessous de la barre (pas au-dessus du titre comme les kickers de presse classique — ici l'eyebrow est une **légende**, pas une introduction).

Exemple de référence : `ResultScreen.tsx` ll. 47-55.

**`hero-number`** — un chiffre ou un score mis en évidence.

- `font-serif font-medium text-brand`.
- Taille `text-5xl` (score final, modale) à `text-6xl` (landing, si jamais).
- Accompagné obligatoirement d'une ligne de caption juste en dessous : `text-xs text-on-surface-variant`, décrivant ce que le chiffre mesure.
- Jamais deux `hero-number` dans la même vue. Si deux chiffres se disputent l'attention, l'un doit être un `hero-number` et l'autre en body.

Exemple de référence : `ResultScreen.tsx` ll. 58-65.

**`accent-word`** — un mot en violet dans une phrase.

Voir §5.1 règle éditoriale n°2. Implémentation : `<span className="text-brand font-medium">mot</span>`. Pas de composant dédié — c'est une micro-convention typographique, pas un atome d'UI.

**`eyebrow`** — les micro-labels all-caps.

- `text-[10px] tracking-widest uppercase text-on-surface-variant`.
- Toujours associés à un élément serif au-dessus ou en dessous (jamais seuls). Leur rôle est de légender un bloc, pas de titrer.
- En alternative plus grande : `label-md` (voir §5.6).

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
- Côté client : `sessionStorage` via hook `useAdminToken` (effacé à la fermeture de l’onglet).

**Règles Convex à respecter.**

- Pas de `.filter()` sur les queries — utiliser les index.
- Nommage des index : `by_<field>_and_<field>` (snake_case avec `and`).
- Lorsqu’on duplique un fichier de `src/` vers `convex/lib/` (mal nécessaire du sandboxing), porter un commentaire explicite en tête. Ici, pays + contraintes vivent dans `src/` et sont importés par `gridGenerator.ts` plutôt que recopiés.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

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

# Seed historique (DB vide ou `--force` après wipe) — internal action `seed:seedHistoricalGrids`
pnpm seed:grids                        # idempotent si `grids` non vide
pnpm seed:grids:force                 # forcer (dev uniquement)

# Admin Convex
pnpm dlx convex@latest env set ADMIN_TOKEN "xxx"
```

## 8. CI, Vercel et `convex/_generated`

- Le dossier **`convex/_generated/` est versionné** (recommandation Convex) : sans lui, `pnpm build` / `tsc` échouent sur Vercel ou toute CI qui clone le repo sans avoir lancé `convex dev` avant.
- Après un changement de **schéma** ou d’**API Convex** (`convex dev` régénère les fichiers), **commiter** les fichiers mis à jour dans `convex/_generated/`.
- **Alternative** quand le backend prod est prêt : build Vercel du type `pnpm dlx convex@latest deploy --cmd 'pnpm run build'` avec `CONVEX_DEPLOY_KEY` (voir [hosting Vercel](https://docs.convex.dev/production/hosting/vercel)) — déploie Convex et injecte l’URL pour le build ; ici on reste sur **build statique** + `_generated` commité tant que tu sépares volontairement prod et front.

## 9. Anti-patterns à bannir

- 🚫 **Over-engineering.** Pas de state manager, pas d'abstraction générique « au cas où », pas de couche d'indirection sans besoin concret. Ce projet est un mini-jeu, pas une plateforme.
- 🚫 **Logique dans les composants.** Si un composant calcule quelque chose au-delà du formatting d'affichage, extraire en fonction pure dans `logic/`.
- 🚫 **Données dérivées stockées.** Pas de `borderCount` si `borders.length` existe. Pas de `isFilled` si le status suffit.
- 🚫 **Features spéculatives.** Pas de code mort « pour plus tard ». Si une feature n'est pas demandée, elle n'existe pas.
- 🚫 **Tests de composants visuels.** Low ROI. On teste ce qui casse : la logique pure.
- 🚫 **Bordures pour sectionner** (cf. design system).
- 🚫 **Commentaires de type `// increment counter`** qui paraphrasent le code. Les commentaires expliquent le _pourquoi_, pas le _quoi_.
