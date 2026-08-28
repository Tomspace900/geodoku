---
constraint_id: physical_peak_over_5000m
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# physical_peak_over_5000m

## Définition

Pays comptant un sommet de plus de 5 000 mètres.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Liste établie par revue éditoriale des sommets nationaux.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `peak_over_5000m`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le sommet doit se trouver sur le territoire jouable ; un point culminant situé sur une dépendance ultramarine ne compte pas.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
