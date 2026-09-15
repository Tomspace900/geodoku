---
constraint_id: water_landlocked
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# water_landlocked

## Définition

Pays sans aucun accès à la mer.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (enclavement).
- Liste établie depuis le champ `landlocked` de world-countries.

## Dérivation

`content/constraints/derivations.ts` : `waterAccess` == `landlocked`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un accès à une mer fermée (Caspienne) ou à un fleuve navigable ne lève pas l'enclavement.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
