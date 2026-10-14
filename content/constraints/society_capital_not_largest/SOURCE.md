---
constraint_id: society_capital_not_largest
status: active
checked_at: 2026-10-14
review_after: 2027-03-11
---

# society_capital_not_largest

## Définition

Pays dont la capitale n'est pas la ville la plus peuplée du territoire.

## Sources

- Référence de révision : instituts statistiques nationaux pour les populations urbaines.
- Liste établie par compilation éditoriale, pays par pays.
- Conventions communes : [sources](../SOURCES.md).

## Dérivation

`content/constraints/derivations.ts` : `geoTags` contient `capital_not_largest` (tag curé). `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Un pays à plusieurs capitales est jugé sur sa capitale **politique**. La comparaison porte sur la ville, pas sur son aire urbaine.

## Révision

Revue 2026-09-11 — trois oublis rattrapés : **GMB** (Banjul ≈ 31 000 hab. contre Serekunda ≈ 340 000), **GNQ** (Malabo capitale, Bata plus peuplée) et **SWZ** (Mbabane capitale administrative, Manzini plus peuplée).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — quatre oublis rattrapés, la comparaison portant sur la ville et non l'aire urbaine : **TWN** (Nouveau Taipei, plus peuplée que Taipei), **SMR** (Serravalle contre la Cité de Saint-Marin), **LIE** (Schaan contre Vaduz), **MLT** (St. Paul's Bay et Birkirkara contre La Valette).

Revue 2026-10-14 (#129) — **TTO** ajoutée, convention intra-muros : la ville de Port-d'Espagne (37 074 habitants) compte moins d'habitants que Chaguanas (83 516) et San Fernando (48 838). Source : Central Statistical Office de Trinité-et-Tobago, *Trinidad and Tobago 2011 Population and Housing Census, Demographic Report*, tableau 1.3 (population par municipalité, [PDF](https://prod.redatam.org/redtto/census/TT2011/TT2011_demog_report.pdf)). La comparaison porte sur la ville, pas sur l'aire urbaine (cf. Cas limites). 37 → 38.

**Guinée équatoriale** : Malabo reste la capitale. Les capitales viennent de REST Countries v5 ; aucun correctif tant qu'une source de référence n'est pas intégrée au pipeline. La présence du pays dans la liste ne change pas, Bata restant la plus grande ville.
