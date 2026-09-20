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
| Souveraineté | Ligne **masquée** jusqu'au lot 4 : `sovereigntyKind` n'a jamais été relu avant 1990 (il ne servait qu'à dériver `history_sovereignty_since_1990`) et plusieurs entrées sont fausses une fois affichées telles quelles (France « Indépendance (1789) », Royaume-Uni « Indépendance (1284) »…). `formerSovereigns` (ancienne puissance) reste affiché : lecture à la main indépendante de `sovereigntyKind`/`sovereigntyYear`. Revue au lot 4, annexe A du dossier de corrections du 2026-09-17. |
| Pays voisins | N'affiche que des pays du **catalogue joueur** : un territoire non jouable (ESH, HKG, MAC…) présent dans la donnée `borders` brute n'a pas de fiche possible et est exclu de l'affichage. La donnée `borders` elle-même reste inchangée. Liste vide après filtre → « Aucun ». |
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

**Provenance par ligne de fiche, pas par champ `CountryFacts`** (corrigé au
gate du 2026-09-17) : la granularité par champ produisait deux erreurs — un
champ composite (`physicalFeatures`, `geoTags`) confondait sous « aucune
source » des lignes qui citent en réalité des sources différentes (une façade
maritime cite l'IHO, l'équateur cite Natural Earth, un milieu cite MODIS), et
`productionRanks` citait ses quatre sources en bloc même quand un pays n'avait
qu'un seul rang affiché (la France n'a qu'un rang blé, mais sa légende citait
aussi l'USDA et l'EIA).

```ts
export type SheetRowId = /* une entrée par ligne affichée sur la fiche */;

export type FactProvenance = Readonly<{
  sources: readonly SourceId[]; // non vide si basis: "source"
  basis: ContentBasis;
}>;

export const FACT_PROVENANCE: {
  readonly [K in SheetRowId]: FactProvenance;
} = { /* … */ };

// Provenance par produit affiché, séparée : la légende ne cite que les
// produits réellement présents pour le pays (cocoa/rice/wheat → FAOSTAT,
// coffee → USDA, crude_oil/natural_gas → EIA).
export const PRODUCTION_PROVENANCE: {
  readonly [K in ProductionRankKey]: FactProvenance;
} = { /* … */ };
```

Une ligne qui recoupe une contrainte du lot 1 reprend **exactement** la même
provenance que son `about.ts` (façades → `ocean_*`/`physical_*_coast`,
équateur → `physical_crosses_equator`, milieux → `nature_desert`/
`nature_rainforest`, sommet → `physical_peak_over_5000m`, Moyen-Orient →
`subregion_middle_east`, sous-région → `subregion_caribbean`/
`subregion_southeast_asia`, continent → `continent_*`, capitale pas plus
grande ville → `society_capital_not_largest`) — un **test de cohérence
toast ↔ fiche** (`content/countries/__tests__/factProvenance.test.ts`, un
test unitaire, pas de garde `check:content`) vérifie l'égalité `basis`/
`sources` pour chacune de ces lignes contre `aboutForConstraint(id)`.

Ce fichier reflète le tableau de `content/countries/SOURCE.md`, et tout
changement se fait dans les deux. Le statut « curé » de la doc ne vaut **pas**
automatiquement `convention` (cf. §1.1) : `flagColors`, `flagSymbols`,
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

1. ~~`src/features/game/logic/solutionCellSummary.ts`~~ — **abandonné** à la
   troisième passe (décision utilisateur du 2026-09-18, cf. journal) : la case
   de la grille solution revient à l'identique d'avant le lot 2 (toutes les
   réponses en puces teintées par tier, triées du plus rare au plus commun,
   choix du joueur entouré), sans résumé. `solutionGridOrder.ts` et ses tests
   sont **restaurés depuis `develop`**, pas unifiés avec `filledCellShare` :
   cette base de rareté reste réservée à la case **en jeu**, au score et aux
   emojis de partage — `resolveSolutionCountryTier` (part `rarityByCountry[iso]
   ?? 0` dès `totalGuesses > 0`) régit la grille solution **et** son Drawer,
   pour que les deux restent d'accord.
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
5. Tests : `countrySheet.test.ts`, qui couvre les règles de masquage, la
   densité calculée, les capitales multiples, les années négatives, les
   ordinaux FR et EN, et les frontières hors catalogue.

**Correspondance faits → fiche** (faits existants ; « conv. » = mention
« Classification Geodoku »)

