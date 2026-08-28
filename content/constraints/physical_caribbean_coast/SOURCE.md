---
constraint_id: physical_caribbean_coast
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# physical_caribbean_coast

## Définition

Pays disposant d'une façade sur la mer des Caraïbes.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `caribbean_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les États continentaux d'Amérique centrale et du Sud y figurent au même titre que les îles ; le golfe du Mexique n'est pas la mer des Caraïbes.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
