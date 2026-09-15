---
constraint_id: production_wheat_top10
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_wheat_top10

## Définition

Pays figurant dans les **10 premiers producteurs mondiaux** de blé.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [FAOSTAT](https://www.fao.org/faostat/), item « Wheat ».
- Dataset curé : `scripts/countries/data/agriculturalProduction.ts` — classement
  `top 10`, moyenne des campagnes 2022-2024, porté du snapshot
  `agricultural-production` de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.wheat <= 10`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

Production, pas exportations : l'Ukraine et le Canada sont dans le top 10 par leur
récolte, indépendamment de leur poids à l'export. Rang 10 (Allemagne) proche du
rang 11 (souvent Turquie ou Argentine selon les années) — contrôler la bascule.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