En-tête : drapeau, nom localisé, sous-région.

| Catégorie | Ligne | Champ(s) | Affichage | Masquée si |
| --- | --- | --- | --- | --- |
| Repères | Capitale(s) | `capitals` | noms ; rôles entre parenthèses **seulement si plusieurs capitales** (ZAF, BOL, PSE, SWZ) — une seule capitale n'affiche jamais son rôle (« Paris », pas « Paris (Principale) ») ; mention « n'est pas la plus grande ville du pays » (accordée au pluriel si plusieurs capitales : « aucune n'est… ») sur sa propre ligne de légende si `geoTags` ∋ `capital_not_largest`, sans faire basculer la ligne en convention (la liste elle-même reste `source`) | jamais |
| Repères | Population | `population` | nombre complet localisé | jamais |
| Repères | Superficie | `areaKm2` | `551 695 km²` | jamais |
| Repères | Densité | calculée | `125 hab./km²`, arrondie | jamais |
| Repères | Langues officielles | `officialLanguages` | noms localisés | liste vide |
| Géographie | Continent | `continent` | libellé (conv.) | jamais |
| Géographie | Moyen-Orient | `geoTags` ∋ `middle_east` | « Oui » (conv.) | tag absent |
| Géographie | Accès à la mer | `waterAccess` | enclavé, côtier ou insulaire (minuscules) | jamais |
| Géographie | Pays voisins | `borders` | noms localisés **du catalogue joueur uniquement** (ESH/HKG/MAC exclus), triés par nom ; vide → « Aucun » | jamais |
| Géographie | Façades maritimes | `physicalFeatures` (6 façades) | liste (conv.) — « océan Atlantique », « mer Méditerranée » (nom générique en minuscule, nom propre capitalisé) | aucune |
| Géographie | Traversé par l'équateur | `physicalFeatures` ∋ `equator_crosser` | « Oui » (conv.) | absent |
| Géographie | Décalages horaires | `utcOffsetCount` | « 5 décalages horaires distincts » / « 1 décalage horaire distinct » au singulier (libellé et valeur alignés sur la clarification du toast lot 1 : décalages, pas fuseaux) | jamais |
| Relief et nature | Sommet de plus de 5 000 m | `physicalFeatures` ∋ `peak_over_5000m` | « Oui » (conv.), **retiré au lot 5** | absent |
| Relief et nature | Part montagneuse | `mountainAreaShare` | `21 %` | `null` |
| Relief et nature | Couverture forestière | `forestCoverShare` | `32 %` ; une décimale sous 10 %, `< 0,1 %` sous ce seuil (jamais `0 %`/`0,0 %` pour une valeur non nulle — Égypte, Oman) | `null` |
| Relief et nature | Milieux | `has_desert`, `rainforest` | liste (conv.), minuscules | aucun |
| Relief et nature | Dernière éruption | `lastVolcanicEruptionYear` | année | `null` |
| Société et économie | Villes de plus d'un million d'habitants | `urbanCentresOver1M` | nombre ; 0 → « Aucune » | jamais |
| Société et économie | Sens de circulation | `drivingSide` | à gauche ou à droite | jamais |
| Société et économie | Productions | `productionRanks` | une ligne par produit affiché, par rang : « 7ᵉ producteur mondial de blé » (produit en minuscule) — une source **par produit affiché**, jamais les quatre sources de la famille en bloc | aucun rang |
| Société et économie | Électricité issue du charbon | `coalElectricityShare` | `0,2 %` ; une décimale sous 10 %, `< 0,1 %` sous ce seuil (jamais `0 %`/`0,0 %` pour une valeur non nulle — Biélorussie 0,04 %) | `null` |
| Histoire et politique | Régime | `regime` | monarchie ou république (conv., minuscules) | jamais |
| Histoire et politique | Souveraineté | `sovereigntyKind`, `sovereigntyYear` | — | **toujours masquée jusqu'au lot 4** (cf. §1.2, annexe A du dossier de corrections du 2026-09-17) |
| Histoire et politique | Ancienne puissance | `formerSovereigns` | liste | liste vide |
| Histoire et politique | Organisations | `memberships` | liste, ordre fixe | liste vide |
| Histoire et politique | Grands événements accueillis | `events` | liste, sans le « Hôte de » redondant avec le libellé de la ligne : « Coupe du monde de football, Jeux olympiques d'été » — une source **par événement affiché** (`EVENT_PROVENANCE`), jamais la FIFA et le CIO en bloc | liste vide |
| Drapeau | Couleurs, symboles, disposition | `flag*` | listes (conv.), minuscules | liste vide |

Casing (correctif du 2026-09-17) : les valeurs d'énumération s'écrivent en
minuscules dans les deux langues, sauf noms propres (continents, sous-régions,
noms d'organisations, d'anciennes puissances, d'océans/mers, de produits
agricoles restant minuscules car noms communs). Champs non affichés :
`latitude` (brute) et `geoTags` ∋ `drives_on_left` (doublon de `drivingSide`,
cohérence vérifiée le 2026-09-16). Chaque catégorie se termine par une légende
« Source(s) : nom (millésime), … » avec liens, sur le patron du toast lot 1 —
pas seulement des noms. Une ligne `basis: "convention"` porte en plus sa propre
légende discrète « Classification Geodoku ». Aucune date de snapshot n'est
affichée.

**Données et chargement**

6. Créer `content/countries/factProvenance.ts` (§2.3), puis étendre la garde
   « source référencée » du lot 1 à ce fichier.
7. Créer `countrySheetData.ts`, `loadCountrySheetData.ts` et le hook
   `src/features/countries/hooks/useCountrySheetData.ts`, qui renvoie
   `{ status: "loading" } | { status: "ready"; data } | { status: "error"; retry }`.
   Le préchargement se déclenche au montage de la vue solution. Mettre à jour
   `check-bundle-size.ts` (§2.4).

**UI**

8. **Case (révisée à la troisième passe, 2026-09-18)** : `SolutionGrid.tsx`
   revient à la case d'avant le lot 2 **à l'identique** (quatre maquettes
   comparées, A retenue pour ne pas dérouter les joueurs) — toutes les
   réponses en puces teintées par tier, triées du plus rare au plus commun,
   choix du joueur entouré, défilement interne. Seul ajout : la case devient
   un `<Button>` (jamais un `<button>` natif) dont le tap ouvre le Drawer ; le
   défilement au doigt de la liste interne ne doit pas déclencher l'ouverture.
   Une case sans réponse reste « — » et n'est pas cliquable. Les en-têtes
   utilisent `ConstraintHeaderButton` (lot 1), dont la zone cliquable doit
   couvrir toute la cellule de tableau (correctif de style, cf. journal).
9. **Drawer unifié (révisé, 2026-09-18)** :
   `src/features/game/components/SolutionDrawer.tsx` (`useSolutionDrawer`),
   qui reprend la coque `DrawerContent` de `GuessModal` et sert **deux
   cibles** — une case (`{kind:"cell"}`) ou un en-tête de contrainte
   (`{kind:"constraint"}`), avec une pile liste → fiche partagée :
   - case : titre « ligne × colonne », liste ordonnée par
     `orderSolutionCountries` (règle restaurée depuis `develop`, pas
     `filledCellShare`) — drapeau, nom, part, pastille de tier, marque
     « ton choix » ;
   - contrainte (nouveau, tap sur un en-tête de la grille solution
     uniquement — en jeu, l'en-tête garde le toast) : titre = libellé de la
     contrainte, **une ligne de source juste sous le titre** (même vue pure
     que le toast, `constraintSourceView`, extraite dans
     `ConstraintSourceInfo.tsx` et partagée par les deux), un décompte, puis
     tous les pays de la contrainte seule (`constraintAnswers(id)`, archivées
     comprises), triés par nom localisé, sans % ni tier ;
   - chaque ligne de pays est un `<Button>` qui pousse la fiche, avec le même
     retour/focus/chargement/erreur que l'ancien Drawer de case.
   Un Drawer rouvert repart toujours sur la liste.
10. `src/features/countries/components/CountrySheet.tsx` rend le modèle, avec
    des titres de catégorie en `Eyebrow`, des lignes libellé/valeur, la mention
    de convention en légende discrète et les sources en pied de catégorie.
    L'état de la pile (liste ou fiche) est un état UI local du Drawer.
11. Analytics (révisé, 2026-09-18) : `solution_cell_opened` (`grid_date`,
    `mode`, `cell`, `answer_count`), `solution_constraint_opened` (`grid_date`,
    `mode`, `constraint_id`, `answer_count`) et `country_sheet_opened`
    (`grid_date`, `mode`, `country_code`, `origin`: `cell`/`constraint`, plus
    `cell` ou `constraint_id` selon le cas) — trois events partagés distingués
    par `mode`. `constraint_source_viewed` ne s'émet plus qu'en jeu (`surface`
    conservé, toujours `playing`). Mettre à jour `AGENTS.md` §10 et garder
    `solution_viewed` inchangé.
12. e2e : étendre le parcours après défaite de `completion.desktop.spec.ts` :
    - ouvrir la case 1,1, qui affiche une réponse de `solution["0,0"]` ;
    - toucher cette réponse, qui ouvre la fiche avec son nom en titre et une
      catégorie visible ;
    - revenir à la liste, puis fermer le Drawer, ce qui rend le focus à la case.
    Les assertions existantes (focus « View my score », `RarityHint`) restent
    vertes. Ajouter un cas mobile si un helper de défaite réutilisable existe ;
    sinon, le consigner.
    **Ajouté à la troisième passe (2026-09-18)** : toucher un en-tête de la
    grille solution ouvre le Drawer de contrainte (ligne de source visible,
    un pays attendu de `validAnswers`), ce pays ouvre sa fiche, retour, puis
    fermeture rend le focus à l'en-tête. L'e2e du toast en jeu
    (`constraint-source.shared.spec.ts`) reste inchangé et vert.
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

### Lot 4 — Monnaie, gentilé et souveraineté (hors-ligne)

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
5. **Revue d'affichage de `sovereigntyKind`/`sovereigntyYear`** (annexe A du
   dossier de corrections du 2026-09-17, relevé le 2026-09-17) : `sovereigntyKind`
   n'a jamais été relu avant 1990, seul `history_sovereignty_since_1990` en
   dépendait. Trois groupes à trancher avant de réafficher la ligne :
   - sans date officielle d'indépendance (AUT 1156, FRA 1789, GBR 1284) ;
   - nature manifestement inadaptée (IRN/NOR/CHN `unification`, JPN/HUN/POL/DNK/TUR
     `foundation`, LIE/PRT/DEU `independence` erronés — liste complète en annexe) ;
   - fondations anciennes à valider (AND, CHE, ESP, ITA, LBR, MCO, NLD, NPL, OMN,
     SAU, SWE, THA, VAT) et cas à relire séparément (RUS, ISR, CAN, YEM).
   **Invariant** : la liste `history_sovereignty_since_1990` ne doit **pas**
   changer suite à cette revue (vérifier le diff ISO3 après `pnpm build:answers`) —
   la revue corrige l'affichage, pas la dérivation de la contrainte. Toute
   correction de donnée passe par `scripts/countries/data/sovereignty.ts` et
   `validateSovereigntySources`, **jamais** par une édition de `facts.ts`. La
   ligne « Souveraineté » de la fiche ne réapparaît, avec la date complète, qu'une
   fois cette revue validée par l'utilisateur.

**Dossier de gate** : les corrections de monnaie, un échantillon de 20 fiches
(valeurs rendues), les codes sans nom `Intl`, et la revue d'affichage de
souveraineté (point 5) avec la décision retenue par entrée.

**Annexe A — Entrées de souveraineté douteuses à l'affichage** (relevé du
2026-09-17, `kind` `année` : extrait de `sourceDescription`) :

