---
constraint_id: nature_desert
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# nature_desert

## Définition

Pays dont le territoire comprend un désert notable.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Liste établie par revue éditoriale des biomes nommés.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `has_desert`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Une approximation cohérente et lisible par les joueurs prime sur la taxonomie climatique : les zones semi-arides sont tranchées au cas par cas.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
