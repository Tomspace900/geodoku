---
constraint_id: urban_centres_min_3_over_1m
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# urban_centres_min_3_over_1m

## Définition

Pays comptant **au moins trois** centres urbains de plus d'un million d'habitants.

## Sources

- Référence de révision :
  [GHSL Urban Centre Database](https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php).
- Dataset curé : `scripts/countries/data/urbanCentres.ts` (centres GHSL > 1 M
  habitants à l'année de référence 2025, version R2024A V1.2, porté du snapshot
  `urban-centres` de `constraint-explorer`).

## Dérivation

`content/constraints/derivations.ts` : `urbanCentresOver1M >= 3`.
`build-countries` réduit le dataset au décompte par pays (`quantitativeFactsForCode`).
`pnpm build:answers` matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

Le « centre urbain » GHSL est l'agglomération bâtie (grille de densité), pas la
commune administrative : un pays peut passer le seuil avec des conurbations que
son découpage municipal éclate, ou l'inverse. Seuil strict (> 1 000 000).
Millésime 2025 : une ville qui vient de franchir le million bascule à la révision
suivante, jamais par édition manuelle.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
