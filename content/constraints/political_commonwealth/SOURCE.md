---
constraint_id: political_commonwealth
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# political_commonwealth

## Définition

États membres de **le Commonwealth** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `commonwealth`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Observateurs, partenaires et invités ne sont pas membres. Une suspension en cours est tranchée explicitement au moment de la révision.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
