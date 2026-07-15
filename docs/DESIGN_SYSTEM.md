# Geodoku — Design system (Editorial Intellectual)

Référence visuelle détaillée. Pour les interdictions agent et l'audit automatique versionné, voir `AGENTS.md` §5 et `pnpm check:design-system`. Le skill local `/verify-design-system` est un confort de travail, pas une dépendance normative du dépôt.

Inspiration : publications digitales haut de gamme type NYT Games. Spacieux, sophistiqué, typographique. L'expérience doit ressembler à la lecture d'un broadsheet bien composé, pas à une app.

## Fonts

- **Newsreader** (serif) : titres, display, headlines. Jamais pour du texte long.
- **Inter** (sans-serif) : body, labels, données, boutons.
- **Règle éditoriale n°1** : toujours associer un titre serif avec un label sans-serif en ALL CAPS espacé (tracking wide) pour créer un effet de « caption » magazine.
- **Règle éditoriale n°2 — l'accentuation d'un mot.** Dans une phrase en body, on peut mettre **un seul mot** (rarement deux) en `text-brand font-medium` pour porter la phrase. Règles : un seul accent par phrase, jamais deux accents côte-à-côte, jamais sur un mot-outil, toujours sur le mot qui porte le sens.

## Palette

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

**Format de stockage.** Les tokens vivent dans [`src/index.css`](../src/index.css) en **canaux HSL bruts** (`<h s% l%>` sans wrapper `hsl()`) et sont consommés via `hsl(var(--…) / <alpha-value>)` dans Tailwind. **Ne jamais** réintroduire des valeurs `hsl(…)` ou `#hex` dans les `--color-*`.

**Accent éditorial — `brand` (`#842cd3`).** Seule couleur chaude. Texte à 100%, background à 10% (`bg-brand/10`). Pas de gradient ni de deuxième teinte violette. `brand` et `rarity.*` sont sémantiquement distincts.

**Tokens sémantiques** (`success`, `warning`, `error`) : états applicatifs (validation, alertes pool, erreurs). Background 10–15% opacity, texte 100%. Sémantiquement distincts de `rarity-*` malgré des teintes proches.

**Rarity tiers** (alignés sur les émojis de partage) :

| Tier              | Hex       | Emoji |
| ----------------- | --------- | ----- |
| `rarity.common`   | `#7c3aed` | 🟪    |
| `rarity.uncommon` | `#2563eb` | 🟦    |
| `rarity.rare`     | `#d97706` | 🟨    |
| `rarity.ultra`    | `#dc2626` | 🟥    |

Background = couleur à 10% opacity, texte à 100%, pill `rounded-full`.

## Règles dures

**Interdictions :** pas de bordures pour sectionner (shift de background) ; pas de `#000` / `bg-black/*` ; pas de `text-white` hors `<Button variant="default">` ; pas de shadows sauf `shadow-editorial` ; pas de palette Tailwind native ; pas de tokens shadcn parasites ; pas de `<button>` HTML natif (exceptions : `Cell.tsx`, fermeture modale `ResultScreen.tsx`) ; borders max 15% `outline-variant` ou `ring-1 ring-inset`.

**Principes :** whitespace généreux, layering tonal, hiérarchie typographique, glassmorphism modales (`bg-white/80 backdrop-blur-md`), asymétrie intentionnelle.

## Composants récurrents

**Boutons** — [`src/components/ui/button.tsx`](../src/components/ui/button.tsx). Variants : `default`, `secondary`, `ghost`, `ghost-label`, `link`. Ne pas surcharger avec `bg-*`/`text-*` si un variant existe.

**Inputs** — underline minimaliste, `outline-variant/40`, focus `on-surface` 2px.

**Badges rareté** — `rounded-full`, `px-2 py-0.5`, `text-xs font-medium`.

**Cartes / modales** — `surface-lowest` sur `surface-low`, `shadow-editorial` si nécessaire. Radius : `rounded-xl` côté joueur (cellules, cartes, banderoles, dialogs — se démarque des boutons `rounded-md`) ; `rounded-lg` pour les panels admin.

**Grilles (GameGrid)** — jamais de bordures ; `gap-1` ou `gap-2` ; cellule vide `surface-low`, remplie `surface-lowest`.

## Patterns éditoriaux nommés

Référence visuelle : [`ResultScreen.tsx`](../src/features/game/components/ResultScreen.tsx).

| Pattern | Composant / implémentation |
| ------- | -------------------------- |
| `display-header` | [`DisplayHeader`](../src/components/editorial/DisplayHeader.tsx) + [`AccentBar`](../src/components/editorial/AccentBar.tsx) + [`Eyebrow`](../src/components/editorial/Eyebrow.tsx). Exception a11y : `HowToPlayLink` → `DialogTitle + AccentBar`. |
| `hero-number` | `font-serif font-medium text-brand text-5xl` + caption `text-xs text-on-surface-variant`. Un seul par vue. |
| `accent-word` | `<span className="text-brand font-medium">` |
| `eyebrow` | [`Eyebrow`](../src/components/editorial/Eyebrow.tsx) ou [`PanelHeader`](../src/features/admin/components/PanelHeader.tsx) en admin |

### Composants admin

| Composant | Usage |
| --------- | ----- |
| [`PanelCard`](../src/features/admin/components/PanelCard.tsx) | Wrapper section admin |
| [`PanelHeader`](../src/features/admin/components/PanelHeader.tsx) | Titre eyebrow + actions |
| [`DifficultyPill`](../src/features/admin/components/DifficultyPill.tsx) | Pill 0–100 (facilité / notoriété observée — tiers easy/medium/hard pour la couleur) |
| [`StatusPill`](../src/features/admin/components/StatusPill.tsx) | État jour : scheduled / predicted / active / past |
| [`TagPill`](../src/features/admin/components/TagPill.tsx) | Contrainte ou catégorie |
| [`StatGlyph`](../src/features/admin/components/StatGlyph.tsx) | Icône + métrique (KDA) |

### Convention `rounded-*`

| Classe | Usage |
| ------ | ----- |
| `rounded-md` | Boutons |
| `rounded-lg` | Panels & cartes admin (`PanelCard`) |
| `rounded-full` | Badges, pills |
| `rounded-xl` | UI joueur : cellules, dialogs/modales, cartes & banderoles (achievement, sondage), surfaces flottantes |
| `rounded-t-2xl` | Drawer mobile uniquement |
| `rounded-3xl+` | Interdit |

## Typographie suggérée (vocabulaire, pas API Tailwind)

```
display-lg  → font-serif text-4xl md:text-5xl font-medium italic
display-sm  → font-serif text-2xl font-medium
headline-lg → font-serif text-xl font-medium
label-md    → font-sans text-xs font-semibold uppercase tracking-widest
body        → font-sans text-sm
caption     → font-sans text-xs text-on-surface-variant
```
