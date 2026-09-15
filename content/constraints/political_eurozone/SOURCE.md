---
constraint_id: political_eurozone
status: archived
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_eurozone

## En réserve

Retirée du jeu actif en **P3 lot 2** (arbitrage 2026-08-30 : contrainte jugée
pas assez fun / trop répétitive — le statut `archived` de juillet est confirmé).
Le dossier est conservé pour sa définition et ses sources ; la contrainte n'est
**ni générée ni rejouable** et n'a pas d'`answers.ts` (`RESERVE_CONSTRAINT_IDS`
dans `content/constraints/index.ts`). Réactivation : réintroduire l'entrée dans
`CONSTRAINTS` (`src/features/game/logic/constraints.ts`), la dérivation dans
`content/constraints/derivations.ts` et les clés i18n fr + en, puis
`pnpm build:answers`.

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
