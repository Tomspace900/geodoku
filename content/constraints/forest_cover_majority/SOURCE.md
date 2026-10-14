---
constraint_id: forest_cover_majority
status: active
checked_at: 2026-08-29
review_after: 2027-02-28
---

# forest_cover_majority

## Définition

Pays dont **plus de la moitié** de la superficie terrestre est couverte de forêt.

## Sources

- Référence de révision : [nature et relief](../SOURCES.md#nature-et-relief).
- Banque mondiale, indicateur
  [`AG.LND.FRST.ZS`](https://data.worldbank.org/indicator/AG.LND.FRST.ZS) (surface
  forestière en % du territoire terrestre, d'après la FAO).
- Dataset récolté : `scripts/countries/data/forestCover.ts`, écrit par `pnpm
  harvest:forest` (`scripts/countries/harvest/forestCover.ts`) — 197 valeurs pour une
  **année unique**, la plus récente où la WDI couvre tout le catalogue (2023 au
  2026-10-10 ; 2024 laisse MCO, NIC et NRU sans valeur). Taïwan (étude forestière
  nationale 2008-2014), le Saint-Siège (FAO FRA 2010) et le Kosovo (stratégie
  forestière 2022-2030), absents de la série, prennent une valeur motivée
  (`NON_WDI_FOREST_COVER`, `forestCoverLib.ts`). Le millésime de `content/sources.ts`
  est comparé à l'année du dataset par `check:content`.

## Dérivation

`content/constraints/derivations.ts` : `forestCoverShare !== null && > 0.5`.
`build-countries` convertit le pourcentage source en fraction 0–1.
`pnpm build:answers` matérialise `answers.ts` (gardé par `pnpm check:content`).

## Cas limites

Définition FAO de « forêt » : couvert arboré > 10 % sur > 0,5 ha, hors usage
agricole ou urbain dominant — donc savanes boisées et plantations comptent, pas
les parcs urbains. Quelques pays tempérés (Finlande, Suède, Slovénie, Japon,
Corée du Sud) et la quasi-totalité du bassin amazonien / congolais passent le
seuil. Documenter tout pays proche de 50 % ici.

## Révision

Revue 2026-10-09 (#122) — **la série WDI a été révisée la veille** : l'API de la
Banque mondiale annonce `lastupdated: 2026-10-08` pour la source WDI, soit après
l'import du 2026-07-17. Mesuré le 2026-10-09 contre `AG.LND.FRST.ZS` : aucune année
de 1990 à 2024 ne reproduit le dataset (en 2023, 37 pays sur 194 à ±0,05 point près,
écart moyen 2,3 points), et sept pays qui dépassent désormais 50 % n'y sont pas —
BOL (46,3 → 50,4), CAF (35,7 → 72,5), IDN (47,7 → 50,6), LCA (34,1 → 53,7), PRK
(49,6 → 64,0), RUS (49,8 → 50,7), VUT (36,3 → 74,8). Ce n'est pas une erreur
d'import : c'est une révision de la source. **Décision : on garde l'import**, plutôt
que d'adopter en préproduction une révision publiée la veille, dont trois des sept
pays (RUS, IDN, BOL) ne passent le seuil que de 0,4 à 0,7 point. La liste reste à
47 pays. À reprendre à la prochaine revue : relire la série (`pnpm
harvest:world-bank` récolte déjà d'autres indicateurs WDI) et décider avec les sept
pays en regard.

Revue 2026-10-10 (#122) — **décision inverse, prise par l'utilisateur** : les données
partent à jour en prod. La série révisée est récoltée par `pnpm harvest:forest`
(année 2023, WDI mise à jour le 2026-10-08), qui remplace l'import du 2026-07-17. Les
sept pays entrent : BOL, CAF, IDN, LCA, PRK, RUS, VUT (47 → 54). La Tanzanie reste
au-dessus du seuil (50,16 %). Pays à moins d'un point du seuil, à surveiller à chaque
récolte : BHS 50,9 · BOL 50,4 · IDN 50,6 · RUS 50,7 · TZA 50,2 · ECU 49,8.

Procédure commune : [SOURCES.md](../SOURCES.md#procédure-de-révision).
