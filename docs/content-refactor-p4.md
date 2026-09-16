# P4 — Sources des contraintes et fiches pays

> Plan d'exécution autonome, suite des refactos contenu P1 à P3 (journaux retirés
> du dépôt en `c989081`, consultables par
> `git show c989081^:docs/content-refactor-p3.md`).
>
> Les décisions produit de la §1 sont **actées** (cadrage du 2026-09-16) : les
> appliquer, ne pas les rediscuter. Un écart imposé par le code se consigne au
> journal (§6) ; s'il change ce que voit le joueur, il remonte au gate.
>
> **Gates utilisateur** : chaque lot se termine par un dossier de validation.
> L'exécutant prépare le dossier puis **s'arrête**. Ne jamais merger un lot sans
> feu vert explicite de l'utilisateur.

## 0. Contexte

État de départ (2026-09-16, `develop` = `74a07a0`) : 77 contraintes actives, 12
archivées, 8 en réserve, 197 pays ; snapshot de faits daté du 2026-09-10 ;
chargement joueur initial ~246 KiB gzip (budget bloquant 280).

P4 livre deux features joueur :

1. **Sources des contraintes.** Toucher un en-tête de contrainte affiche un toast
   discret en bas d'écran : source(s), millésime, mention de convention, et au
   plus une phrase de clarification.
2. **Fiches pays.** La grille solution devient un résumé cliquable. Une case
   ouvre un Drawer listant ses réponses ; un pays ouvre sa fiche, qui présente
   tous les faits du snapshot rangés par catégories. Le snapshot s'enrichit
   ensuite de faits pédagogiques, un lot par source.

**Hors périmètre** : toute modification d'une liste de réponses, d'une dérivation
ou du catalogue de contraintes ; tout cas limite visible par le joueur ; toute
fiche accessible pendant une partie ; toute nouvelle route ; le rendu des
drapeaux emoji sous Windows (limite connue, héritée par la fiche).

### Lectures préalables obligatoires

`AGENTS.md` (en entier), `content/README.md`, `content/constraints/SOURCES.md`,
`content/countries/SOURCE.md`, `docs/content-pipeline.md`,
`docs/DESIGN_SYSTEM.md`. Relever la **ligne de base** avant le lot 1 et la
consigner au journal : `pnpm test` (nombre de tests), `pnpm check:content`
(sortie), `pnpm check:bundle` (chargement initial en KiB).

## 1. Décisions actées

### 1.1 Sources des contraintes

