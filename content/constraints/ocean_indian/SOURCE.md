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

Revue 2026-09-11 — la mer Rouge était rattachée à l'Indien pour EGY, SAU, SDN, ERI, DJI et YEM mais pas pour **ISR** (Eilat) ni **JOR** (Aqaba). Les deux sont ajoutés ; Israël bascule par conséquent dans `ocean_multiple_basins` (Méditerranée + Indien).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
