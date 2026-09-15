---
constraint_id: latitude_polar
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# latitude_polar

## Définition

Pays dont le centre approximatif dépasse le 55ᵉ parallèle (Scandinavie, Canada, Russie…).

## Sources

- Référence de révision : [géographie quantitative](../SOURCES.md#géographie-administrative-et-quantitative) (coordonnées centrales officielles).
- Liste établie depuis les coordonnées `latlng` de world-countries, avec le seuil Geodoku de 55°.

## Dérivation

`content/constraints/derivations.ts` : `Math.abs(latitude)` > 55 (au-delà du 55ᵉ parallèle). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Le critère porte sur le **centre** du pays : un territoire très étendu peut atteindre l'Arctique sans figurer ici.

## Révision

Revue 2026-09-11 — libellé joueur corrigé : « latitude polaire » décrivait mal une liste qui contient le Danemark, la Lituanie et la Lettonie. Devient « Au-delà du 55ᵉ parallèle nord » / « Beyond 55°N ». Le seuil et la dérivation sont inchangés.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
