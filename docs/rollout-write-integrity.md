# Rollout — intégrité des écritures et pool générationnel

Ce runbook couvre le déploiement additif des écritures idempotentes, de la
persistence v3 et du pool générationnel. Il est temporaire : le supprimer une
fois la fenêtre d'observation et les nettoyages terminés.

## 1. Avant le déploiement

- Exécuter `pnpm lint`, `pnpm test`, `pnpm check:bundle`,
  `pnpm check:design-system` et `pnpm simulate:scheduling`.
- Ne modifier ni vider les données persistantes de prod ou develop.

## 2. Déploiement additif

Dans la commande Vercel documentée dans `AGENTS.md`, le CLI Convex exécute
d'abord `vite build` via `--cmd` avec l'URL du déploiement, puis pousse les
fonctions, index et schéma. Vercel n'expose le bundle construit qu'après le
succès de la commande complète : le backend compatible précède donc toujours
l'exposition du nouveau frontend. Si le push échoue, le déploiement Vercel
échoue et le bundle n'est pas publié ; aucune orchestration manuelle
backend/frontend n'est nécessaire.

Le schéma reste élargi pendant toute la fenêtre : champs legacy optionnels,
nouvelles tables `poolState` et `operationReceipts`, anciens endpoints conservés.

## 3. Contrôles juste après le déploiement

1. Exécuter les E2E sérialisés contre develop, puis les smoke tests prod sans
   écriture destructive.
2. Contrôler les erreurs `unavailable`, les reçus d'opération et les agrégats de
   fin de partie.
3. Vérifier la reprise d'une partie en cours après rechargement.

## 4. Migration explicite du pool legacy

Un refill automatique ne remplace jamais un pool legacy non vide : il retourne
`legacy_migration_required`. Après validation de `simulate:scheduling`, lancer
une fois « Regénérer le pool » dans `/admin`. Cette action forcée construit le
lot inactif, le valide, bascule le pointeur puis nettoie l'ancien stock
disponible. Un stock legacy déjà vide reste auto-réparable pour préserver la
disponibilité du jeu.

La bascule du pointeur est le commit point. Une erreur ultérieure de
planification immédiate ou de contrôle des grilles futures ne remet jamais
l'ancien pool en place : `/admin` confirme que le nouveau lot est actif, affiche
les warnings concernés et propose « Réessayer la finalisation ». Ce retry rejoue
uniquement les post-traitements, sans générer ni activer un autre lot. En cas de
réponse réseau ambiguë, vérifier le stock actif affiché avant de relancer une
nouvelle génération.

## 5. Fenêtre de rollback de 48 heures

Le bundle courant écrit la sauvegarde minimale v3 sous `geodoku:game-v3` et un
shadow v2 compatible sous `geodoku:game`. Un rollback Vercel vers le bundle
précédent reprend donc la partie du jour. Si l'ancien bundle fait progresser la
partie, son écriture v2 redevient autoritaire au prochain déploiement du bundle
courant.

Ne retirer ni les endpoints legacy ni le shadow v2 pendant cette fenêtre.

## 6. Nettoyage après observation

Renseigner ces repères dans le ticket de nettoyage :

- SHA déployé :
- début de l'observation :
- première date possible de nettoyage :
- rollback effectué : oui / non ;

Un rollback suivi d'un nouveau déploiement relance une fenêtre complète de
48 heures. Ne commencer la checklist suivante que si aucun retour à l'ancien
frontend n'est encore envisagé.

### À conserver durablement

- [ ] Conserver `operationReceipts`, ses deux index, sa purge cron sur sept
  jours et les identifiants d'opération côté navigateur.
- [ ] Conserver `poolState`, `generationId`, l'index
  `by_generation_id_and_status`, le lease, le refresh forcé et
  `retryPoolFinalization`.
- [ ] Conserver `grids.by_candidate_id` et les champs optionnels de cycle de vie
  `activeGenerationId`, `jobId` et `leaseUntil`.

### Après la fenêtre de rollback

- [ ] Retirer les endpoints publics legacy :
  `guesses.getGuessDistributionForDate`, `guesses.submitGuess`,
  `guesses.recordFailedGuess`, `grids.recordGameEnd` et
  `grids.submitGridFeedback`.
- [ ] Retirer leurs validators, handlers, imports et tests devenus inutiles,
  notamment `recordGameEndArgs`, `recordGameEndHandler`,
  `submitGridFeedbackArgs`, `submitGridFeedbackHandler` et
  `assertTodayDate` si plus aucun appel ne subsiste.
- [ ] Retirer l'alias interne `grids.autoRefillPool` après avoir vérifié
  qu'aucun ancien job planifié ne le référence encore.
- [ ] Régénérer et commiter `convex/_generated`.
- [ ] Retirer la compatibilité de persistence v2 :
  `PERSISTENCE_V2_STORAGE_KEY`, `PREVIOUS_STORAGE_VERSION`,
  `V2_SHADOW_MARKER`, `PersistedGameV2Shadow`, le dual read/write,
  `readPreviousTimestamps`, `persistenceRevision` et les tests de
  rollback/promotion du shadow.
- [ ] Simplifier ensuite les types, la sanitation et `clearPersistedGame` pour
  ne conserver que le format v3.

### Sortie de la migration du pool

Vérifier sur prod et develop :

- [ ] un seul document `poolState` existe ;
- [ ] `activeGenerationId` est renseigné et aucun lease n'est actif ;
- [ ] aucune candidate `available` n'est dépourvue de `generationId` ;
- [ ] le pool est sain et les grilles d'aujourd'hui et de demain sont assignées.

Après ces vérifications :

- [ ] Retirer les branches, types, tests et textes
  `legacy_migration_required` de `gridData.ts`, `poolOperations.ts` et
  `lib/poolReconciliation.ts`.
- [ ] Retirer les paragraphes temporaires de rollout dans `AGENTS.md` et le
  lien du `README`, mais conserver ce runbook jusqu'au dernier déploiement
  de schéma narrow.

### Dette de schéma — ticket et déploiements séparés

Ne pas mélanger cette étape au retrait des endpoints. Pour chaque champ encore
écrit, arrêter d'abord l'écriture avec un schéma élargi, déployer, migrer par
lots avec dry-run, vérifier les données, puis seulement rendre le schéma strict
ou retirer le champ.

- [ ] Vérifier puis retirer `grids.countryPool`,
  `gridCandidates.usedAt`, `gridCandidates.usedForDate`, les anciens champs
  de difficulté (`difficultyEstimate`, `tags`, `cellDifficulties`,
  `grids.difficulty`) et `guesses.isReplay` si aucune ligne `true` n'existe.
- [ ] Vérifier les appelants prod avant de retirer les index
  `gridCandidates.by_status_and_seed`, éventuellement
  `gridCandidates.by_status`, et l'index redondant
  `guesses.by_date_and_cell`.
- [ ] Conserver `generationId`. Pour le rendre obligatoire, backfiller d'abord
  les candidates historiques déjà utilisées.
- [ ] Relancer `pnpm lint`, `pnpm test`, `pnpm check:design-system`,
  `pnpm check:bundle`, `pnpm simulate:scheduling --seed=20260714`, les tests
  Convex et les E2E sérialisés après chaque étape narrow.
