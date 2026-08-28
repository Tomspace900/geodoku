---
constraint_id: ocean_atlantic
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# ocean_atlantic

## Définition

Pays disposant d'une façade sur l'océan Atlantique.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `atlantic_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La Méditerranée et la mer des Caraïbes sont rattachées à l'Atlantique par la convention Geodoku.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
