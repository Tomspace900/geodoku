---
constraint_id: borders_solo
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# borders_solo

## Définition

Pays n'ayant qu'un seul voisin terrestre.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (frontières officielles).
- Liste établie depuis le champ `borders` de world-countries, corrigé par `scripts/countries/countryPatches.ts`.

## Dérivation

`content/constraints/derivations.ts` : `borders.length` == 1. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le décompte ne retient que les voisins **jouables** : une dépendance frontalière ne compte pas, le Kosovo si.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
