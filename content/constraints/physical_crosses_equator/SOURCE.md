---
constraint_id: physical_crosses_equator
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# physical_crosses_equator

## Définition

Pays traversés par l'équateur.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief) (Natural Earth).
- Liste établie par revue cartographique du tracé.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `equator_crosser`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le critère porte sur le **territoire**, pas sur le centre : un pays dont l'équateur ne coupe qu'une pointe y figure.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
