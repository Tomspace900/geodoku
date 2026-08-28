---
constraint_id: ocean_pacific
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# ocean_pacific

## Définition

Pays disposant d'une façade sur l'océan Pacifique.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `pacific_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les mers marginales (mer de Chine, mer du Japon, mer de Corail) sont rattachées au Pacifique.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
