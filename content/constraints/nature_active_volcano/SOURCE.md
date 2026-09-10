---
constraint_id: nature_active_volcano
status: active
checked_at: 2026-09-10
review_after: 2027-09-10
---

# nature_active_volcano

## Définition

Pays comptant au moins un volcan dont une **éruption est datée de 1500 ou après**,
sur son territoire pleinement intégré.

Remplace `nature_holocene_volcano` (archivée) à l'issue de la revue métier
2026-09-10. L'ancienne contrainte retenait toute l'étendue de l'Holocène, soit
environ 11 700 ans : elle acceptait 76 pays sur 197 — la plus large du jeu,
devant `flag_has_star` — dont l'Allemagne (dernière éruption en −8300), le Rwanda
(−8050), la Syrie et la Jordanie (−2670) ou la Mongolie (−2980). Une contrainte
que quatre pays sur dix satisfont n'apprend presque rien au joueur, et « volcan
actif » ne décrit pas un édifice dormant depuis huit millénaires.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- [Smithsonian Global Volcanism Program](https://volcano.si.edu/), service WFS
  `GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes` — champs `Volcano_Name`,
  `Last_Eruption_Year`, `Country`, `Subregion`.
- Dataset curé : `scripts/countries/data/holoceneVolcanoes.ts` (1 146 volcans sur
  75 pays, extraction du 2026-09-10). Le GVP n'expose pas de numéro de version
  par le WFS : la date d'extraction en tient lieu.

## Dérivation

`content/constraints/derivations.ts` :
`lastVolcanicEruptionYear !== null && lastVolcanicEruptionYear >= VOLCANO_HISTORICAL_SINCE`
(1500). `build-countries` réduit la liste de volcans d'un pays à l'année la plus
récente ; le seuil vit dans la dérivation, jamais dans la donnée, pour rester
révisable et visible en diff. `pnpm build:answers` matérialise `answers.ts`
(gardé par `pnpm check:content`). **56 réponses.**

## Cas limites

- **Périmètre territorial** : règle commune, cf.
  [SOURCES.md](../SOURCES.md#périmètre-territorial-dun-pays). Le **Royaume-Uni
  sort de la liste** — ses 14 volcans holocènes (Montserrat, Sandwich du Sud,
  Tristan da Cunha, Ascension, Pitcairn) sont tous en territoire d'outre-mer, et
  il n'en existe aucun sur l'île de Grande-Bretagne. L'**Australie** sort aussi :
  Heard-et-MacDonald est un territoire extérieur, et le continent n'a pas connu
  d'éruption depuis −2900.
- **Y restent par application de la même règle** : les **Pays-Bas** (Saba, 1640 —
  île BES, commune à statut particulier), la **Norvège** (Jan Mayen, 1985 —
  intégré au royaume, contrairement à l'île Bouvet qui est une dépendance) et
  l'**Afrique du Sud** (île Marion, 2004 — province du Cap-Occidental). Ce sont
  des réponses surprenantes mais exactes, et la règle est la même pour tous.
- La **France** entre par la Montagne Pelée (1932), la Soufrière de Guadeloupe
  (1977), le Piton de la Fournaise (2026) et Fani Maore au large de Mayotte
  (2019). La Chaîne des Puys figure au dataset mais ne qualifie pas seule
  (−4040).
- Un volcan à cheval sur une frontière compte pour **les deux** pays : c'est
  ainsi que la Bolivie et la Corée du Nord entrent dans la liste.
- Le seuil de 1500 est une convention de lisibilité, pas une notion géologique.
  Le GVP ne définit pas « actif » ; il documente des éruptions datées.

## Révision

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision). Rejouer la
requête WFS, réappliquer le périmètre territorial, relire le diff ISO3.
