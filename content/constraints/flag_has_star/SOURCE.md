---
constraint_id: flag_has_star
status: active
checked_at: 2026-10-14
review_after: 2027-03-11
---

# flag_has_star

## Définition

Pays dont le drapeau porte une ou plusieurs **étoiles**.

## Sources

- Référence de révision : [drapeaux](../SOURCES.md#drapeaux).
- Liste établie par classification visuelle éditoriale, drapeau par drapeau.

## Dérivation

`content/constraints/derivations.ts` : `flagSymbols` contient `star`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Tout motif figurant sur le drapeau d'État compte, armoiries comprises et quelle que soit sa taille ([convention `flag_*`](../SOURCES.md#drapeaux)) — c'est ce que dit le toast joueur. Un motif stylisé reste la principale source de désaccord sur cette contrainte et se tranche drapeau par drapeau.

**Les soleils ne sont pas des étoiles.** Un soleil, même rayonné, ne vaut pas `star` : l'Argentine, l'Uruguay, le Kazakhstan, le Kirghizistan, le Népal, le Malawi, le Rwanda, la Namibie et Taïwan sont hors liste pour cette raison (vérifié dans le dépôt le 2026-10-14). Les Philippines y figurent pour leurs trois étoiles, pas pour leur soleil.

## Révision

Revue 2026-09-11 — même règle (drapeau d'État, armoiries comprises). Ajouts : **HRV**, **MDA**, **GNQ** (six étoiles à six branches au-dessus du fromager, lui déjà compté comme `plant`), **CRI** (sept étoiles du drapeau d'État).

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).

Revue 2026-10-09 (#122) — **BOL** ajoutée : l'ovale des armoiries du drapeau d'État porte dix étoiles d'or. La Roumanie, signalée par la vérification, n'a pas d'armoiries sur son drapeau.
