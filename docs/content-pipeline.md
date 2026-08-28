# Geodoku — Pipeline contenu (pays, contraintes, pool)

Référence détaillée pour les changements de contraintes, de faits pays et le
tuning du générateur. Résumé agent dans `AGENTS.md` §3.

## Le modèle en un coup d'œil

```
ENTRÉES DE CURATION (éditées à la main)
  scripts/countries/countryPatches.ts    # corrections, alias, classifications gameplay
  scripts/countries/flagData.json        # table de vérité drapeaux (couleurs, symboles, disposition)
        │  pnpm build:countries   (RÉSEAU — world-countries npm + REST Countries v5 + Wikimedia)
        ▼
SNAPSHOT (content/countries/ — généré, committé, daté par FACTS_SNAPSHOT.date)
  catalog.ts       # identité joueur : iso2/3, noms fr/en, alias, emoji drapeau — CHARGÉ dans le bundle
  countryCodes.ts  # 197 codes + type CountryCode + garde isCountryCode
  facts.ts         # FACTS_SNAPSHOT + COUNTRY_FACTS : faits gameplay — HORS bundle
  popularity.ts    # snapshot pageviews Wikipédia (percentiles) — analyse de difficulté admin
        │  pnpm build:answers   (dérivation PURE, hors-ligne)
        ▼
LISTES DÉRIVÉES (content/constraints/<id>/answers.ts)
  60 actives  # en-tête @generated — DERIVATIONS[id] appliqué aux 197 pays
  11 archivées # figées à la main, sans en-tête — conservées pour le replay
        │  imports relatifs (jamais l'alias @/)
        ▼
RUNTIME + OUTILLAGE
  matchesConstraint(id, iso3)  # teste l'appartenance à la liste versionnée
```

**Principe.** La vérité d'une contrainte **active** est
`content/constraints/derivations.ts` appliqué à `content/countries/facts.ts` :
un prédicat pur, une donnée datée. `answers.ts` en est la **matérialisation
générée**, committée et relue en diff — jamais éditée à la main. Les grilles
**déjà publiées** ne dépendent pas de ce contenu : elles portent leur propre
snapshot `gridAnswers`. Le contenu courant ne sert qu'à générer les candidats
**futurs** et à expliquer quelle contrainte a échoué.

## Contraintes

- **60 actives / 18 catégories** — [`src/features/game/logic/constraints.ts`](../src/features/game/logic/constraints.ts)
  porte l'interface (`id`, `labelKey`, `category`), **sans prédicat**. La
  dérivation vit dans [`content/constraints/derivations.ts`](../content/constraints/derivations.ts).
- Seuils quantitatifs = **comparaisons à un pays-repère** : `factsOf("FRA").areaKm2`
  lit la valeur live du repère dans le snapshot (même sémantique que l'ancien
  `ref("FRA")`).
- Sweet-spot : 3..15 pays valides par case (`MIN_CELL_SIZE` / `MAX_CELL_SIZE`).
- Chaque contrainte porte un [`SOURCE.md`](../content/constraints/) : définition
  jouable, **dérivation** (champ du snapshot + seuil/pivot), cas limites. Le
  socle partagé est [`content/constraints/SOURCES.md`](../content/constraints/SOURCES.md).

### Archivage (critique)

**Ne jamais supprimer une contrainte — l'archiver.** D'anciennes grilles et le
replay ont besoin du **label** ; la liste figée sert de repli.

- `CONSTRAINTS` = actives uniquement (générateur, scheduler).
- `CONSTRAINT_BY_ID` = actives + archivées (jeu, admin, replay).
- `CONSTRAINT_IDS` / `ARCHIVED_CONSTRAINT_IDS` dans
  [`content/constraints/index.ts`](../content/constraints/index.ts) ; l'archivage
  se déclare **aux deux endroits** (`ARCHIVED_CONSTRAINT_IDS` + `ARCHIVED_CONSTRAINTS`).
- La clé i18n seule ne suffit pas. Le test `translate` couvre actif + archivé.

### Modifier une contrainte

Deux leviers, jamais `answers.ts` à la main :

1. **La définition change** (seuil, champ, pivot) → éditer
   `content/constraints/derivations.ts` (et `CONSTRAINTS` si libellé/catégorie
   bougent). Ajouter une bascule de seuil au test
   [`content/constraints/__tests__/derivations.test.ts`](../content/constraints/__tests__/derivations.test.ts)
   si le cas est sensible.
2. **Une donnée est fausse ou périmée** → corriger l'entrée de curation
   (`scripts/countries/countryPatches.ts` ou `flagData.json`), ou attendre la
   prochaine `pnpm build:countries` qui rafraîchit le snapshot.

Puis, dans l'ordre :

