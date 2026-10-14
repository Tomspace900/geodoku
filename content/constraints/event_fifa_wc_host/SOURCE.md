---
constraint_id: event_fifa_wc_host
status: active
checked_at: 2026-10-13
review_after: 2027-04-13
---

# event_fifa_wc_host

## Définition

Pays ayant accueilli au moins une phase finale de Coupe du monde de football masculine.

## Sources

- Référence de révision : [événements sportifs](../SOURCES.md#événements-sportifs).
- Éditions (années affichées dans le Drawer) : `scripts/countries/data/eventEditions.ts`, accord avec la liste gardé par `pnpm check:content`.
- Liste établie par compilation éditoriale, édition par édition.

## Dérivation

`content/constraints/derivations.ts` : `events` contient `fifa_wc_host`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Une co-organisation compte pour **chaque** pays hôte (Corée du Sud et Japon 2002 ; États-Unis, Canada et Mexique 2026). Les éditions futures déjà attribuées ne comptent pas tant qu'elles n'ont pas eu lieu (2030, 2034).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
