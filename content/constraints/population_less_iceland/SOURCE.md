---
constraint_id: population_less_iceland
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# population_less_iceland

## Définition

Pays dont la population est inférieure à celle de l'Islande.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (World Bank `SP.POP.TOTL`, UN WPP 2024).
- Liste établie depuis les populations exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `population` < `factsOf("ISL").population` (valeur live du repère). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays très proche du seuil bascule selon le millésime de la source. La dérivation tranche sur la donnée figée du snapshot (`FACTS_SNAPSHOT.date`) ; une regen sur données fraîches peut faire basculer un cas limite.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
