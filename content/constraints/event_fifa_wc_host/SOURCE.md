---
constraint_id: event_fifa_wc_host
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# event_fifa_wc_host

## Définition

Pays ayant accueilli au moins une phase finale de Coupe du monde de football masculine.

## Sources

- Référence de révision : [événements sportifs](../SOURCES.md#événements-sportifs).
- Liste établie par compilation éditoriale, édition par édition.

## Dérivation

`content/constraints/derivations.ts` : `events` contient `fifa_wc_host`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Une co-organisation compte pour **chaque** pays hôte. Les éditions futures déjà attribuées ne comptent pas tant qu'elles n'ont pas eu lieu.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
