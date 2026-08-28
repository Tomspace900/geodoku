---
constraint_id: society_capital_not_largest
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# society_capital_not_largest

## Définition

Pays dont la capitale n'est pas la ville la plus peuplée du territoire.

## Sources

- Référence de révision : instituts statistiques nationaux pour les populations urbaines.
- Liste établie par compilation éditoriale, pays par pays.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `geoTags` contient `capital_not_largest` (tag curé). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays à plusieurs capitales est jugé sur sa capitale **politique**. La comparaison porte sur la ville, pas sur son aire urbaine.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
