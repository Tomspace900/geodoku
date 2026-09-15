---
constraint_id: society_drives_on_left
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# society_drives_on_left

## Définition

Pays où la conduite se fait à gauche.

## Sources

- Référence de révision : codes de la route nationaux.
- Liste établie depuis `cars.driving_side` de REST Countries v5.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `geoTags` contient `drives_on_left` (tag curé, pas le champ `drivingSide`). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le sens retenu est celui du territoire jouable principal, indépendamment des dépendances ultramarines.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
