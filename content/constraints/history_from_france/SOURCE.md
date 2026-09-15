---
constraint_id: history_from_france
status: active
checked_at: 2026-09-09
review_after: 2027-03-09
---

# history_from_france

## Définition

Pays dont le Factbook rattache l'indépendance ou l'autonomie souveraine de l'État
actuel à la **France** — colonie, protectorat, mandat ou administration conjointe.

## Sources

- Référence de révision : [histoire et souveraineté](../SOURCES.md#histoire-et-souveraineté).
- [CIA World Factbook — champ *Independence*](https://www.cia.gov/the-world-factbook/field/independence/).
- Dataset curé : `scripts/countries/data/sovereignty.ts` — un `SovereigntyEvent`
  par ISO3, porté verbatim du snapshot `sovereignty` de `constraint-explorer`
  (221b42d).

## Dérivation

`content/constraints/derivations.ts` : `formerSovereigns.includes("france")`.
`build-countries` fusionne `formerSovereigns` (des **slugs**, pas des ISO3) depuis
l'événement retenu ; `pnpm build:answers` matérialise `answers.ts` (relu en diff,
gardé par `pnpm check:content`). **Aucun filtre de `kind` ni d'éligibilité** — seule
l'appartenance à la liste des anciennes puissances compte.

## Cas limites

- Vanuatu (`VUT`) figure **aussi** dans `history_from_united_kingdom` : condominium
  franco-britannique, `formerSovereigns` vaut `["france", "united_kingdom"]`.
- Mandats et protectorats comptent (Liban, Syrie : mandat SDN sous administration
  française).
- Une décolonisation graduelle est ramenée à l'événement principal du Factbook ;
  la nature (`kind`) de l'événement n'est pas regardée ici.
- Territoires et dépendances non jouables : hors liste.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
