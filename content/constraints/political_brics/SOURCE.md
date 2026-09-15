---
constraint_id: political_brics
status: archived
checked_at: 2026-08-28
review_after: 2027-02-28
---

# political_brics

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

États membres des **BRICS** retenus par la convention Geodoku.

## Sources

- Référence de révision : [organisations politiques](../SOURCES.md#organisations-politiques) (liste officielle de l'organisation, à une date explicite).
- Liste établie depuis les adhésions exposées par REST Countries v5.

## Dérivation

`content/constraints/derivations.ts` : `memberships` contient `brics`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le noyau historique (Brésil, Russie, Inde, Chine, Afrique du Sud) est complété par les adhésions de 2024-2025 (Égypte, Éthiopie, Iran, Émirats arabes unis, Indonésie). L'Indonésie est membre plein depuis le 6 janvier 2025 ; REST Countries v5 ne l'a pas encore intégrée : un delta `membershipsAdd: ["brics"]` sur `IDN` dans `countryPatches.ts` la rétablit, à retirer quand la source rattrape. L'Arabie saoudite, invitée mais dont l'adhésion n'a pas été formellement confirmée, reste **exclue**. Les pays « partenaires » (statut distinct de membre) sont exclus.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
