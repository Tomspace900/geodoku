---
constraint_id: language_russian
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# language_russian

## Définition

Pays dont **le russe** est une langue officielle nationale.

## Sources

- Référence de révision : constitutions et portails officiels des États concernés.
- Liste établie depuis le champ `languages` (ISO 639) de world-countries.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `officialLanguages` contient `ru`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seul le statut officiel **national** compte : de droit, ou de fait là où aucune loi n'en désigne (l'anglais aux États-Unis, au Royaume-Uni, en Australie). Une langue régionale, co-officielle localement, de travail ou d'usage courant sans statut n'ouvre pas la liste (règle tranchée le 2026-10-09, corrections dans `scripts/countries/countryPatches.ts`).

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — règle des langues officielles (cf. [SOURCES.md](../SOURCES.md#géographie-administrative-et-quantitative)) : le russe n'a aucun statut en **Azerbaïdjan**, au **Turkménistan** et en **Ouzbékistan**, et n'est que « langue de communication interethnique » au **Tadjikistan**. Retraits : AZE, TKM, UZB, TJK. Restent RUS, BLR, KAZ, KGZ. Conséquence : la contrainte ne fournit plus que 3 grilles sur 12 comme graine (12/12 avant, en 59 tentatives) — à suivre comme `density_less_canada` (#121).
