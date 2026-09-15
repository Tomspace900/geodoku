---
constraint_id: production_rice_top10
status: active
checked_at: 2026-09-08
review_after: 2027-03-08
---

# production_rice_top10

## Définition

Pays figurant dans les **10 premiers producteurs mondiaux** de riz.

## Sources

- Référence de révision : [production et énergie](../SOURCES.md#production-et-énergie).
- [FAOSTAT](https://www.fao.org/faostat/), item « Rice, paddy » (avant
  décorticage).
- Dataset curé : `scripts/countries/data/agriculturalProduction.ts` — classement
  `top 10`, moyenne des campagnes 2022-2024, porté du snapshot
  `agricultural-production` de `constraint-explorer` (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `productionRanks.rice <= 10`.
`build-countries` fusionne le rang du pays dans `productionRanks`
(`quantitativeFactsForCode`, cap rang ≤ 15) ; `pnpm build:answers` matérialise
`answers.ts` (relu en diff, gardé par `pnpm check:content`).

## Cas limites

Le classement est celui du paddy (riz non décortiqué), série FAOSTAT standard.
Production, pas exportations. Le top 10 est très stable (Asie de l'Est et du
Sud-Est) ; la Chine et l'Inde pèsent à elles seules les deux tiers du total
mondial.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
