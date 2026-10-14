---
constraint_id: regime_monarchy
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# regime_monarchy

## Définition

Pays dont le régime officiel est une monarchie.

## Sources

- Référence de révision : [CIA World Factbook — government type](https://www.cia.gov/the-world-factbook/field/government-type/).
  Date affichée au joueur : « au 22 janvier 2026 », dernière mise à jour des
  données du miroir figé `factbook.json` (commit `8662a8b`) ; le Factbook a
  cessé de paraître en février 2026.
- Liste établie par classification éditoriale binaire monarchie / république.

## Dérivation

`content/constraints/derivations.ts` : `regime` == `monarchy`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Monarchies constitutionnelles et absolues comptent également. Chaque royaume du Commonwealth partageant le même souverain est compté séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
