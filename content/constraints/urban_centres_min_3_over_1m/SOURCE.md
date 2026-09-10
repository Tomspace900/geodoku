---
constraint_id: urban_centres_min_3_over_1m
status: archived
checked_at: 2026-09-10
review_after: 2027-09-10
---

# urban_centres_min_3_over_1m

## En réserve

Retirée du jeu actif à la revue métier du **2026-09-10**, pour deux raisons.

**Indevinable.** La délimitation GHSL des centres urbains ne recoupe pas
l'intuition : la France compte 2 centres de plus d'un million d'habitants, la
Bolivie, le Ghana et le Kazakhstan en comptent 3. Aucun joueur ne peut arbitrer
ça, et la valeur française elle-même est discutable.

**Structurellement coûteuse.** Avec 36 réponses, elle englobait à 0,85 ou plus
quatre autres contraintes — `area_larger_india` (100 %), `political_g20` (95 %),
`population_more_germany` (94 %), `area_larger_mexico` (92 %) — qu'elle bannissait
donc de toute grille où elle figurait. Elle ressortait par ailleurs comme la
deuxième contrainte la plus réutilisée sur 30 jours simulés.

La contrainte n'est **ni générée ni rejouable** et n'a plus d'`answers.ts`
(`RESERVE_CONSTRAINT_IDS` dans `content/constraints/index.ts`). Réactivation :
réintroduire l'entrée dans `CONSTRAINTS` (`src/features/game/logic/constraints.ts`),
la dérivation dans `content/constraints/derivations.ts` et les clés i18n fr + en,
puis `pnpm build:answers`. Le champ de faits `urbanCentresOver1M` reste produit
par le pipeline : rien à régénérer.

## Définition

Pays comptant **au moins trois** centres urbains de plus d'un million d'habitants.

## Sources

- Référence de révision :
  [GHSL Urban Centre Database](https://human-settlement.emergency.copernicus.eu/ghs_ucdb_2024.php).
- Dataset curé : `scripts/countries/data/urbanCentres.ts` (centres GHSL > 1 M
  habitants à l'année de référence 2025, version R2024A V1.2, porté du snapshot
  `urban-centres` de `constraint-explorer`).

## Dérivation

`content/constraints/derivations.ts` : `urbanCentresOver1M >= 3`.
`build-countries` réduit le dataset au décompte par pays (`quantitativeFactsForCode`).
`pnpm build:answers` matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

Le « centre urbain » GHSL est l'agglomération bâtie (grille de densité), pas la
commune administrative : un pays peut passer le seuil avec des conurbations que
son découpage municipal éclate, ou l'inverse. Seuil strict (> 1 000 000).
Millésime 2025 : une ville qui vient de franchir le million bascule à la révision
suivante, jamais par édition manuelle.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
