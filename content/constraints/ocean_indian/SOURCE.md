---
constraint_id: ocean_indian
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# ocean_indian

## Définition

Pays disposant d'une façade sur l'océan Indien.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `indian_ocean_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La limite avec l'Atlantique passe au cap des Aiguilles. **La mer Rouge et le golfe
Persique ne sont pas l'océan Indien** : ce sont des mers fermées, et une mer n'est
pas un océan (cf. [SOURCES.md](../SOURCES.md#océans)). Un pays n'entre dans la liste
que par un débouché réellement océanique — mer d'Arabie, golfe d'Oman, golfe d'Aden.

## Révision

Revue 2026-09-11 — application de la règle « une mer fermée n'est pas un océan ».
Dix pays sortent : **ISR** (Eilat), **JOR** (Aqaba), **EGY**, **SDN**, **ERI**
(mer Rouge seule), **SAU** (mer Rouge + golfe Persique), **IRQ**, **KWT**, **QAT**,
**BHR** (golfe Persique seul). 33 → 25 pays.

Restent les pays à débouché océanique réel : **OMN** et **IRN** (golfe d'Oman,
ouvert sur la mer d'Arabie), **ARE** (Fujairah, côte est sur le golfe d'Oman),
**YEM** (mer d'Arabie), **DJI** (golfe d'Aden).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
