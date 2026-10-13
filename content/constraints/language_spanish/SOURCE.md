---
constraint_id: language_spanish
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# language_spanish

## Définition

Pays dont **l'espagnol** est une langue officielle nationale.

## Sources

- Référence de révision : constitutions et portails officiels des États concernés.
- Liste établie depuis le champ `languages` (ISO 639) de world-countries.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `officialLanguages` contient `es`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seul le statut officiel **national** compte : de droit, ou de fait là où aucune loi n'en désigne (l'anglais aux États-Unis, au Royaume-Uni, en Australie). Une langue régionale, co-officielle localement, de travail ou d'usage courant sans statut n'ouvre pas la liste (règle tranchée le 2026-10-09, corrections dans `scripts/countries/countryPatches.ts`).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — au **Belize**, l'espagnol est d'usage courant mais sans statut ; l'anglais est la langue de l'État. Retrait : BLZ.
