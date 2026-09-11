---
constraint_id: nature_desert
status: active
checked_at: 2026-09-11
review_after: 2027-03-11
---

# nature_desert

## Définition

Pays dont le territoire comprend un désert notable.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Liste établie par revue éditoriale des biomes nommés.

## Dérivation

`content/constraints/derivations.ts` : `physicalFeatures` contient `has_desert`. `pnpm build:answers` matérialise la liste ISO3 dans `answers.ts` (relue en diff, gardée par `pnpm check:content`).

## Cas limites

Une approximation cohérente et lisible par les joueurs prime sur la taxonomie climatique : les zones semi-arides sont tranchées au cas par cas.

## Révision

Revue 2026-09-11 — cinq déserts notables manquaient : **ETH** (Danakil, Ogaden), **BHR** (territoire entièrement aride), **KEN** (Chalbi), **COL** (La Guajira, Tatacoa) et **ESP** (Tabernas, Bardenas Reales — le seul désert d'Europe). Le **Brésil reste exclu** : les Lençóis Maranhenses sont un champ de dunes sous 1 600 mm de pluie annuelle et la Caatinga est semi-aride, ni l'un ni l'autre n'est un désert.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
