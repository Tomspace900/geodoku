# Geodoku — Pipeline contenu (pays, contraintes, pool)

Référence détaillée pour les changements de contraintes, pays et tuning du générateur. Résumé agent dans `AGENTS.md` §3.

## Contraintes

- **60 contraintes / 18 catégories** — [`src/features/game/logic/constraints.ts`](../src/features/game/logic/constraints.ts) : `continent`, `water_access`, `borders_count`, `borders_pivot`, `area`, `population`, `language`, `flag`, `latitude`, `subregion`, `event`, `political`, `regime`, `physical`, `density`, `nature`, `society`, `ocean`.
- Seuils quantitatifs remplacés par **comparaisons à un pays-repère** (seuil = valeur live du repère dans `countries.json`).
- Sweet-spot : 3..15 pays valides par case (`MIN_CELL_SIZE` / `MAX_CELL_SIZE`).

### Archivage (critique)

**Ne jamais supprimer une contrainte — l'archiver** dans `ARCHIVED_CONSTRAINTS`. D'anciennes grilles et le replay ont besoin du label **et** du prédicat.

- `CONSTRAINTS` = générables uniquement (générateur, scheduler).
- `CONSTRAINT_BY_ID` = actif + archivé (jeu, admin, replay).
- La clé i18n seule ne suffit pas. Le test `translate` couvre actif + archivé.

## Pays (`countries.json`)

**Build :** `pnpm build:countries` — pageviews Wikimedia EN, séquentiel + retry 429. Échec si JSON incomplet. Overrides : [`scripts/countries/countryPatches.ts`](../scripts/countries/countryPatches.ts) (`wikipediaTitlesByIso3`, NATO, Commonwealth, monarchies, pics…). Tests : [`buildCountriesLib.test.ts`](../scripts/countries/buildCountriesLib.test.ts), [`countryPatches.test.ts`](../scripts/countries/countryPatches.test.ts) et [`validateCountryCatalog.test.ts`](../scripts/countries/validateCountryCatalog.test.ts).

**`popularityIndex`** : [0, 1], percentile rank des vues. Fallback médiane 0,5 si pas de pageviews.

**Drapeaux** — table curée [`scripts/countries/flagData.json`](../scripts/countries/flagData.json), pas d'heuristique depuis `flags.alt`. Erreur de drapeau → patcher `flagData.json` puis régénérer. Gameplay : 5 contraintes `flag` (`flagSymbols` + `flag_two_colors`).

## Difficulté et facilité

**Difficulté prédite supprimée (juin 2026)** — `computeCellDifficulty`, `Constraint.difficulty`, etc. retirés.

**Prédicteur validé : notoriété des solutions** — `topKPopularity(3)` dans [`popularity.ts`](../src/features/countries/logic/popularity.ts). Admin : score facilité 0–100 (vert = connu), calculé live depuis `validAnswers`, jamais stocké. Re-tuning : `pnpm analyze:observed` quand le volume de jours a ~doublé.

## Tunables (`gridConstants.ts`)

Centralise **tous** les seuils : hard filters, pool, poids scheduler, garde cold-start, `POOL_LOW_THRESHOLD`. Aucun magic number ailleurs.

**Boucle de calibration :**

1. Ajuster `convex/lib/gridConstants.ts`
2. `pnpm simulate:scheduling` — **validateur PASS/FAIL** (pool + 30 j + cold-start)
3. Si OK : « Regénérer le pool » dans `/admin`, y compris sur la copie locale obtenue par `pnpm dump:prod`. `wipe` + `seed` est réservé à un environnement dev personnel vide ou jetable.
4. `pnpm analyze:pool` — audit qualité (représentation, redondance intra-grille, rendu grilles, concentration)

## Sur-représentation des contraintes

Auto-régulée par le générateur (`MAX_CELL_SIZE`). Max observé ~24 % (`flag_has_star`). **Ne pas ajouter** de pondérage usage ou `MAX_CONSTRAINT_SHARE` — testés et rejetés (juin 2026).

**À ne pas confondre :** `MAX_CONSTRAINT_OVERLAP` = redondance **intra-grille** (seuil 0,85, coefficient `|A∩B|/min(|A|,|B|)`), pas la part dans le pool.

Risque inverse : seeds groupés (Méditerranée, monarchie) qui n'atteignent pas leur cible — borné par `MAX_OVERLAP_BETWEEN_GRIDS`, pas `MAX_ATTEMPTS_PER_SEED`.
