---
constraint_id: ocean_atlantic
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# ocean_atlantic

## Définition

Pays disposant d'une façade sur l'océan Atlantique.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `atlantic_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La Méditerranée et la mer des Caraïbes sont rattachées à l'Atlantique par la convention Geodoku.

## Révision

Revue 2026-09-11 — la convention « mer des Caraïbes repliée sur l'Atlantique » (cf. `oceanBasinCount`) n'était pas appliquée à cette liste. Règle retenue : **un pays continental dont la seule façade est caraïbe n'a pas de façade atlantique** (BLZ, GTM, HND, NIC, PAN, CRI, COL restent exclus) ; **une île des Caraïbes a les deux façades**, sa côte est donnant sur l'Atlantique ouvert. 12 ajouts : ATG, BRB, CUB, DMA, DOM, GRD, HTI, JAM, KNA, LCA, TTO, VCT. MEX et VEN conservent leur façade atlantique propre (golfe du Mexique, littoral à l'est du delta de l'Orénoque).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
