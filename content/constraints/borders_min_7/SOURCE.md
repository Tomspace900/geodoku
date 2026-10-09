---
constraint_id: borders_min_7
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# borders_min_7

## Définition

Pays ayant au moins sept voisins terrestres.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (frontières officielles).
- Liste établie depuis le champ `borders` de world-countries, corrigé par `scripts/countries/countryPatches.ts`.

## Dérivation

`content/constraints/derivations.ts` : `borders.length` >= 7. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le décompte ne retient que les voisins **jouables**. La liste est courte : toute requalification de frontière l'affecte visiblement.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — la dérivation comptait tous les voisins de world-countries, territoires hors catalogue compris, contrairement à la règle ci-dessus. Elle ne compte plus que les voisins jouables (`playableBorderCount`, commun à `borders_solo` / `borders_min_5` / `borders_min_7`). Retrait : **DZA** (7 voisins dont le Sahara occidental, 6 jouables). Seuls DZA, MAR, MRT (Sahara occidental) et CHN (Hong Kong, Macao) ont un voisin hors catalogue ; aucune autre liste ne bouge.
