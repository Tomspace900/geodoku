---
constraint_id: political_opec
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_opec

## Définition

États membres de l'**Organisation des pays exportateurs de pétrole (OPEP)** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `opec`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Les Émirats arabes unis ont quitté l'OPEP en mai 2026 : leur présence dans la liste dérivée dépend du millésime du snapshot REST Countries et est tranchée à la révision. Les anciens membres (Équateur, Indonésie, Qatar) et les pays de la coalition « OPEP+ » non membres sont exclus. Une adhésion suspendue est arbitrée explicitement.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
