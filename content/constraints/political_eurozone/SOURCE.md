---
constraint_id: political_eurozone
status: active
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_eurozone

## Définition

États membres de l'Union européenne ayant adopté l'**euro** comme monnaie officielle, retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `eurozone`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

La Bulgarie rejoint la zone euro au 1ᵉʳ janvier 2026 : sa présence dépend du millésime du snapshot et est confirmée à la révision. Les micro-États utilisant l'euro par accord monétaire (Andorre, Monaco, Saint-Marin, Vatican) et les pays hors UE ne sont pas retenus. Les États de l'UE encore sous dérogation ou en MCE II (Danemark) sont exclus.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
