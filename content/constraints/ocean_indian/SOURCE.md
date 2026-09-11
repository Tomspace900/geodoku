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

La mer Rouge et le golfe Persique sont rattachés à l'océan Indien ; la limite avec l'Atlantique passe au cap des Aiguilles.

## Révision

Revue 2026-09-11 — **une mer fermée n'est pas un océan.** La mer Rouge et le golfe
Persique ne valent pas façade sur l'Indien : **ISR** (Eilat) et **JOR** (Aqaba) sont
donc exclus, et Israël ne satisfait pas `ocean_multiple_basins`. Une première version
de cette revue les avait ajoutés par cohérence avec l'Égypte et l'Arabie saoudite —
c'était résoudre l'incohérence du mauvais côté.

**Reste ouvert.** La même règle voudrait retirer **EGY, SAU, SDN, ERI, IRQ, KWT, QAT
et BHR**, qui n'ont aussi qu'une façade sur mer fermée. Ils sont conservés pour
l'instant : le repli des mers sur leur bassin est ce qui donne son deuxième océan à
Panama (mer des Caraïbes + Pacifique), et « le Panama n'est pas bordé par deux
océans » serait la conclusion la moins jouable du jeu. Arbitrage à trancher en même
temps que celui de `ocean_multiple_basins`.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
