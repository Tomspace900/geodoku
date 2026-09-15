---
constraint_id: political_asean
status: archived
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_asean

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

États membres de l'**Association des nations de l'Asie du Sud-Est (ASEAN)** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `asean`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le Timor oriental est le onzième membre (adhésion actée le 26 octobre 2025). REST Countries v5 ne l'a pas encore intégré : un delta `membershipsAdd: ["asean"]` sur `TLS` dans `countryPatches.ts` le rétablit, à retirer quand la source rattrape. La Papouasie–Nouvelle-Guinée (observateur) est exclue. Les territoires non jouables ne sont pas ajoutés séparément.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