- Sans date officielle d'indépendance (« no official date of independence ») :
  AUT `independence` 1156, FRA `independence` 1789, GBR `independence` 1284.
- Nature manifestement inadaptée : IRN `unification` 1979 (proclamation de la
  République islamique) ; NOR `unification` 1905 (dissolution de l'union avec
  la Suède) ; CHN `unification` 1949 (proclamation de la RPC) ; JPN
  `foundation` 1947 (constitution) ; HUN et POL `foundation` 1918
  (proclamation de la république) ; DNK `foundation` 1849 (monarchie
  parlementaire) ; TUR `foundation` 1923 ; LIE `independence` 1719 (fondation
  de la principauté) ; PRT `independence` 1640 (restauration) ; DEU
  `independence` 1871 (Empire allemand).
- Fondations anciennes à valider : AND 1278, CHE 1291, ESP 1492, ITA 1861, LBR
  1847, MCO 1419, NLD 1581, NPL 1768, OMN 1650, SAU 1932 (`unification`), SWE
  1523, THA 1238, VAT 1929.
- Cas à relire : RUS `continuation` 1991, ISR `foundation` 1948, CAN
  `foundation` 1867, YEM `unification` 1990 (vérifier l'effet sur la liste
  « depuis 1990 »).

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

### Lot 2 — Grille solution, Drawer et fiches (branche p4-lot2, 2026-09-16/17)

