---
constraint_id: nature_holocene_volcano
status: archived
checked_at: 2026-09-10
review_after: 2027-09-10
---

# nature_holocene_volcano

## Archivée

Retirée du jeu actif à la revue métier du **2026-09-10** et remplacée par
[`nature_active_volcano`](../nature_active_volcano/SOURCE.md), qui exige une
éruption datée de 1500 ou après et applique le périmètre territorial commun.

Deux motifs. D'abord l'étendue : 76 pays sur 197 (39 %), la plus large contrainte
du jeu, avec des membres dont la dernière éruption remonte à huit millénaires —
« volcan actif ou récent » ne décrivait pas la liste. Ensuite le périmètre : le
Royaume-Uni y figurait alors qu'aucun de ses volcans n'est sur l'île de
Grande-Bretagne.

Contrairement aux contraintes **en réserve**, celle-ci garde son `answers.ts` :
elle a été jouée, et les grilles publiées doivent rester rejouables. La liste est
désormais **figée à la main** (plus d'en-tête `@generated`, hors dérivation), à
l'état du 2026-09-10.

## Définition

Pays comptant **au moins un volcan** dont une éruption est connue pendant
l'Holocène (≈ 11 700 dernières années) — formulé aux joueurs comme « volcan
actif ou récent ».

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- [Smithsonian Global Volcanism Program](https://volcano.si.edu/), version de
  base explicite.
- Dataset curé : `scripts/countries/data/holoceneVolcanoes.ts` (attribution par
  pays du GVP, portée du snapshot `holocene-volcanoes` de `constraint-explorer`).

## Dérivation

`content/constraints/derivations.ts` : `hasHoloceneVolcano` — vrai si le pays
figure dans le dataset. `build-countries` fixe le booléen ;
`pnpm build:answers` matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

Une approximation compréhensible prime sur la taxonomie fine : un champ
volcanique monogénique ou un volcan sous-marin proche compte s'il est attribué
au pays par le GVP. Les volcans de territoires ultramarins comptent pour l'État
souverain jouable (ex. la Réunion → France). Documenter tout cas litigieux ici.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
