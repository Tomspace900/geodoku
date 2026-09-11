---
constraint_id: society_capital_not_largest
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
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

Revue 2026-09-11 — trois oublis rattrapés : **GMB** (Banjul ≈ 31 000 hab. contre Serekunda ≈ 340 000), **GNQ** (Malabo capitale, Bata plus peuplée) et **SWZ** (Mbabane capitale administrative, Manzini plus peuplée).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