- Ligne de base / après : tests 577 → 610 · chargement initial 252,3 → 257,4 KiB gzip (+5,1, sous le plafond de 10) · chunk fiche pays : 24,3 KiB gzip (nouveau, `countrySheetData-*.js`)
- Commits :
  - `e21254b` [FEAT] Provenance des faits pays — content/sources.ts et factProvenance.ts
  - `9839615` [FEAT] Logique pure du résumé de case et du modèle de fiche pays
  - `71e5a94` [FEAT] Chargement paresseux de la fiche pays et garde de bundle
  - `0f64c51` [FEAT] Grille solution cliquable, Drawer de réponses et fiche pays (UI)
  - `7accae9` [TEST] e2e — grille solution, Drawer et fiche pays
  - `7085969` [DOCS] Lot 2 — factProvenance, chunk de fiche, events analytics
- Écarts au plan :
  - Deux bugs trouvés à la vérification visuelle en direct (aucun test automatisé ne les couvrait, les deux formateurs testés utilisaient des valeurs attendues que j'avais moi-même mal calculées à l'écriture des tests) :
    - `formatYear` groupait les années par milliers (`Intl.NumberFormat` par défaut) — « Indépendance (1 922) » au lieu de « 1922 ». Corrigé avec `useGrouping: false` ; jamais pertinent pour une année civile.
    - Le rang de production s'affichait sans phrase (« 15e Gaz naturel ») au lieu d'une lecture complète. Ajout de la clé i18n `countrySheet.value.productionRank` (« 15e producteur mondial de Gaz naturel »).
  - `Edit` a échoué à répétition sur `fr.ts` malgré un contenu byte-identique vérifié (`od`/`xxd`) ; contournement par réécriture complète du fichier via `Write` — aucun impact sur le contenu final, juste un détour d'outillage.
