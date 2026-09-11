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

Revue 2026-09-11 — la liste appliquait la définition beaucoup plus restrictivement que son libellé : l'Amérique centrale et la Mélanésie manquaient en bloc alors que Costa Rica et Panama y figuraient. **28 ajouts** : Amérique centrale et Caraïbes (BLZ, GTM, HND, NIC, MEX, DMA, JAM, TTO, LCA, VCT, GRD, KNA), Afrique (CAF, GIN, SLE, GNB, UGA, TZA, RWA, BDI, STP), Océanie (FJI, VUT, SLB, WSM, PLW, FSM) et **FRA** (Guyane, cohérent avec le périmètre territorial).

**Puis resserrée aux masses continentales.** Les quatorze petites îles d'abord
ajoutées (DMA, GRD, JAM, KNA, LCA, TTO, VCT, STP, FJI, FSM, PLW, SLB, VUT, WSM) sont
retirées : elles portent bien une forêt humide, mais « Sainte-Lucie » ou « Palaos »
ne sont pas ce qu'un joueur cherche derrière « forêt tropicale », et elles diluaient
la contrainte sans rien lui apprendre. Les grandes îles forestières restent
(Madagascar, Bornéo via BRN et MYS, Philippines, Indonésie, Sri Lanka,
Papouasie-Nouvelle-Guinée). **34 → 48 pays (24 %).**

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
