---
constraint_id: political_g7
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_g7

## Définition

États membres du **G7** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `g7`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le groupe compte sept États (Allemagne, Canada, États-Unis, France, Italie, Japon, Royaume-Uni). L'Union européenne, « membre non énuméré », n'est pas un pays et n'entre pas dans la liste. Une liste étroite se marie rarement à l'intersection (`MIN_CELL_SIZE`) — c'est attendu.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
