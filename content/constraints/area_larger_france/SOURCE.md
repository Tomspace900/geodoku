---
constraint_id: area_larger_france
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# area_larger_france

## Définition

Pays dont la superficie est supérieure à celle de la France.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (World Bank `AG.SRF.TOTL.K2`).
- Liste établie depuis les superficies de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `areaKm2` > `factsOf("FRA").areaKm2` (valeur live du repère). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays très proche du seuil bascule selon le millésime de la source. La dérivation tranche sur la donnée figée du snapshot (`FACTS_SNAPSHOT.date`) ; une regen sur données fraîches peut faire basculer un cas limite.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
