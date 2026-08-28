---
constraint_id: borders_brazil
status: active
checked_at: 2026-07-21
review_after: 2027-01-21
---

# borders_brazil

## Définition

Pays partageant une frontière terrestre avec **le Brésil**.

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (frontières officielles).
- Liste établie depuis le champ `borders` de world-countries, corrigé par `scripts/countries/countryPatches.ts`.

## Dérivation

`content/constraints/derivations.ts` : `borders` contient `BRA`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Seuls les voisins jouables comptent. Le Kosovo est un voisin ; Gibraltar n'en est pas un. La Guyane française fait de la France un voisin sud-américain.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
