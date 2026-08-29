---
constraint_id: forest_cover_majority
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# forest_cover_majority

## Définition

Pays dont **plus de la moitié** de la superficie terrestre est couverte de forêt.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- FAO Forest Resources Assessment (part de superficie forestière, indicateur
  World Bank `AG.LND.FRST.ZS`).
- Dataset curé : `scripts/countries/data/forestCover.ts` — 197 valeurs, millésime
  2023, extraites du champ `forestCoverPercent` du snapshot `country-core` de
  `constraint-explorer` (couverture complète, pas de trou).

## Dérivation

`content/constraints/derivations.ts` : `forestCoverShare !== null && > 0.5`.
`build-countries` convertit le pourcentage source en fraction 0–1.
`pnpm build:answers` matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

Définition FAO de « forêt » : couvert arboré > 10 % sur > 0,5 ha, hors usage
agricole ou urbain dominant — donc savanes boisées et plantations comptent, pas
les parcs urbains. Quelques pays tempérés (Finlande, Suède, Slovénie, Japon,
Corée du Sud) et la quasi-totalité du bassin amazonien / congolais passent le
seuil. Documenter tout pays proche de 50 % ici.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
