---
constraint_id: physical_mediterranean_coast
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# physical_mediterranean_coast

## Définition

Pays disposant d'une façade sur la mer Méditerranée.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `mediterranean_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La mer Égée et l'Adriatique sont méditerranéennes ; la mer Noire ne l'est pas.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
