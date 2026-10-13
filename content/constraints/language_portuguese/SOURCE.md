---
constraint_id: language_portuguese
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# language_portuguese

## Définition

Pays dont **le portugais** est une langue officielle nationale.

## Sources

- Référence de révision : constitutions et portails officiels des États concernés.
- Liste établie depuis le champ `languages` (ISO 639) de world-countries.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `officialLanguages` contient `pt`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seul le statut officiel **national** compte : de droit, ou de fait là où aucune loi n'en désigne (l'anglais aux États-Unis, au Royaume-Uni, en Australie). Une langue régionale, co-officielle localement, de travail ou d'usage courant sans statut n'ouvre pas la liste (règle tranchée le 2026-10-09, corrections dans `scripts/countries/countryPatches.ts`).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
