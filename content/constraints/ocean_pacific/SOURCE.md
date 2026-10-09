---
constraint_id: ocean_pacific
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# ocean_pacific

## Définition

Pays disposant d'une façade sur l'océan Pacifique.

## Sources

- Référence de révision : [océans](../SOURCES.md#océans) (IHO S-23).
- Liste établie par revue éditoriale des façades maritimes.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `pacific_coast`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les mers marginales (mer de Chine, mer du Japon, mer de Corail) sont rattachées au Pacifique.

## Révision

Revue 2026-10-09 — **Timor-Leste sort de la liste** (42 → 41 pays). Ses côtes ne
donnent que sur les mers de Banda (48 g), de Timor (48 i) et de Savu (48 o), toutes
trois dans l'« East Indian Archipelago (48) » de l'IHO S-23 (3ᵉ éd., 1953, p. 24-30),
entrée distincte de l'océan Indien (45) et du Pacifique. Le rattachement au Pacifique
« par la mer de Banda » n'avait aucune base dans S-23 : voir
[SOURCES.md](../SOURCES.md#océans). La convention « mers marginales » ci-dessus vise
les mers de Chine, du Japon et de Corail, pas l'archipel indonésien.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
