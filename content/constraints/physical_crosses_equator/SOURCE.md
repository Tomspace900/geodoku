---
constraint_id: physical_crosses_equator
status: active
checked_at: 2026-08-28
review_after: 2027-01-21
---

# physical_crosses_equator

## Définition

Pays traversés par l'équateur.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief) (Natural Earth).
- Liste établie par revue cartographique du tracé.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `equator_crosser`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le critère porte sur le **territoire**, pas sur le centre : un pays dont l'équateur ne coupe qu'une pointe y figure.

La **Guinée équatoriale** reste exclue (arbitrage 2026-08-28) : aucune terre émergée n'est coupée par la ligne — le continent est au nord de l'équateur, l'île d'Annobón entièrement au sud. La lecture « du territoire de part et d'autre de la ligne » (revue de juillet, qui l'incluait) a été explicitement écartée.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
