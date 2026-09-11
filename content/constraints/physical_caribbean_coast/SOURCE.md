---
constraint_id: physical_caribbean_coast
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# physical_caribbean_coast

## Définition

Pays disposant d'une façade sur la mer des Caraïbes.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `caribbean_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les États continentaux d'Amérique centrale et du Sud y figurent au même titre que les îles ; le golfe du Mexique n'est pas la mer des Caraïbes.

## Révision

Revue 2026-09-11 — **BHS** et **BRB** retirés : les Bahamas sont entièrement dans l'Atlantique nord-ouest au nord de Cuba, la Barbade est à l'est de l'arc antillais. Ajout de **NLD** via les îles BES, cohérent avec le périmètre territorial déjà appliqué aux volcans et aux fuseaux néerlandais.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
