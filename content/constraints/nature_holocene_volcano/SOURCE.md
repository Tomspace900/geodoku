---
constraint_id: nature_holocene_volcano
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# nature_holocene_volcano

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