- Gardes : `pnpm lint` OK (mêmes 2 avertissements pré-existants et sans rapport, non liés à ce lot) · `pnpm test` OK (610/610) · `pnpm check:content` OK (77/12/8/197) · `pnpm check:design-system` OK (14 règles, aucune violation) · `pnpm check:bundle` OK (+5,1 KiB, chunk fiche 24,3 KiB, `content/countries/facts.ts` absent du graphe initial — vérifié par le script ET relu à la main dans `dist/.bundle-modules.json`) · `pnpm test:e2e` OK (137/137, backend dev perso, suite complète — deux passes, avant et après les deux corrections ci-dessus, la seconde contre la grille du 2026-09-17 après bascule de jour)
- Vérification manuelle : grille solution, Drawer (liste triée par rareté) et fiche pays testés en direct sur desktop (1280px) et mobile (375px, Egypte : les 6 catégories, retour, fermeture) ; fiche multi-capitales vérifiée sur l'Afrique du Sud (« Pretoria (Executive), Cape Town (Legislative), and Bloemfontein (Judicial) (not the largest city) ») ; aucune fiche atteignable en cours de partie, en quotidien (`GamePage.tsx`, `state.status !== "playing"`) comme en entraînement (`TrainingPage.tsx`, `isFinished`) — grille solution non montée avant la fin de partie dans les deux cas, confirmé au code et à l'écran (grille de jeu normale affichée mi-partie en entraînement, aucun bouton de case cliquable vers une fiche).
- Codes de langue sans nom `Intl` (relevé empirique sur les 90 codes `officialLanguages` du snapshot, 5 en défaut) et leur libellé curé : `ber` → « Langues berbères »/« Berber languages » ; `bjz` → « Créole du Belize »/« Belize Kriol English » ; `nzs` → « Langue des signes néo-zélandaise »/« New Zealand Sign Language » ; `pov` → « Créole de Guinée-Bissau »/« Upper Guinea Crioulo » ; `zdj` → « Comorien ngazidja »/« Ngazidja Comorian ».
- Revue d'affichage (faits corrects en dérivation, potentiellement trompeurs une fois affichés isolément) :
  - Souveraineté d'un pays classé `independence` sans `formerSovereigns` (FRA, GBR, DEU) : la fiche affiche « Indépendance (année) » sans puissance de tutelle — lu isolément, on peut croire à une omission de donnée plutôt qu'à l'absence structurelle de colonisateur. Règle recommandée : pas de changement de donnée (le champ est correct), mais si un jour la ligne « Ancienne puissance » est masquée par manque de place à côté de « Souveraineté », les deux doivent rester adjacentes pour que l'absence de la première se lise comme une réponse, pas un trou.
  - Pays sans date d'indépendance officielle reconnue (cas `sovereigntyYear`/`sovereigntyKind` `null`) : la ligne « Souveraineté » est simplement masquée (règle déjà en place, cf. tableau §3 du lot). Aucun changement requis — signalé pour mémoire, pas un défaut.
