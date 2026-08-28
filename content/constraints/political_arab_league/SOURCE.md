---
constraint_id: political_arab_league
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_arab_league

## Définition

États membres de la **Ligue des États arabes** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `arab_league`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les membres observateurs (Brésil, Inde, Venezuela, Érythrée…) ne sont pas retenus. Une adhésion suspendue est tranchée explicitement au moment de la révision. Les territoires non jouables ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