| Sujet | Décision |
| --- | --- |
| Surface | Toast flottant en bas d'écran, déclenché par un tap ou un clic sur un en-tête de contrainte. Même comportement sur la grille de jeu et sur la grille solution, en quotidien comme en entraînement. |
| Contenu | Source(s) avec leur **millésime** ; la mention « Classification Geodoku » si la contrainte est une convention ; au plus **une** phrase de clarification. |
| Millésime | La **période que décrit la donnée** (« 2024 », « campagnes 2023/24 à 2025/26 »). Aucune date quand la source n'en a pas (nomenclature, drapeaux, frontières). Jamais la date de regen ni `checked_at`. |
| Convention | `basis: "convention"` quand l'appartenance à la liste est un **jugement éditorial Geodoku**, défendable mais discutable (symboles de drapeau, reliefs et milieux, Moyen-Orient, régime, continent des pays transcontinentaux). Une donnée d'autorité recopiée à la main (volcans, café, souveraineté) reste `basis: "source"`. |
| Convention sans source (décidé au gate du lot 1) | Une convention **peut n'avoir aucune source externe** — `sources: []` — quand la revue éditoriale ne s'appuie sur aucun dataset lu par le pipeline (ex. `physical_peak_over_5000m`, `society_capital_not_largest`, `subregion_middle_east` : leurs `SOURCE.md` ne citent qu'une « revue éditoriale », jamais un dataset). Le toast affiche alors seulement « Classification Geodoku » (+ la clarification éventuelle), sans liste de sources ni préfixe « Source(s) : ». Anticiper une source que le pipeline ne lit pas encore (ex. citer le Factbook avant que le lot 5 ne le lise réellement) est **interdit** — cf. §2.1 « ne jamais citer une référence de révision que le pipeline ne lit pas ». `basis: "source"` reste soumis à `sources: readonly [SourceId, ...SourceId[]]` (au moins une entrée) : seule `"convention"` autorise le tableau vide. Vaut aussi pour `FactProvenance` au lot 2 (§2.3). |
| Clarification | Seulement si le libellé est ambigu (la plupart valent `null`). **Aucun nom de pays**, sauf un pays déjà nommé par le libellé (« Frontalier de la Russie »). Aucune aide explicite. |
| Niveau 2 | **Aucun.** Les cas limites restent dans les `SOURCE.md` et ne sont jamais affichés. |
| Découvrabilité | Aucun indice permanent sur l'en-tête : un retour au survol ou à la pression seulement, et une phrase dans « Comment jouer ». |
| Stockage | `content/sources.ts` (registre) et `content/constraints/<id>/about.ts` (typé), cf. §2. |
| Composant | Toast maison sur les tokens existants, sans nouvelle dépendance. |

### 1.2 Fiches pays

| Sujet | Décision |
| --- | --- |
| Case solution | Résumé lisible : ton choix avec son tier, le pays le plus rare trouvé par la cohorte, le nombre de réponses. |
| Navigation | Tap sur une case → Drawer des réponses (même geste et même coque que `GuessModal`) → tap sur un pays → sa fiche **dans le même Drawer**, en pile, avec un bouton retour. Ni route ni paramètre d'URL. |
| Contenu | **Tous les faits**, rangés par catégories, **sans lien avec les contraintes du jeu**. |
| Accès | Uniquement depuis la grille solution. **Jamais pendant une partie**, en quotidien comme en entraînement : la fiche donnerait les réponses. |
| Chargement | Les faits sont chargés à la demande dans un chunk dédié, préchargé à l'affichage de la grille solution. |
| Valeur absente | `null` ou champ non couvert → ligne **masquée**, jamais affichée comme 0. |
| Convention | La mention « Classification Geodoku » s'applique aussi aux faits de convention sur la fiche. |
| Faits ajoutés | Monnaie, gentilé, point culminant, PIB par habitant, espérance de vie, IDH, et la date complète de l'événement de souveraineté. |
| Noms propres | Capitales et points culminants en FR/EN, à partir d'une table amorcée par une récolte Wikidata ponctuelle et vendorée. |
| Stash | `stash@{0}` « wip barre solutiongrid » est abandonné : il contredit la règle « une seule base de rareté partout », et la case résumé le rend caduc. |

### 1.3 Phasage

| Lot | Contenu | Source nouvelle |
| --- | --- | --- |
| 1 | Registre des sources, `about.ts`, toast | — |
| 2 | Grille solution, Drawer, fiches sur les faits **existants** | — |
| 3 | Noms FR/EN des capitales | Wikidata |
| 4 | Monnaie, gentilé, date de souveraineté | — (world-countries, dataset existant) |
| 5 | Point culminant | CIA World Factbook + libellés Wikidata |
| 6 | PIB par habitant, espérance de vie | Banque mondiale (WDI) |
| 7 | Indice de développement humain | PNUD |

Chaque lot est mergeable seul et enrichit la fiche dès son merge.
**Recommandation de publication** (décision de l'utilisateur) : ne pas publier
les fiches sur `main` avant le lot 3, sans quoi une fiche française afficherait
« Vienna ».

**Changelog** (décidé au gate du lot 1) : aucune entrée pour le lot 1 — le toast
de source est une amélioration discrète, pas un événement à annoncer seul. Une
entrée commune « sources et fiches pays » sera proposée à la publication des
fiches (lot 3 au plus tôt, cf. recommandation ci-dessus).

## 2. Modèle cible

### 2.1 Registre des sources — `content/sources.ts` (lot 1)

```ts
import type { LocalizedString } from "./type";

export type SourceReference = Readonly<{
  /** Nom court affiché : « Smithsonian GVP », « Banque mondiale ». */
  name: LocalizedString;
  /** Page publique de la source, en https. */
  url: string;
  /** Période que décrit la donnée ; `null` si sans objet. */
  vintage: LocalizedString | null;
}>;

export const SOURCES = {
  smithsonian_gvp: { name: { fr: "…", en: "…" }, url: "https://…", vintage: … },
  // …
} as const satisfies Record<string, SourceReference>;

export type SourceId = keyof typeof SOURCES;
```

Règles :

- **Une entrée = une source et un millésime.** Deux jeux d'un même éditeur à
  millésimes différents font deux entrées (`eia_crude_oil`, `eia_natural_gas`
  si leurs `referenceYear` diffèrent).
- **Citer qui produit la donnée réellement lue** par le pipeline
  (`content/countries/SOURCE.md` fait foi). Si le pipeline lit une
  redistribution fidèle (les régions de world-countries alignées sur l'ONU M49)
  **et** que la doc documente cet alignement, citer le producteur ; sinon citer
  le redistributeur (la population REST Countries se cite « REST Countries »,
  sans millésime). Ne jamais citer une « référence de révision » que le pipeline
  ne lit pas.
- Les millésimes se lisent dans les en-têtes des datasets (`referenceYear`,
  `sourceUpdatedAt`, période de moyenne) et dans les `SOURCE.md`.
- `ContentBasis` est déclaré dans `content/type.ts` (partagé par les
  contraintes et les faits) : `export type ContentBasis = "source" | "convention";`

### 2.2 « À propos » d'une contrainte (lot 1)

```ts
// content/constraints/type.ts — ajout
// Union discriminée (décidée au gate du lot 1) : seule "convention" peut
// n'avoir aucune source ; "source" en exige au moins une.
export type ConstraintAboutSources =
  | { basis: "source"; sources: readonly [SourceId, ...SourceId[]] }
  | { basis: "convention"; sources: readonly SourceId[] };

export type ConstraintAbout<TId extends string> = Readonly<
  { id: TId; clarification: LocalizedString | null } & ConstraintAboutSources
>;
```

```ts
// content/constraints/nature_active_volcano/about.ts — forme attendue
import { defineAbout } from "../defineAbout";

export default defineAbout("nature_active_volcano", {
  sources: ["smithsonian_gvp"],
  basis: "source",
  clarification: {
    fr: "Au moins une éruption datée de 1500 ou après, sur le territoire pleinement intégré du pays.",
    en: "At least one eruption dated 1500 or later, on the country's fully integrated territory.",
  },
});
```

- `defineAbout` (dans `content/constraints/defineAbout.ts`) suit le patron de
  `defineAnswerSet` : il fige l'identifiant en type littéral.
- **Registre dans un module séparé**, `content/constraints/abouts.ts`, typé
  `{ [K in ConstraintId]: ConstraintAbout<K> }` à la manière d'`ANSWER_SETS`,
  exportant `aboutForConstraint(id)`. **Pas dans `index.ts`** : Convex importe
  `content/constraints/index.ts` via `src/features/game/logic/constraints.ts`,
  et les textes joueur n'ont rien à faire côté serveur.
- Couverture : les 77 actives **et** les 12 archivées, rejouables 7 jours. Les
  contraintes en réserve n'ont **pas** d'`about.ts`.

### 2.3 Provenance des faits — `content/countries/factProvenance.ts` (lot 2)

```ts
export type FactProvenance = Readonly<{
  sources: readonly [SourceId, ...SourceId[]];
  basis: ContentBasis;
}>;

export const FACT_PROVENANCE: {
  readonly [K in keyof CountryFacts]: FactProvenance;
} = { /* … */ };
```

Le type est exhaustif : ajouter un champ à `CountryFacts` sans provenance ne
compile pas. Ce fichier reflète le tableau de `content/countries/SOURCE.md`, et
tout changement se fait dans les deux. Le statut « curé » de la doc ne vaut
**pas** automatiquement `convention` (cf. §1.1) : `flagColors`, `flagSymbols`,
`flagLayout`, `geoTags`, `regime`, `physicalFeatures` et `continent` sont des
conventions ; les datasets quantitatifs, `events` et `memberships` sont `source`.

**Convention sans source (décidé au gate du lot 1, §1.1) :** `FactProvenance`
doit suivre la même union discriminée que `ConstraintAbout` — `sources: []`
autorisé seulement quand `basis: "convention"` et qu'aucun dataset n'est
effectivement lu. Ne pas répéter au lot 2 l'erreur du lot 1 (citer une source
que le pipeline ne lit pas encore) : un champ de convention sans dataset dédié
n'a droit à aucune entrée `SOURCES`, pas à une entrée anticipant un lot futur.

### 2.4 Chargement paresseux de la fiche (lot 2)

- **Une seule entrée dynamique** : `src/features/countries/logic/countrySheetData.ts`
  importe `COUNTRY_FACTS` (`content/countries/facts`) et `FACT_PROVENANCE`, et
  n'est chargé que par `import()` depuis `loadCountrySheetData.ts` (promesse
  mémoïsée).
- `src/` ne doit **jamais** importer statiquement `content/countries/facts` ni
  `factProvenance` : ces modules rentreraient dans le graphe initial. Les
  modules de logique n'en importent que des **types** (`import type`).
- `scripts/ci/check-bundle-size.ts` exige aujourd'hui **exactement 3 entrées
  dynamiques** (les routes lazy). Ajouter une liste `LAZY_FEATURE_MODULES`, avec
  la même règle d'exhaustivité dans les deux sens, et un commentaire qui en
  donne la raison. Le chunk de fiche reste sous le plafond non initial
  (150 KiB gzip).

### 2.5 Faits ajoutés au snapshot (lots 3 à 7)

| Lot | Champ `CountryFacts` | Forme |
| --- | --- | --- |
| 3 | `capitals[].names` | `LocalizedString` (le `name` source est conservé) |
| 4 | `currencies` | `readonly string[]` (codes ISO 4217) |
| 4 | `demonyms` | `Readonly<{ fr: { m: string; f: string }; en: { m: string; f: string } }>` |
| 4 | `sovereigntyDate` | `string \| null` (`YYYY-MM-DD`) |
| 5 | `highestPoint` | `Readonly<{ names: LocalizedString; elevationM: number }> \| null` |
| 6 | `gdpPerCapitaUsd` | `Readonly<{ value: number; year: number }> \| null` |
| 6 | `lifeExpectancyYears` | `Readonly<{ value: number; year: number }> \| null` |
| 7 | `humanDevelopmentIndex` | `Readonly<{ value: number; year: number }> \| null` |

Chaque champ issu d'un dataset de `scripts/countries/data/` rejoint
`DATASET_DERIVED_KEYS` (`validateDatasetFacts`) et gagne ses invariants dans
`validateCountryFacts`. Un champ **calculable** (densité, catégorie d'IDH) n'est
**jamais stocké** : il se calcule à l'affichage (`AGENTS.md` §9).

Tout nouveau champ s'accompagne, dans le même lot :

- de son entrée `FACT_PROVENANCE` (le typecheck l'impose) ;
- de sa ou ses entrées `SOURCES` avec millésime ;
- de sa ligne dans le tableau de `content/countries/SOURCE.md`.

Le lot 3 documente en plus la convention `scripts/countries/harvest/` dans
`AGENTS.md` §3 (arborescence), `docs/content-pipeline.md` et le schéma de
`content/README.md`.

**Récoltes réseau.** Les données des lots 3, 5, 6 et 7 sont récoltées par des
scripts versionnés dans `scripts/countries/harvest/<dataset>.ts`, lancés à la
main (`pnpm exec tsx …`), qui écrivent `scripts/countries/data/<dataset>.ts`
avec un en-tête de provenance (source, URL ou requête, date de récolte,
procédure de révision). Ils ne sont **jamais** importés par `build:countries`,
`check:content` ni les tests : le build reste hors-ligne vis-à-vis de ces
sources.

## 3. Les lots

Chaque lot se déroule sur une branche **locale** `p4-lot<N>` créée depuis
`develop` à jour, selon la procédure commune (§4).

### Lot 1 — Sources des contraintes et toast

**Contenu**

1. Créer `content/sources.ts` (§2.1) et `ContentBasis` dans `content/type.ts`.
2. Créer `ConstraintAbout`, `defineAbout`, puis les 89 `about.ts` (77 actives et
   12 archivées), établis **uniquement** à partir des `SOURCE.md` et de
   `content/countries/SOURCE.md`. Ensuite `content/constraints/abouts.ts` (§2.2).
3. Rédiger les clarifications de façon parcimonieuse : `null` par défaut,
   quelques dizaines tout au plus, **160 caractères maximum**, neutres, sans
   pays, fidèles à la section « Définition » du `SOURCE.md`.

**Garde** — `scripts/content/validateConstraintAbouts.ts`, câblé dans `check-content.ts` :

- un `about.ts` par contrainte active ou archivée, aucun dans un dossier en
  réserve, aucun orphelin ;
- chaque `SourceId` du registre est référencé au moins une fois (au lot 2,
  « référencé » inclut `FACT_PROVENANCE`) ;
- les URL sont en `https://` ;
- la clarification tient en 160 caractères, avec `fr` et `en` non vides ;
- la clarification ne contient **aucun nom de pays** : comparaison normalisée
  (NFD, sans accents, minuscules, bornes de mot) contre `names.fr` et `names.en`
  du catalogue, sauf pour un nom présent dans le libellé traduit de la
  contrainte. Un faux positif (« Niger » pour le fleuve) se reformule ; à
  défaut, il s'inscrit dans une liste d'exceptions **motivées**, sur le modèle
  d'`ACCEPTED_OMISSIONS`.
- Tests dans les deux sens (`validateConstraintAbouts.test.ts`), sur le modèle
  de `validateContentSeam.test.ts`.

**Logique et UI**

4. `src/features/game/logic/constraintSource.ts` : fonction pure
   `constraintSourceView(id, locale)` qui renvoie les sources (nom, millésime,
   URL), le booléen de convention et la clarification. Tests unitaires.
5. `src/features/game/components/ConstraintHeaderButton.tsx` : en-tête
   cliquable partagé par `GameGrid` et `SolutionGrid`. Il remplace le
   `headerClass` dupliqué dans ces deux fichiers, rend un
   `<Button variant="ghost" size="auto">` sur toute la surface de l'en-tête,
   sans icône et avec le même rendu visuel qu'aujourd'hui (hors survol et
   pression). Son nom accessible contient le libellé de la contrainte.
   `GridMatrix` ne change pas.
6. `src/features/game/hooks/useConstraintSourceToast.ts` : état du toast
   (contrainte active, surface, minuteur). Constante
   `CONSTRAINT_SOURCE_TOAST_MS` (≈ 6000) dans `logic/constants.ts`.
   Comportement :
   - taper l'en-tête déjà affiché **ferme** le toast ;
   - taper un autre en-tête **remplace** le toast et relance le minuteur ;
   - le minuteur se suspend au survol et au focus interne ;
   - `Échap` ferme le toast ;
   - l'ouverture de `GuessModal` ou du Drawer de case ferme le toast.
7. `src/features/game/components/ConstraintSourceToast.tsx`, rendu **une fois**
   par page (`GamePage` et `TrainingPage`) :
   - un conteneur `fixed` en bas, `pointer-events-none`, et le toast lui-même en
     `pointer-events-auto`, pour ne jamais bloquer une case ;
   - une marge `env(safe-area-inset-bottom)` ;
   - `rounded-xl`, `shadow-editorial`, fond `bg-surface-lowest` ou glassmorphism
     (`bg-white/80 backdrop-blur-md` **sur la même ligne**, cf. garde DS) ;
   - la typographie « caption » du design system ;
   - `role="status"` et `aria-live="polite"` ;
   - les noms de source en `<Button asChild variant="link">`
     (`target="_blank" rel="noreferrer"`) ;
   - un z-index inférieur aux Drawers et Dialogs.
8. « Comment jouer » : ajouter la clé `howToPlay.sourcesHint` (fr et en), une
   phrase discrète du type « Touche une contrainte pour voir d'où viennent les
   données ».
9. Analytics : `constraint_source_viewed` avec `grid_date`, `mode` (`daily` ou
   `training`), `surface` (`playing` ou `solution`) et `constraint_id`. C'est un
   event **partagé** distingué par `mode`, qui ne réutilise aucun event daily.
   Ajouter une ligne au tableau d'`AGENTS.md` §10.
10. e2e `e2e/constraint-source.shared.spec.ts` : le tap sur un en-tête de
    colonne affiche `role="status"` avec le libellé, n'ouvre **pas**
    `GuessModal`, et `Échap` masque le toast.
11. Docs : `content/README.md` (sources, `about.ts`, `abouts.ts`),
    `content/constraints/SOURCES.md` (la procédure de révision inclut la mise à
    jour d'`about.ts`), `AGENTS.md` §3 (règles contenu : `about.ts` obligatoire,
    clarification sans pays, `basis`) et §10, `docs/content-pipeline.md`,
    `docs/DESIGN_SYSTEM.md` (patron « toast flottant »), et l'en-tête de
    `check-content.ts`.

**Critères d'acceptation** : toutes les gardes vertes ; un toast conforme sur
mobile (375 px) et desktop ; aucun décalage de mise en page de la grille ;
hausse du chargement initial **≤ 8 KiB**, au-delà s'arrêter et le signaler.

**Dossier de gate**

- tableau des 89 contraintes : libellé fr, sources et millésimes affichés,
  `basis`, clarification fr/en ;
- registre des sources, chacune avec sa provenance réelle en regard ;
- captures du toast (mobile et desktop, avec et sans clarification, contrainte
  de convention) ;
- delta du bundle ;
- proposition d'entrée changelog (l'utilisateur décide de sa publication).

### Lot 2 — Grille solution, Drawer et fiches (faits existants)

0. Vérifier que `stash@{0}` porte bien le message « wip barre solutiongrid »,
   puis `git stash drop stash@{0}`.

**Logique pure**

1. `src/features/game/logic/solutionCellSummary.ts`, qui renvoie
   `{ userPick, rarestFound, answerCount }` :
   - `userPick` : le pays placé et son tier, ou `null` si la case est vide ou
     bloquée ;
   - `rarestFound` : parmi les réponses de la case, celle de **plus petite part
     strictement positive** dans la distribution (donc choisie au moins une
     fois). En cas d'égalité, ordre alphabétique localisé via un comparateur
     injecté. `null` sans distribution. Si c'est le choix du joueur, le résumé
     le signale au lieu de dupliquer la ligne.
   - **Base de rareté unique** : les tiers de la case, du Drawer et du jeu
     passent tous par `filledCellShare(iso, cellDist, isCohortComplete(mode))`.
     Aujourd'hui `resolveSolutionCountryTier` donne `null` quand
     `totalGuesses === 0` alors que `filledCellTier` donne « ultra » sur une
     cohorte close : unifier, et adapter `solutionGridOrder` et ses tests.
2. `src/features/countries/logic/countrySheet.ts` :
   `buildCountrySheet(iso3, data)` renvoie un modèle **pur** composé de
   catégories, chacune avec sa clé de titre, ses lignes
   (`labelKey`, valeur typée en union discriminée, `basis`) et l'union des
   sources de ses lignes. Aucun appel à `t()` ni à `Intl` ici.
3. `src/features/countries/logic/countrySheetFormat.ts` : formateurs purs
   (nombres, pourcentages, surfaces, années négatives « 8300 av. J.-C. » /
   « 8300 BCE », ordinaux « 7ᵉ » / « 7th », listes de pays, langues via
   `Intl.DisplayNames` avec repli sur une clé i18n curée).
4. Les libellés d'énumérations passent par des tables exhaustives
   `Record<Enum, TKey>`, pour qu'une clé manquante échoue au typecheck :
   sous-régions (24), continents, accès à la mer, façades, milieux, couleurs,
   symboles et dispositions de drapeau, événements, adhésions (13), anciennes
   puissances (9), natures de souveraineté (7), produits (6), sens de
   circulation, régime, territoires non jouables cités en frontière (`ESH`,
   `HKG`, `MAC`). Ne **pas** réutiliser les libellés `constraint.*`, formulés
   comme des contraintes.
5. Tests : `solutionCellSummary.test.ts` et `countrySheet.test.ts`, qui couvrent
   les règles de masquage, la densité calculée, les capitales multiples, les
   années négatives, les ordinaux FR et EN, et les frontières hors catalogue.

**Correspondance faits → fiche** (faits existants ; « conv. » = mention
« Classification Geodoku »)

En-tête : drapeau, nom localisé, sous-région.

| Catégorie | Ligne | Champ(s) | Affichage | Masquée si |
| --- | --- | --- | --- | --- |
| Repères | Capitale(s) | `capitals` | noms, avec rôles si plusieurs (ZAF, BOL, PSE, SWZ) ; mention « n'est pas la plus grande ville » si `geoTags` ∋ `capital_not_largest` (conv.) | jamais |
| Repères | Population | `population` | nombre complet localisé | jamais |
| Repères | Superficie | `areaKm2` | `551 695 km²` | jamais |
| Repères | Densité | calculée | `125 hab./km²`, arrondie | jamais |
| Repères | Langues officielles | `officialLanguages` | noms localisés | liste vide |
| Géographie | Continent | `continent` | libellé (conv.) | jamais |
| Géographie | Moyen-Orient | `geoTags` ∋ `middle_east` | « Oui » (conv.) | tag absent |
| Géographie | Accès à la mer | `waterAccess` | enclavé, côtier ou insulaire | jamais |
| Géographie | Pays voisins | `borders` | noms localisés triés ; vide → « Aucun » | jamais |
| Géographie | Façades maritimes | `physicalFeatures` (6 façades) | liste (conv.) | aucune |
| Géographie | Traversé par l'équateur | `physicalFeatures` ∋ `equator_crosser` | « Oui » (conv.) | absent |
| Géographie | Fuseaux horaires | `utcOffsetCount` | « 5 décalages horaires distincts » | jamais |
| Relief et nature | Sommet de plus de 5 000 m | `physicalFeatures` ∋ `peak_over_5000m` | « Oui » (conv.), **retiré au lot 5** | absent |
| Relief et nature | Part montagneuse | `mountainAreaShare` | `21 %` | `null` |
| Relief et nature | Couverture forestière | `forestCoverShare` | `32 %` | `null` |
| Relief et nature | Milieux | `has_desert`, `rainforest` | liste (conv.) | aucun |
| Relief et nature | Dernière éruption | `lastVolcanicEruptionYear` | année | `null` |
| Société et économie | Villes de plus d'un million d'habitants | `urbanCentresOver1M` | nombre ; 0 → « Aucune » | jamais |
| Société et économie | Sens de circulation | `drivingSide` | à gauche ou à droite | jamais |
| Société et économie | Productions | `productionRanks` | une ligne par produit, par rang : « 7ᵉ producteur mondial de blé » | aucun rang |
| Société et économie | Électricité issue du charbon | `coalElectricityShare` | `0,2 %` | `null` |
| Histoire et politique | Régime | `regime` | monarchie ou république (conv.) | jamais |
| Histoire et politique | Souveraineté | `sovereigntyKind`, `sovereigntyYear` | nature et année (cf. gate) | `null` |
| Histoire et politique | Ancienne puissance | `formerSovereigns` | liste | liste vide |
| Histoire et politique | Organisations | `memberships` | liste, ordre fixe | liste vide |
| Histoire et politique | Grands événements accueillis | `events` | liste | liste vide |
| Drapeau | Couleurs, symboles, disposition | `flag*` | listes (conv.) | liste vide |

Champs non affichés : `latitude` (brute) et `geoTags` ∋ `drives_on_left`
(doublon de `drivingSide`, cohérence vérifiée le 2026-09-16). Chaque catégorie
se termine par une légende listant ses sources et leurs millésimes. Aucune date
de snapshot n'est affichée.

**Données et chargement**

6. Créer `content/countries/factProvenance.ts` (§2.3), puis étendre la garde
   « source référencée » du lot 1 à ce fichier.
7. Créer `countrySheetData.ts`, `loadCountrySheetData.ts` et le hook
   `src/features/countries/hooks/useCountrySheetData.ts`, qui renvoie
   `{ status: "loading" } | { status: "ready"; data } | { status: "error"; retry }`.
   Le préchargement se déclenche au montage de la vue solution. Mettre à jour
   `check-bundle-size.ts` (§2.4).

**UI**

8. `SolutionGrid.tsx` : chaque case non vide devient un `<Button>` (jamais un
   `<button>` natif) qui affiche le résumé, en texte **d'au moins 11 px** sur
   mobile. Une case sans réponse reste « — » et n'est pas cliquable. Les
   en-têtes utilisent `ConstraintHeaderButton` (lot 1).
9. `src/features/game/components/SolutionCellDrawer.tsx`, qui reprend la coque
   `DrawerContent` de `GuessModal` :
   - titre « ligne × colonne » ;
   - liste ordonnée par `orderSolutionCountries` : drapeau, nom, part, pastille
     de tier, et marque « ton choix » ;
   - chaque ligne est un `<Button>` qui pousse la fiche.
   Vue fiche :
   - un bouton retour (`variant="ghost"`, icône, nom accessible « Retour aux
     réponses ») ;
   - le nom du pays en titre ;
   - un squelette pendant le chargement, un message et un bouton « Réessayer »
     en cas d'erreur.
   Focus :
   - à la fermeture, rendre le focus à la case via `focusWithoutVisibleRing` ;
   - à l'ouverture de la fiche, placer le focus sur le bouton retour ;
   - au retour, le rendre à la ligne du pays.
   Un Drawer rouvert repart toujours sur la liste.
10. `src/features/countries/components/CountrySheet.tsx` rend le modèle, avec
    des titres de catégorie en `Eyebrow`, des lignes libellé/valeur, la mention
    de convention en légende discrète et les sources en pied de catégorie.
    L'état de la pile (liste ou fiche) est un état UI local du Drawer.
11. Analytics : `solution_cell_opened` (`grid_date`, `mode`, `cell`,
    `answer_count`) et `country_sheet_opened` (`grid_date`, `mode`, `cell`,
    `country_code`), deux events partagés distingués par `mode`. Mettre à jour
    `AGENTS.md` §10 et garder `solution_viewed` inchangé.
12. e2e : étendre le parcours après défaite de `completion.desktop.spec.ts` :
    - ouvrir la case 1,1, qui affiche une réponse de `solution["0,0"]` ;
    - toucher cette réponse, qui ouvre la fiche avec son nom en titre et une
      catégorie visible ;
    - revenir à la liste, puis fermer le Drawer, ce qui rend le focus à la case.
    Les assertions existantes (focus « View my score », `RarityHint`) restent
    vertes. Ajouter un cas mobile si un helper de défaite réutilisable existe ;
    sinon, le consigner.
13. Docs : `AGENTS.md` §3 (chunk de fiche, garde bundle, `factProvenance`) et
    §10 ; `content/README.md` ; `content/countries/SOURCE.md` (le tableau et
    `FACT_PROVENANCE` évoluent ensemble) ; commentaire de
    `check-bundle-size.ts`.

**Critères d'acceptation** :
- gardes vertes ;
- chargement initial en hausse de **10 KiB au plus** ;
- `content/countries/facts` absent du graphe initial (le vérifier dans
  `dist/.bundle-modules.json`) ;
- chunk de fiche mesuré et consigné ;
- aucune fiche atteignable pendant une partie (vérifié à la main en quotidien
  et en entraînement).

**Dossier de gate**

- captures de la grille solution, du Drawer et d'une fiche, sur mobile et sur
  desktop, pour FRA, ZAF (capitales multiples), un pays insulaire, un pays
  enclavé et XKX ;
- **revue d'affichage** : les faits corrects pour une dérivation mais faux ou
  trompeurs une fois affichés sur une fiche (cf. §5, souveraineté), avec une
  règle d'affichage recommandée pour chacun ;
- codes de langue sans nom `Intl` et leur libellé curé ;
- tailles du chunk et du chargement initial ;
- proposition d'entrée changelog.

### Lot 3 — Capitales en FR/EN (Wikidata)

1. `scripts/countries/harvest/capitalLabels.ts` interroge le SPARQL Wikidata
   (`query.wikidata.org`, avec un `User-Agent` descriptif) : pour chaque pays
   (ISO3 via `P298`, QID explicite quand `P298` manque, comme pour le Kosovo),
   ses capitales (`P36`) et leurs `rdfs:label` fr/en. Le script écrit
   `scripts/countries/data/capitalLabels.ts`, indexé par ISO3 puis par **nom
   source** REST Countries.
2. **La liste des capitales reste celle de REST Countries** : la récolte ne fait
   que traduire, elle n'ajoute ni ne retire aucune capitale. Un nom source sans
   correspondance Wikidata passe par un bloc `overrides` du dataset, chaque
   entrée avec son motif. Un libellé fr absent n'est jamais remplacé en silence
   par l'en : il passe aussi en override.
3. `build-countries` fusionne `names` dans `capitals` ; `validateCountryFacts`
   vérifie que chaque capitale a des `names.fr` et `names.en` non vides. La
   fiche affiche `names[locale]`.
4. `FACT_PROVENANCE.capitals` et `content/countries/SOURCE.md` gagnent la source
   Wikidata.

**Dossier de gate** : les capitales dont fr ≠ en ou fr ≠ nom source (les ~202
entrées sont listées si le volume reste lisible), les overrides et leurs motifs,
et les libellés douteux.

### Lot 4 — Monnaie, gentilé, date de souveraineté (hors-ligne)

1. `currencies` : les clés de `world-countries` `currencies`, corrigées dans
   `countryPatches.ts` par une nouvelle table `currencyCorrectionsByIso3`, dont
   chaque entrée porte son motif et sa date. Cas connus au 2026-09-16 :
   - `XKX` est absent de world-countries (ajout manuel) ;
   - `FSM` a une liste vide ;
   - `CUC` est aboli depuis 2021 ;
   - `KID` et `TVD` ne sont pas des codes ISO 4217 ;
   - la liste de `ZWE` (9 monnaies) est à revoir.
   Invariant : liste non vide, et chaque code appartient à
   `Intl.supportedValuesOf("currency")`. Affichage via
   `Intl.DisplayNames(locale, { type: "currency" })`, avec repli sur le code.
2. `demonyms` : `world-countries` `demonyms.fra` et `demonyms.eng` (`m` et `f`),
   plus `XKX` à la main. Affichage FR « Français, Française » (une seule forme
   si m = f), EN « French ».
3. `sovereigntyDate` : le champ `date` de `scripts/countries/data/sovereignty.ts`
   (186 dates sur 193 entrées), `null` sinon ; rejoint `DATASET_DERIVED_KEYS`.
   Affichage en date complète localisée (UTC), ou en année à défaut.
4. Fiche : ajouter Monnaie et Gentilé dans « Repères », et la date complète dans
   « Souveraineté ».

**Dossier de gate** : les corrections de monnaie, un échantillon de 20 fiches
(valeurs rendues), et les codes sans nom `Intl`.

### Lot 5 — Point culminant (CIA World Factbook et libellés Wikidata)

1. `scripts/countries/harvest/highestPoints.ts` lit le miroir `factbook.json`,
   **au même commit** que `sovereignty.ts` (`8662a8b17a784841ab4528631b04090eb2f183eb`).
   Si ce commit est indisponible, prendre le plus récent et le consigner. Le
   script parse le champ *Elevation › highest point* (« Mont Blanc 4,810 m »)
   en nom source et altitude, puis récolte les libellés fr/en Wikidata par
   correspondance (point culminant `P610` du pays, sinon recherche par nom),
   avec des overrides motivés. Il écrit `scripts/countries/data/highestPoints.ts`.
2. **Le périmètre territorial prime** (`SOURCES.md`) : un point culminant situé
   hors du territoire pleinement intégré est remplacé par celui du territoire
   intégré, avec source et motif. À revoir en priorité : le Danemark (le
   Groenland est exclu), l'Australie (l'île Heard est exclue), et tout pays à
   dépendances non intégrées. En sens inverse, un territoire intégré compte
   (Saba pour les Pays-Bas).
3. `highestPoint` rejoint `DATASET_DERIVED_KEYS`, avec pour invariant une
   altitude comprise entre 0 (exclu) et 8 849 m.
4. **Cohérence 5 000 m** : `elevationM >= 5000` doit concorder avec
   `physicalFeatures` ∋ `peak_over_5000m`. Un écart **arrête le lot** (la liste
   de `physical_peak_over_5000m` ne change pas en P4) et remonte au gate. Les
   écarts acceptés sont inscrits dans une liste motivée vérifiée par
   `check:content`.
5. Fiche : la ligne « Point culminant : Mont Blanc (4 810 m) » **remplace** la
   ligne « Sommet de plus de 5 000 m ».

**Dossier de gate** : le tableau des 197 points culminants (noms fr/en, altitude,
source), les corrections de périmètre, et le résultat de la cohérence 5 000 m.

### Lot 6 — PIB par habitant et espérance de vie (Banque mondiale)

1. `scripts/countries/harvest/worldBankIndicators.ts` interroge l'API WDI
   (`api.worldbank.org/v2/country/all/indicator/<code>?format=json&per_page=20000&date=<fenêtre>`)
   pour `NY.GDP.PCAP.CD` (PIB par habitant en dollars US courants) et
   `SP.DYN.LE00.IN` (espérance de vie à la naissance).
   - Pour chaque pays, garder l'année non nulle **la plus récente** dans une
     fenêtre de 5 ans avant la récolte. Au-delà, la valeur vaut `null` et le
     pays est listé au gate.
   - Ne conserver que les ISO3 du catalogue : la WDI publie aussi des agrégats
     régionaux à écarter. Taïwan est absent de la WDI et vaut `null`.
2. `gdpPerCapitaUsd` et `lifeExpectancyYears` rejoignent `DATASET_DERIVED_KEYS`.
   Invariants : valeur > 0, et espérance de vie entre 30 et 95 ans.
3. `SOURCES.world_bank_wdi.vintage` porte la plage d'années effectivement
   retenue (par exemple « 2021–2024 »), calculée à la récolte.
4. Fiche : dans « Société et économie », « 46 150 $ US (2024) » et
   « 83,3 ans (2023) ».

**Dossier de gate** : la couverture (liste des `null`), les exclusions pour
ancienneté, et un échantillon.

### Lot 7 — Indice de développement humain (PNUD)

1. `scripts/countries/harvest/humanDevelopmentIndex.ts` part de l'**édition la
   plus récente publiée** du *Human Development Report*, fichier « composite
   indices time series » du data center PNUD. Il en retient la dernière année
   de l'édition, et consigne l'édition et l'URL exacte.
2. Vérifier la correspondance des codes PNUD avec les ISO3 du catalogue (cas du
   Kosovo) ; un pays non couvert vaut `null`.
3. `humanDevelopmentIndex` rejoint `DATASET_DERIVED_KEYS`, avec une valeur
   comprise entre 0 et 1.
4. Fiche : « 0,920 · très élevé (2023) », suivi d'une légende d'une ligne
   (« santé, éducation et revenu, de 0 à 1 »). La catégorie (très élevé, élevé,
   moyen, faible) se **calcule à l'affichage** avec les seuils publiés dans les
   notes techniques de l'édition retenue, à citer en commentaire.

**Dossier de gate** : la couverture, les seuils retenus et leur source, et un
échantillon.

## 4. Procédure commune par lot

1. **Départ** : arbre propre, `develop` à jour, branche locale `p4-lot<N>`.
   **Ne jamais pousser** : chaque branche poussée crée un environnement Vercel
   preview et un backend Convex.
2. **Implémentation** selon la fiche du lot.
3. **Regen** (lots 3 à 7) :
   - récolte si nécessaire, puis `pnpm build:countries` (réseau, ~2 à 18 min) ;
   - **immédiatement ensuite** `pnpm exec biome check --write content/`, sans
     quoi le diff compte ~1 800 lignes de bruit ;
   - lire le diff.
   **Invariant P4 : aucun `answers.ts` ne change.** Si le rafraîchissement de la
   population ou de la popularité fait bouger une liste, **s'arrêter**, isoler
   ce changement et le signaler : il ne fait pas partie du lot.
4. **Gardes** : `pnpm lint`, `pnpm test`, `pnpm check:content`,
   `pnpm check:design-system`, `pnpm check:bundle` (consigner le chargement
   initial et le chunk de fiche).
5. **e2e** : `pnpm check:e2e-convex-url`, puis `pnpm test:e2e`. Ils demandent une
   grille du jour sur le backend de `.env.local`. Ne **jamais** lancer `wipe`,
   `seed`, `dump` ni `refreshPool`. Si les e2e ne peuvent pas tourner, le dire
   avec la raison : ils tourneront en CI au push de `develop`.
6. **Vérification visuelle** : lancer l'app et capturer les surfaces modifiées
   en 375 px et en desktop pour le dossier de gate.
7. **Docs** listées dans le lot.
8. **Commits** :
   - découpés par sujet, en français, préfixés `[FEAT]`, `[CONTENT]`,
     `[CHORE]`, `[DOCS]`… ;
   - **signés GPG**, avec repli `--no-gpg-sign` en cas d'erreur pinentry
     `ioctl` ;
   - **aucune** ligne `Co-Authored-By` ni mention d'IA.
9. **Journal** : compléter la section du lot en §6.
10. **GATE** : présenter le dossier et **s'arrêter**.
11. **Après feu vert** :
    - appliquer les décisions de l'utilisateur ;
    - merger dans `develop` en local, puis supprimer la branche ;
    - ne pas pousser, l'utilisateur s'en charge.
    P4 ne modifiant aucune liste, aucun `refreshPool` n'est requis. Si une liste
    a changé malgré tout avec l'accord de l'utilisateur, le noter : il faudra
    un `refreshPool` en production après publication.

## 5. Pièges connus

- **Garde du bundle** : exactement 3 entrées dynamiques aujourd'hui. L'`import()`
  de la fiche la fait échouer tant que `LAZY_FEATURE_MODULES` n'existe pas
  (§2.4). Ne jamais contourner en important statiquement les faits.
- **Seam `content/`** : `sources.ts`, `abouts.ts`, les `about.ts` et
  `factProvenance.ts` n'importent que des modules internes, en chemins
  relatifs. Les imports **vers** `content/` restent relatifs, jamais `@/`.
- **Convex** : ne rien ajouter dans `content/constraints/index.ts` qui ne serve
  au serveur (§2.2).
- **Spoiler** : aucun composant de fiche ni de Drawer de case n'est atteignable
  depuis `GameGrid` ou `GuessModal`, et les clarifications restent sans pays
  (garde du lot 1).
- **Rareté** : une seule base (`filledCellShare`), sans quoi un pays affiche des
  tiers différents dans la case, le Drawer et le jeu (§3, lot 2, point 1).
- **Design system** :
  - un en-tête ou une case cliquable est un `<Button>` (la garde refuse
    `<button>` hors `Cell.tsx` et `ResultScreen.tsx`) ;
  - le glassmorphism n'est autorisé que si `bg-white/80` et `backdrop-blur-md`
    sont **sur la même ligne** ;
  - `shadow-editorial` uniquement, `rounded-xl` côté joueur ;
  - `Eyebrow` s'importe, il ne se recopie pas.
- **`null` ≠ 0** :
  - `urbanCentresOver1M: 0` et `borders: []` sont de vraies valeurs, affichées
    « Aucune » et « Aucun » ;
  - `formerSovereigns` ne suit que **9** puissances : la ligne n'apparaît que si
    elle est non vide, et n'affirme jamais « aucune ».
- **Souveraineté affichée** : certaines valeurs justes pour une dérivation se
  lisent mal sur une fiche. Le dataset classe `FRA` (1789), `GBR` (1284) et
  `DEU` (1871) en `independence` sans ancienne puissance, et la source de trois
  pays dit « no official date of independence ». Proposer au gate une règle
  d'affichage par `sovereigntyKind` et pour ces cas. Si une correction de
  **donnée** s'impose, elle passe par `sovereignty.ts` et
  `validateSovereigntySources`, la liste de `history_sovereignty_since_1990`
  restant inchangée. `facts.ts` ne s'édite **jamais** à la main.
- **Dérive de `world-countries` 5.1.0** : `XKX` est absent, `FSM` n'a aucune
  monnaie, `CUC` est aboli, `KID` et `TVD` sont hors ISO 4217 (lot 4).
- **`Intl`** : `DisplayNames` peut renvoyer le code brut pour une langue ISO
  639-3 ou une monnaie récente, et l'ICU de Node diffère de celle des
  navigateurs. Les formateurs se replient proprement, et les tests
  n'exigent pas de libellé `Intl` précis pour ces cas.
- **Wikidata** : `User-Agent` obligatoire, limites de débit, libellés fr
  parfois absents. Une récolte ne modifie **jamais** une liste de capitales ni
  un point culminant retenu : elle ne fait que traduire.
- **Périmètre territorial** : il s'applique aux points culminants comme aux
  volcans (lot 5).
- **i18n** : toute nouvelle clé existe en `fr.ts` et `en.ts`, et les tables
  `Record<Enum, TKey>` rendent l'oubli bloquant.
- **Tests** : logique pure et e2e de parcours, pas de tests visuels de
  composants (`AGENTS.md` §9).
- **Changelog** : se limiter à une proposition au gate. Si l'utilisateur la
  valide, mettre à jour `LATEST_CHANGELOG_UPDATE_DATE` (badge « nouveau » de 7
  jours) et son test.
- **Interdits opérationnels** : ne toucher ni aux données prod ni à
  `preview/develop`, ne lancer ni `refreshPool`, ni `dump`, ni `wipe`, ni
  `seed`, et ne rien pousser.

## 6. Rapport et journal d'exécution

Chaque lot ajoute une section au format ci-dessous. Le rapport final remis à
l'utilisateur reprend ces sections, puis liste les points ouverts et les étapes
de publication recommandées (PR `develop` → `main`, entrées changelog).

```
### Lot N — <titre> (branche p4-lotN, <dates>)
- Ligne de base / après : tests X → Y · chargement initial A → B KiB · chunk fiche C KiB
- Commits : <hash> <message> (un par ligne)
- Écarts au plan : <écart> — <motif>
- Gardes : lint · test · check:content (sortie) · check:design-system · check:bundle · e2e (passés / non lancés + raison)
- Dossier de gate : <résumé, captures>
- Décisions utilisateur : …
- Merge : <date> <hash>
- Points ouverts : …
```

<!-- Journal : les sections de lot s'ajoutent sous cette ligne. -->

### Lot 1 — Sources des contraintes et toast (branche p4-lot1, 2026-09-16)

- Ligne de base / après : tests 553 → 572 · chargement initial 246,4 → 252,2 KiB gzip (+5,8, sous le plafond de 8) · chunk fiche : sans objet (lot 2)
- Commits :
  - `62ab7f8` [CONTENT] Registre des sources et à-propos des 89 contraintes
  - `61b0a88` [CHORE] Garde des sources de contraintes dans check:content
  - `8ba1d94` [FEAT] Toast de source d'une contrainte
  - `6afd7bf` [TEST] e2e du toast de source de contrainte
  - `4092173` [DOCS] Documenter les sources des contraintes et le toast
- Écarts au plan :
  - Bug découvert et corrigé en cours de lot, hors plan : `buttonVariants` impose `whitespace-nowrap`, ce qui cassait le retour à la ligne des libellés d'en-tête une fois convertis en `<Button>` (texte débordant sur plusieurs colonnes). `ConstraintHeaderButton` ajoute `whitespace-normal` pour restaurer le rendu d'origine — repéré à la vérification visuelle, pas par les tests automatisés (jsdom ne rend pas la mise en page).
  - Deux scénarios e2e au lieu d'un seul (le second couvre le tap-pour-fermer sur un en-tête de ligne, en plus du tap-pour-ouvrir sur un en-tête de colonne) — couverture supplémentaire, pas un écart de contrat.
- Gardes : `pnpm lint` OK (2 avertissements pré-existants et sans rapport, `convex/gameWrites.test.ts` / `convex/__tests__/gameWriteValidation.test.ts`, imports inutilisés datés du 2026-08-11, avant ce lot) · `pnpm test` OK (572/572) · `pnpm check:content` OK (77/12/8/197) · `pnpm check:design-system` OK (14 règles) · `pnpm check:bundle` OK (+5,8 KiB) · `pnpm test:e2e` OK (133/133, backend dev perso — deux passes complètes, avant et après le correctif `whitespace-normal`)
- Dossier de gate : voir le message remis avec ce lot (captures desktop/mobile du toast — avec et sans clarification, contrainte de convention et contrainte source —, tableau des 89 `about.ts`, registre des sources).
- Décisions utilisateur : en attente.
- Merge : en attente.
- Points ouverts (avant corrections — voir addendum ci-dessous) :
  - Deux citations de source anticipent une donnée que le pipeline ne lit pas encore littéralement aujourd'hui : `physical_peak_over_5000m` (`cia_factbook_elevation`) et `society_capital_not_largest` (`cia_factbook_capital`) sont la référence générale la plus défendable pour une revue éditoriale sans dataset dédié, et la première anticipe le choix du lot 5 — mais ce sont des choix éditoriaux à valider, pas des sources automatiquement vérifiées par le pipeline actuel.
  - `content/sources.ts` et les 89 `about.ts` sont un premier jet de curation (citations, millésimes, `basis`, clarifications) : à relire en détail avant merge, notamment la cohérence des choix `source` vs `convention` sur les familles `borders_*`, `ocean_*`/`physical_*` et `language_*`.

#### Lot 1 — Corrections post-gate (branche p4-lot1, 2026-09-16)

Corrections apportées suite à `scripts/dev/p4-lot1-corrections.md` (dossier de
retour remis par l'utilisateur après la première présentation du gate).

- Ligne de base / après : tests 572 → 577 · chargement initial 252,2 → 252,3 KiB gzip (inchangé, sous le plafond de 8 au-dessus du 246,4 du tout début) · chunk fiche : sans objet (lot 2)
- Commits :
  - `2adc94a` [FIX] Minuteur du toast de source régressait après pause + fermeture
  - `a6ab9a8` [CONTENT] Convention sans source + corrections de curation (gate lot 1)
  - `49fddbc` [FEAT] Toast : préfixe Source(s), rendu du cas sans source
- Décisions utilisateur consignées :
  1. Une convention peut n'avoir aucune source externe (reporté au plan §1.1, §2.2, §2.3).
  2. Clarifications des continents et de l'hémisphère sud ajoutées ; monarchie et Moyen-Orient reformulées (§3 du dossier de corrections).
  3. Changelog : aucune entrée pour le lot 1 ; entrée commune proposée à la publication des fiches (lot 3 au plus tôt) — reporté au plan §1.3.
- Corrections bloquantes appliquées :
  - **A. Bug du minuteur** (confirmé par un test qui reproduisait exactement le scénario du gate) : `pausedRef` n'était jamais réarmé par une fermeture explicite après une pause. `onHeaderClick()`/`close()` le remettent à `false`. 4 tests du hook avec minuteurs factices.
  - **B. Sources inventées retirées** : `ConstraintAbout` est une union discriminée (`basis: "source"` exige ≥ 1 source, `"convention"` peut en avoir zéro) ; `physical_peak_over_5000m`, `society_capital_not_largest`, `subregion_middle_east` passent à `sources: []` ; `cia_factbook_elevation` et `cia_factbook_capital` retirés de `content/sources.ts`. Le toast n'affiche plus de préfixe « Source(s) » ni de liste quand `sources.length === 0`.
  - **C. Contenu** : `society_drives_on_left` → `basis: "source"` ; `language_multilingual` → clarification `null` ; `iho_s23.vintage` → `null` ; `iana_tz.vintage` → « au 15 janvier 2026 » (`referenceDate` du dataset).
- Mineurs appliqués : préfixe « Source : »/« Sources : » (i18n fr/en) ; clé React sur `source.id` plutôt que l'URL (les deux entrées EIA la partagent) ; `howToPlay.sourcesHint` déplacé avant la case « Ne plus afficher » ; duplication `GamePage`/`TrainingPage` supprimée (`useConstraintSourceToast({ gridDate, mode, selectedCell })` porte l'event PostHog et la fermeture à l'ouverture de la saisie, les pages ne câblent plus que `onHeaderClick`).
- Gardes : `pnpm lint` OK (mêmes 2 avertissements pré-existants et sans rapport) · `pnpm test` OK (577/577) · `pnpm check:content` OK (77/12/8/197, 20 sources toutes référencées) · `pnpm check:design-system` OK (14 règles) · `pnpm check:bundle` OK · `pnpm test:e2e` OK (133/133, backend dev perso, suite complète)
- Vérification manuelle (sur la grille du jour, `physical_peak_over_5000m` y figurant justement) : toast d'une convention sans source (« Has a peak over 5,000 m » → « Geodoku classification » seul, sans préfixe ni lien) ; toast avec préfixe (« More populous than Germany (83M) » → « Source : REST Countries ») ; scénario de régression rejoué en direct dans le navigateur — survol, fermeture par la croix, tap sur un autre en-tête, 7 s d'attente sans interaction : fermeture seule confirmée, plus de blocage.
- Points ouverts restants : le reste de la curation `content/sources.ts`/`about.ts` (cohérence `source` vs `convention` sur `borders_*`/`ocean_*`/`physical_*`/`language_*`) n'a pas été retouché dans cette manche — non demandé, à revoir séparément si besoin.
- Merge : en attente (nouveau feu vert requis).

#### Lot 1 — Feu vert conditionnel (branche p4-lot1, 2026-09-16)

- Décision utilisateur : feu vert pour le lot 1, **sous réserve** d'un dernier
  correctif ; la curation `source`/`convention` des familles frontières,
  océans, côtes et langues (dernier point ouvert ci-dessus) est **validée
  telle quelle** — point clos, rien à y revoir.
- Correctif : dans `useConstraintSourceToast.onHeaderClick`, l'event PostHog
  `constraint_source_viewed` ne devait s'émettre que lorsque le clic **ouvre**
  un toast, jamais quand il le ferme (tap sur l'en-tête déjà affiché) — sinon
  une fermeture se comptait à tort comme une consultation. La capture est
  déplacée après la sortie anticipée du cas « même en-tête → fermeture ».
- Gardes : `pnpm lint` OK (mêmes 2 avertissements pré-existants et sans
  rapport) · `pnpm test` OK (577/577).
- Merge : local dans `develop`, branche `p4-lot1` supprimée après merge, pas de
  push (l'utilisateur s'en charge). P4 ne modifie aucune liste `answers.ts` :
  aucun `refreshPool` requis.