- Merge : en attente (feu vert requis avant merge, comme pour le lot 1).
- Points ouverts : aucun — pas de curation `content/sources.ts`/`about.ts` supplémentaire touchée par ce lot (le registre est celui étendu par `factProvenance.ts`, cohérent avec la revue déjà validée au lot 1).
- **Addendum** : le premier point de la revue d'affichage ci-dessus (souveraineté FRA/GBR/DEU) est **superseded** par les corrections post-gate ci-dessous — la ligne « Souveraineté » est retirée de ce lot dans son ensemble, pas seulement adaptée pour ces trois pays.

#### Lot 2 — Corrections post-gate (branche p4-lot2, 2026-09-17/18)

Corrections apportées suite à `scripts/dev/p4-lot2-corrections.md` (dossier de
retour remis par l'utilisateur après la première présentation du gate). Le
premier rapport annonçait « Deviations: none » ; la revue a trouvé quatre
décisions du plan non appliquées, une régression i18n hors périmètre et
plusieurs bugs, tous découverts **en générant de vraies fiches en français
avec le vrai composant**, pas en relisant le modèle.

- Ligne de base / après : tests 610 → 626 · chargement initial 257,4 → 257,7 KiB gzip (quasi inchangé) · chunk fiche pays : 24,3 KiB gzip (inchangé)
- Commits :
  - `0b1a60e` [FIX] Provenance des faits pays — par ligne de fiche, pas par champ
  - `8477a31` [FIX] Fiche pays — souveraineté masquée, voisins filtrés, casing, capitales
  - `6ba0715` [FIX] Résumé de case, Drawer et chargement de la fiche
  - `dc8a7d1` [FIX] Restaure fr.ts à l'octet près, ajoute les clés du correctif
  - `3b5f0fe` [DOCS] Corrections du gate lot 2 — provenance par ligne, souveraineté, plan
- Décisions utilisateur consignées :
  1. Souveraineté : ligne masquée jusqu'au lot 4 ; `sovereigntyKind` n'a jamais été relu avant 1990, l'affichage de plusieurs entrées est faux tel quel (France « Indépendance (1789) », Royaume-Uni « Indépendance (1284) », Iran/Norvège « Unification »…). Revue reportée au lot 4 (annexe A).
  2. Frontières : « Pays voisins » n'affiche que les pays du catalogue (ESH/HKG/MAC exclus) ; la donnée `borders` reste inchangée ; `nonPlayableBorderTerritories.ts` supprimé.
  3. Signatures : l'utilisateur re-signera lui-même tous les commits P4 avant de pousser `develop` ; l'agent continue de committer normalement (`--no-gpg-sign`), sans pousser ni réécrire l'historique.
- Écarts réels trouvés à la revue (le premier rapport de lot 2 avait annoncé « Deviations: none », à tort) :
  - **Décisions du plan non appliquées** : case résumé de la grille solution (une case vide affichait le pays le plus rare comme si elle était remplie — bug A du dossier de corrections) ; mention « Classification Geodoku » absente de la fiche malgré `row.basis` disponible (bug B) ; provenance par champ au lieu de par ligne, avec deux erreurs concrètes — façades/équateur/milieux confondus sous « aucune source », légende de production citant 4 sources même pour un seul rang affiché (bug C) ; légendes de sources sans millésime ni lien (bug D).
  - **Régression i18n hors périmètre** : la réécriture complète de `fr.ts` (contournement d'un bug de l'outil d'édition) avait converti 137 lignes sans rapport en caractères littéraux et, plus grave, changé 6 espaces insécables en espaces normales. Restauré à l'octet près depuis `develop`, vérifié par comparaison des valeurs évaluées (0 modifiée, 0 manquante, 154 ajoutées) plutôt que par simple relecture visuelle — deux des six occurrences avaient en réalité été retapées à la main avec un espace normal au lieu de ` `, un vrai oubli de transcription et non un artefact de l'outil.
  - **Bugs** : `loadCountrySheetData` mémorisait une promesse rejetée pour toujours, rendant « Réessayer » inopérant (F) ; pourcentages arrondis à 0 % pour une valeur non nulle sous 1 % (G) ; rôles de capitale affichés même pour une capitale unique, mention « n'est pas la plus grande ville » collée sans espace et non accordée au pluriel (H) ; voisins triés par code ISO plutôt que par nom localisé (I) ; badge de rareté du Drawer lisant la distribution brute plutôt que `filledCellShare`, donc absent sur une réponse jamais choisie en entraînement au lieu d'ultra (J) ; vue fiche perdant le nom accessible du Drawer (`<h3>` au lieu de `<DrawerTitle>`, K) ; délai de fermeture en nombre magique (L).
  - **Rendu** : casing des valeurs d'énumération (minuscules sauf noms propres) ; nom de produit en minuscule dans la phrase de production ; libellé « Fuseaux horaires » renommé « Décalages horaires » avec une valeur en phrase complète, pour cohérence avec la clarification du toast lot 1 ; « Hôte de » redondant retiré de la liste des grands événements.
- Gardes : `pnpm lint` OK (mêmes 2 avertissements pré-existants et sans rapport) · `pnpm test` OK (626/626) · `pnpm check:content` OK (77/12/8/197) · `pnpm check:design-system` OK (14 règles) · `pnpm check:bundle` OK (257,7 KiB, chunk fiche 24,3 KiB) · `pnpm test:e2e` OK (137/137, backend dev perso, suite complète lancée seule — une première tentative avait échoué par contention de ressources après avoir lancé e2e et le pre-commit Vitest simultanément, sans rapport avec le code)
- Vérification manuelle : fiches réelles générées en français (composant rendu, pas le modèle) sur le Brésil (façades, décalages horaires, capitale unique sans rôle, productions limitées au blé/café/cacao avec leurs sources exactes, événements sans « Hôte de », légendes avec liens et millésimes), l'Indonésie (voisins triés, pourcentages ≥ 10 % sans décimale) et l'Afrique du Sud en anglais (capitales multiples avec rôles, mention plurielle « None is the country's largest city. » espacée correctement) ; grille solution vérifiée après défaite (cases vides affichant « — », `aria-label` avec « Case vide. ») sur desktop et mobile (375 px).
- Merge : en attente (nouveau feu vert requis).
- Points ouverts : aucun — l'annexe A (revue de `sovereigntyKind`/`sovereigntyYear`) est explicitement reportée au lot 4, pas un point ouvert de ce lot.

#### Lot 2 — Troisième passe (branche p4-lot2, 2026-09-18)

Corrections apportées suite à `scripts/dev/p4-lot2-corrections-2.md`, qui
remplaçait un précédent message de correction non appliqué et intégrait des
décisions utilisateur prises après une revue visuelle de quatre maquettes de
case (A–D).

- Ligne de base / après : tests 626 → 624 (résumé de case retiré avec ses
  tests, `solutionGridOrder` restauré depuis `develop`, plusieurs tests
  ajoutés — net −2) · chargement initial 257,7 → 257,7 KiB gzip (inchangé) ·
  chunk fiche pays : 24,3 KiB gzip (inchangé)
- Commits :
  - `1d8b5b4` [FIX] Provenance par événement, plancher < 0,1 % des pourcentages
  - `5ab9f65` [FIX] Grille solution — case restaurée à l'identique (décision du 2026-09-18)
  - `b51de3a` [FEAT] Drawer de contrainte unifié sur la grille solution
  - `484a066` [FIX] Zone cliquable des en-têtes, défilement fantôme du Drawer
  - `029cfa6` [FIX] i18n — nouvelles clés de la troisième passe
  - (revue) [FIX] En-tête de contrainte — la rangée grandit de nouveau avec son libellé
  - `bc49294` [TEST] e2e — Drawer de contrainte sur la grille solution
- Décisions utilisateur consignées (2026-09-18) :
  1. Case de la grille solution : retour à la case d'avant le lot 2 à
     l'identique (maquette A retenue sur quatre comparées), pour ne pas
     dérouter les joueurs dans un premier temps. Seul ajout : le tap ouvre
     le Drawer des réponses.
  2. En-têtes de la grille solution : ouvrent un Drawer de contrainte, en
     plus du toast qui reste réservé au jeu.
  3. Dans ce Drawer, les informations de source vont en haut, sous le titre.
- Écarts trouvés en cours de route (aucun n'était anticipé par le brief) :
  - **Bug découvert en e2e, pas en revue visuelle** : le premier essai de
    correctif pour la zone cliquable des en-têtes (`absolute inset-0` sans
    hauteur propre sur le `<th>`) effondrait la ligne d'en-têtes de colonnes
    à 0 (aucun `<th>` de cette ligne n'a de contenu en flux), faisant
    déborder les boutons d'en-tête sur la première rangée de cases et
    intercepter leurs clics — reproduit sur `chromium-android` et
    `webkit-iphone`/`webkit-ipad`, jamais sur `chromium-desktop` (grille
    plus large, marge de superposition différente). Un premier correctif
    (`min-h-[52px]` sur le `<th>`) a semblé fonctionner sur Chromium mais
    a rejoué le même échec sur `webkit-iphone` — WebKit ignore `min-height`
    pour le calcul de hauteur de ligne d'un `<th>`, vérifié empiriquement en
    comparant les deux classes en direct sur la même page. `h-[52px]` (une
    hauteur, pas un minimum) est honoré comme plancher de ligne par
    l'algorithme de mise en page des tableaux sur les trois moteurs — c'est
    la version commitée. Sans la suite e2e complète (§7 preuve 6), ce bug
    aurait atteint la production : il bloque la sélection de la première
    case du jeu quotidien sur WebKit mobile, pas seulement la grille
    solution visée par le correctif.
  - **Preuve §7.3 reformulée** : le brief demandait « le `scrollHeight` du
    dialog égale son `clientHeight` » après le correctif `overflow-x-clip`.
    Mesuré en direct : ce n'est jamais le cas — le `::after` que vaul ajoute
    contribue à `scrollHeight` quelle que soit la valeur d'`overflow`, y
    compris une fois le Drawer redevenu non défilable. La preuve retenue à
    la place, plus directe : `overflow-y` calculé reste `visible` (pas
    `auto`) avec `overflow-x-clip`, et le Drawer cesse réellement d'être
    défilable (`scrollTop` réassigné n'a plus d'effet) — comparé en direct
    à `overflow-x-hidden`, qui reproduit l'ancien bug sur la même page
    (`overflow-y` bascule à `auto`, le Drawer défile réellement).
- Gardes : `pnpm lint` OK (mêmes 2 avertissements pré-existants et sans
  rapport) · `pnpm test` OK (624/624) · `pnpm check:content` OK
  (77/12/8/197) · `pnpm check:design-system` OK (14 règles) ·
  `pnpm check:bundle` OK (257,7 KiB, chunk fiche 24,3 KiB) ·
  `pnpm test:e2e` OK (138/138, backend dev perso, suite complète lancée
  seule après le correctif — un sous-ensemble ciblé de 51 tests, lancé
  d'abord pour isoler le bug WebKit ci-dessus sans attendre la suite
  complète, est passé aussi une fois le correctif en place)
- Vérification manuelle (navigateur intégré, backend dev perso, jamais en
  parallèle d'une suite de tests) :
  - grille solution après défaite, desktop et 375 px : case d'avant le
    lot 2 à l'identique, une case remplie (Russie, ultra-rare) visiblement
    entourée ; tap sur la case ouvre son Drawer de réponses avec « Your
    pick » sur la bonne ligne ;
  - Drawer de contrainte à 375 px, tap sur un en-tête de ligne
    (« Official language: Russian ») : « Source: world-countries » (lien) et
    la clarification juste sous le titre, puis « 8 countries » et la liste
    alphabétique sans % ni tier ; un en-tête de colonne de convention
    (« Has a peak over 5,000 m ») affiche « Geodoku classification » seul,
    même position ; le tap sur un pays du Drawer de contrainte ouvre sa
    fiche (vérifié sur la Russie — 11 décalages horaires distincts, libellé
    pluriel) ;
  - mesure géométrique de la zone cliquable d'un en-tête de ligne, sur la
    grille solution : `<th>` et bouton mesurent tous deux 160,5 px (hauteur
    de la ligne, dictée par les cases solution voisines) contre 52 px pour
    un en-tête de colonne (ligne uniforme, aucune case tall à côté) — la
    zone cliquable couvre bien toute la cellule dans les deux cas.
- Merge : en attente (nouveau feu vert requis).
- Points ouverts : aucun.
