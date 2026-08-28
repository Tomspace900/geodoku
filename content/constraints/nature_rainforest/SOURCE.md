---
constraint_id: nature_rainforest
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# nature_rainforest

## Définition

Pays dont le territoire comprend une forêt tropicale humide notable.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Liste établie par revue éditoriale des biomes nommés.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `rainforest`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le seuil est la présence d'un massif **nommé et reconnaissable**, pas un pourcentage de couvert forestier.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
