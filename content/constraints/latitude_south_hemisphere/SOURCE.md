---
constraint_id: latitude_south_hemisphere
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# latitude_south_hemisphere

## Définition

Pays dont le centre approximatif se situe dans l'hémisphère sud.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (coordonnées centrales officielles).
- Liste établie depuis les coordonnées `latlng` de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `latitude` < 0. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le critère porte sur le **centre** du pays, pas sur son extension : un pays à cheval sur l'équateur n'entre pas dans la liste si son centre est au nord.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
