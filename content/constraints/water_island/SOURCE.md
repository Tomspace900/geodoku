---
constraint_id: water_island
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# water_island

## Définition

Pays insulaires : le territoire principal est entouré d'eau et ne partage aucune frontière terrestre jouable.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (enclavement et frontières officielles).
- Liste établie depuis `landlocked` et le décompte de frontières de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `waterAccess` == `island`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Deux arbitrages Geodoku, pas des données sources : l'Australie est jouée comme **continentale**, le Sri Lanka comme **insulaire** malgré la frontière listée en amont.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
