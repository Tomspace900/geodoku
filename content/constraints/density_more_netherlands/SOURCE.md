---
constraint_id: density_more_netherlands
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# density_more_netherlands

## Définition

Pays dont la densité de population est supérieure à celle des Pays-Bas.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (population et superficie du même millésime).
- Liste établie depuis la population divisée par la superficie du catalogue.

## Dérivation

`content/constraints/derivations.ts` : `population / areaKm2` > densité de `factsOf("NLD")` (valeur live du repère). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La densité brute ignore les zones inhabitables : un pays majoritairement désertique ou montagneux peut surprendre. Un pays très proche du seuil bascule selon le millésime de la source. La dérivation tranche sur la donnée figée du snapshot (`FACTS_SNAPSHOT.date`) ; une regen sur données fraîches peut faire basculer un cas limite.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
