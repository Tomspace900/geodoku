---
constraint_id: subregion_southeast_asia
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# subregion_southeast_asia

## Définition

Pays de la sous-région Asie du Sud-Est.

## Sources

- Référence de révision : [nomenclature ONU M49](../SOURCES.md#géographie-administrative-et-quantitative).
- Liste établie depuis le champ `subregion` de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `subregion` == `South-Eastern Asia`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le périmètre suit M49 et non l'ASEAN : le Timor oriental y figure indépendamment de son adhésion.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
