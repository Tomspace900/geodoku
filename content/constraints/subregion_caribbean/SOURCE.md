---
constraint_id: subregion_caribbean
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# subregion_caribbean

## Définition

Pays de la sous-région Caraïbes.

## Sources

- Référence de révision : [nomenclature ONU M49](../SOURCES.md#géographie-administrative-et-quantitative).
- Liste établie depuis le champ `subregion` de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `subregion` == `Caribbean`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les États insulaires seuls sont retenus : un pays continental à façade caraïbe relève de `physical_caribbean_coast`. Les territoires et dépendances non jouables n'entrent jamais dans la liste, même quand la source les distingue.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