```bash
pnpm build:answers          # régénère les 60 answers.ts actifs (hors-ligne)
git diff content/constraints # relire le diff ISO3 pays par pays
pnpm check:content           # cohérence + obsolescence + provenance
pnpm test
pnpm simulate:scheduling     # le pool doit rester sain (PASS/FAIL)
```

Si OK : « Regénérer le pool » dans `/admin` (`refreshPool`), y compris sur une
copie locale obtenue par `pnpm dump:prod`. Les grilles déjà publiées restent
protégées par `gridAnswers`.

### Réviser un fait pays

`pnpm build:countries` (`tsx --env-file=.env.local`) : world-countries npm pour
la liste jouable / noms / langues / superficie / frontières / centroïde, REST
Countries v5 pour population / capitales / conduite / adhésions, Wikimedia pour
les pageviews. Le script **valide tout en mémoire** (197 pays, invariants par
pays, `MAX_MISSING_PAGEVIEWS`) **avant** d'écrire — un échec réseau n'écrit rien.
Il réécrit les quatre fichiers `content/countries/`, met `FACTS_SNAPSHOT.date`
au jour, puis enchaîne `pnpm build:answers`. Provenance par famille de champs :
[`content/countries/SOURCE.md`](../content/countries/SOURCE.md).

**Drapeaux** — table curée [`scripts/countries/flagData.json`](../scripts/countries/flagData.json),
pas d'heuristique. Erreur de drapeau → patcher `flagData.json` puis régénérer.
Gameplay : 5 contraintes `flag` (`flagSymbols` + `flag_two_colors` archivée).

### Contrôles automatiques

`pnpm check:content` (job CI `quality`) vérifie :

- comptes attendus (197 pays / 60 actives / 11 archivées) ;
- catalogue ↔ `COUNTRY_CODES` ↔ popularité synchronisés, tri strict, unicité ;
- `answers.ts` : non vides, triés, ISO3 connus, tout pays couvert par ≥ 1 liste ;
- **obsolescence** : re-dérive les 60 actives depuis `COUNTRY_FACTS` et échoue
  (`+[…] -[…]` + « lancer pnpm build:answers ») si un `answers.ts` committé ne
  correspond plus ;
- **provenance** : présence d'un `SOURCE.md` par contrainte, frontmatter
  cohérent (`constraint_id` == dossier, `status` == actif/archivé réel,
  `checked_at`/`review_after` en `YYYY-MM-DD`), et présence des trois documents
  de socle.

Les invariants par pays vivent dans
[`scripts/countries/validateCountryCatalog.ts`](../scripts/countries/validateCountryCatalog.ts)
(`validateCountryCatalog` + `validateCountryFacts`), appelés par la garde et ses
tests.

## Difficulté et facilité

**Difficulté prédite supprimée (juin 2026)** — `computeCellDifficulty`,
`Constraint.difficulty`, etc. retirés.

**Prédicteur validé : notoriété des solutions** — `topKPopularity(3)` dans
[`popularity.ts`](../src/features/countries/logic/popularity.ts). Admin : score
facilité 0–100 (vert = connu), calculé live depuis `validAnswers`, jamais
stocké. Re-tuning : `pnpm analyze:observed` quand le volume de jours a ~doublé.

## Tunables (`gridConstants.ts`)

Centralise **tous** les seuils : hard filters, pool, poids scheduler, garde
cold-start, `POOL_LOW_THRESHOLD`. Aucun magic number ailleurs.

**Boucle de calibration :**

1. Ajuster `convex/lib/gridConstants.ts`
2. `pnpm simulate:scheduling` — **validateur PASS/FAIL** (pool + 30 j + cold-start)
3. Si OK : « Regénérer le pool » dans `/admin`, y compris sur la copie locale
   obtenue par `pnpm dump:prod`. `wipe` + `seed` est réservé à un environnement
   dev personnel vide ou jetable.
4. `pnpm analyze:pool` — audit qualité (représentation, redondance intra-grille,
   rendu grilles, concentration)

## Sur-représentation des contraintes

Auto-régulée par le générateur (`MAX_CELL_SIZE`). Max observé ~24 %
(`flag_has_star`). **Ne pas ajouter** de pondérage usage ou `MAX_CONSTRAINT_SHARE`
— testés et rejetés (juin 2026).

**À ne pas confondre :** `MAX_CONSTRAINT_OVERLAP` = redondance **intra-grille**
(seuil 0,85, coefficient `|A∩B|/min(|A|,|B|)`), pas la part dans le pool.

Risque inverse : seeds groupés (Méditerranée, monarchie) qui n'atteignent pas
leur cible — borné par `MAX_OVERLAP_BETWEEN_GRIDS`, pas `MAX_ATTEMPTS_PER_SEED`.
