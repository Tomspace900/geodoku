---
constraint_id: subregion_middle_east
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# subregion_middle_east

## Définition

Pays du Moyen-Orient au sens perçu par les joueurs.

## Sources

- Référence de révision : [nomenclature ONU M49](../SOURCES.md#géographie-administrative-et-quantitative) pour le cadre, puis arbitrage Geodoku.
- Liste établie par compilation éditoriale explicite.

## Dérivation

`content/constraints/derivations.ts` : `geoTags` contient `middle_east` (tag curé — la sous-région ONU ne suffit pas). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le Moyen-Orient perçu **ne coïncide pas** avec la sous-région ONU « Western Asia » : l'Égypte y figure, le Caucase non. Cette liste encode la perception, pas la nomenclature.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
