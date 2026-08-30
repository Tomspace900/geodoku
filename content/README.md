# Contenu Geodoku

Ce dossier porte les décisions éditoriales versionnées du jeu. Le graphe de
dépendances est unidirectionnel : le runtime et les scripts lisent `content/` ;
le contenu n'importe jamais une feature React, un module Convex ou `src/`. Les
imports **vers** `content/` sont toujours **relatifs** (`../../content/…`),
jamais l'alias `@/`.

```
ENTRÉES DE CURATION (éditées à la main)
  scripts/countries/countryPatches.ts    # corrections, alias, classifications
  scripts/countries/flagData.json        # table de vérité drapeaux
  scripts/countries/data/*.ts            # datasets de faits quantitatifs datés
        │  pnpm build:countries  (réseau — world-countries + REST Countries + Wikimedia)
        ▼
SNAPSHOT (content/countries/ — généré, committé, daté par FACTS_SNAPSHOT.date)
  catalog.ts · countryCodes.ts · facts.ts · popularity.ts
        │  pnpm build:answers  (dérivation PURE, hors-ligne)
        ▼
LISTES DÉRIVÉES (content/constraints/<id>/answers.ts)
  actives générées + 11 archivées figées
        │  imports relatifs
        ▼
RUNTIME + OUTILLAGE   matchesConstraint(id, iso3)
```

## Pays

- `countries/catalog.ts` — catalogue joueur minimal : ISO2/ISO3, noms, alias,
  drapeau. Rien d'autre : le bundle joueur ne charge pas les faits.
- `countries/countryCodes.ts` — les 197 codes jouables, le type `CountryCode` et
  le garde `isCountryCode`.
- `countries/facts.ts` — `FACTS_SNAPSHOT` (date + note) et `COUNTRY_FACTS`, les
  faits gameplay par pays. Consommé hors bundle par les dérivations.
- `countries/popularity.ts` — snapshot Wikipédia daté, pour l'analyse de
  difficulté admin uniquement.

`pnpm build:countries` rafraîchit ces quatre fichiers (et rien d'autre), puis
enchaîne `pnpm build:answers`. Provenance par famille de champs :
[`countries/SOURCE.md`](countries/SOURCE.md).

## Contraintes

Chaque dossier de `constraints/` contient :

- `answers.ts` — la liste ISO3 acceptée par le jeu. Pour les contraintes
  **actives**, fichier **`@generated`** : la vérité est `derivations.ts` appliqué au snapshot
  de faits, `answers.ts` en est la matérialisation, régénérée par
  `pnpm build:answers` et **relue en diff**. Pour les **11 archivées**, liste
  **figée à la main** (pas d'en-tête `@generated`), conservée pour le replay.
  Les contraintes **en réserve** (`RESERVE_CONSTRAINT_IDS`) n'ont **pas** d'`answers.ts` :
  conçues et sourcées mais écartées du jeu, ni générées ni rejouables.
- `SOURCE.md` — définition jouable, dérivation (champ + seuil/pivot) et cas
  limites propres à cette contrainte. Une contrainte en réserve ne garde que ce
  fichier (`status: archived`, section « En réserve »).

Les faits quantitatifs (fuseaux, volcans, relief, forêt, centres urbains) sont
des datasets datés dans `scripts/countries/data/`, fusionnés en scalaires par
`build:countries` — mêmes règles de curation que `countryPatches.ts`.

`constraints/derivations.ts` — un prédicat pur par contrainte active, porté des
prédicats runtime historiques. `constraints/SOURCES.md` porte le principe, la
procédure de révision et les références partagées.

`constraints/index.ts` expose `ConstraintId`, la séparation actif / archivé /
réserve (`CONSTRAINT_IDS` / `ARCHIVED_CONSTRAINT_IDS` / `RESERVE_CONSTRAINT_IDS` —
la réserve reste **hors** de `ConstraintId`, un id de réserve dans une grille
doit échouer bruyamment) et l'accès aux listes. Son registre
`ANSWER_SETS` est typé par `{ [K in ConstraintId]: ConstraintAnswerSet<K> }` :
une liste manquante, en trop ou branchée sur le mauvais dossier ne compile pas.

`pnpm check:content` (job CI `quality`) vérifie la cohérence du dossier **et
rejoue les dérivations** : un `answers.ts` actif qui ne correspond plus au
snapshot fait échouer la CI avec un message actionnable.

Le runtime ne recalcule plus une réponse depuis un objet `Country` :
`matchesConstraint(id, iso3)` teste l'appartenance à la liste versionnée. Une
contrainte déjà publiée est archivée, jamais supprimée — sans quoi les grilles
déjà jouées deviennent illisibles. Procédure complète :
[`constraints/SOURCES.md`](constraints/SOURCES.md#procédure-de-révision).
