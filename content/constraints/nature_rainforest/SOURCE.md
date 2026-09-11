---
constraint_id: nature_rainforest
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
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

Revue 2026-09-11 — la liste appliquait la définition beaucoup plus restrictivement que son libellé : l'Amérique centrale et la Mélanésie manquaient en bloc alors que Costa Rica et Panama y figuraient. **28 ajouts** : Amérique centrale et Caraïbes (BLZ, GTM, HND, NIC, MEX, DMA, JAM, TTO, LCA, VCT, GRD, KNA), Afrique (CAF, GIN, SLE, GNB, UGA, TZA, RWA, BDI, STP), Océanie (FJI, VUT, SLB, WSM, PLW, FSM) et **FRA** (Guyane, cohérent avec le périmètre territorial). 34 → 62 pays.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
