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

**Ni la Méditerranée ni la mer des Caraïbes ne valent façade atlantique** : une mer
fermée n'est pas un océan (cf. [SOURCES.md](../SOURCES.md#océans)). Les îles des
Petites Antilles sont dans la liste par leur **côte est**, qui donne sur l'Atlantique
ouvert — pas par leur côte caraïbe ; les pays continentaux à seule façade caraïbe
(BLZ, GTM, HND, NIC, PAN, CRI, COL) restent dehors. Le golfe du Mexique est en
revanche conservé comme façade atlantique pour **MEX** : il communique largement
avec l'océan par le détroit de Floride et le canal du Yucatán, et « le Mexique n'est
pas bordé par l'Atlantique » ne se défend pas.

## Révision

Revue 2026-09-11 — la convention « mer des Caraïbes repliée sur l'Atlantique » (cf. `oceanBasinCount`) n'était pas appliquée à cette liste. Règle retenue : **un pays continental dont la seule façade est caraïbe n'a pas de façade atlantique** (BLZ, GTM, HND, NIC, PAN, CRI, COL restent exclus) ; **une île des Caraïbes a les deux façades**, sa côte est donnant sur l'Atlantique ouvert. 12 ajouts : ATG, BRB, CUB, DMA, DOM, GRD, HTI, JAM, KNA, LCA, TTO, VCT. MEX et VEN conservent leur façade atlantique propre (golfe du Mexique, littoral à l'est du delta de l'Orénoque).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
