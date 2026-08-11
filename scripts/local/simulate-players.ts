/**
 * Prépare N simulations sur la grille du jour via Convex HTTP (sans navigateur).
 * Le mode par défaut est un dry-run. `--execute` soumet de vrais guesses et
 * recordGameEnd — uniquement vers un cloud dev perso (`convex dev`) ou une
 * preview. Refus si la cible est prod ou non vérifiable, sauf `--force`.
 *
 * Usage:
 *   pnpm simulate:players --count 10                    # dry-run
 *   pnpm simulate:players --execute --count 1 --lives 5 --filled 9
 *   pnpm simulate:players --execute --count 1 --lives 0 --filled 3
 *   pnpm simulate:players --execute --count 5 --end blocked
 *   pnpm simulate:players --count 10 --seed 42
 *   pnpm simulate:players --dry-run --count 3
 *
 * `VITE_CONVEX_URL` lu depuis `.env.local` (`tsx --env-file=.env.local`).
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { ConstraintId } from "../../src/features/game/logic/constraints";
import {
  buildBlockedPlan,
  buildPlayerPlan,
  buildRandomPlayerBatch,
  type PlayerTarget,
  type SimAction,
  type SimulationContext,
  simulatePlanLocally,
} from "../../src/features/game/testing/simulation";
import {
  inferSimulationTarget,
  parseSimulationArgs,
  type SimulationCliArgs,
} from "./simulate-players-cli";
import {
  persistSimulationPlan,
  type SimulationWriter,
} from "./simulate-players-execution";

// ─── Args ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`simulate:players — simuler des joueurs sur la grille du jour (Convex HTTP)

Usage:
  pnpm simulate:players [options]

Options:
  --count N       Nombre de joueurs (1–100, défaut 1 ; accepte aussi --count=N)
  --lives N       Vies restantes en fin de partie (profil explicite)
  --filled N      Cases remplies en fin de partie (profil explicite)
  --end REASON    Cause de fin : win | lives | blocked
  --seed N        Graine aléatoire reproductible
  --dry-run       Alias explicite du mode par défaut : aucune écriture Convex
  --execute       Exécute réellement les plans et écrit dans Convex
  --force         Avec --execute, autorise une cible prod ou non vérifiable
  -h, --help      Afficher cette aide

Profils explicites (exemples):
  pnpm simulate:players --lives 5 --filled 9     victoire sans faute
  pnpm simulate:players --lives 0 --filled 3   défaite, 3 cases remplies
  pnpm simulate:players --end blocked            défaite par blocage (auto)

Mode aléatoire (défaut, sans --lives/--filled/--end):
  ~55 % victoires, le reste en défaites par vies, 1 blocage si possible (à partir de 5 joueurs)
  Chaque joueur tire des pays au hasard (55 % bon pays / case quand applicable)

Environnement:
  VITE_CONVEX_URL     URL Convex (lu depuis .env.local)
  CONVEX_DEPLOYMENT   Cible vérifiée avant toute écriture avec --execute

Exemples:
  pnpm simulate:players --count 20
  pnpm simulate:players --execute --count 10 --seed 42
`);
}

function mulberry32(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Prod Convex uniquement — le cloud dev perso (`dev:*`) et les previews passent. */
// Le script écrit de vrais guesses vers `VITE_CONVEX_URL`, mais une URL seule ne
// dit pas si elle vise la prod. On se fie donc à `CONVEX_DEPLOYMENT`
// (`prod:*` / `dev:*` / `preview:*`) comme signal. Par sécurité on refuse aussi
// quand la variable est absente : sans elle, impossible de garantir que la cible
// n'est pas la prod. `--force` court-circuite en connaissance de cause.
function unsafeConvexTargetReason(): string | null {
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim();
  if (!deployment) {
    return "CONVEX_DEPLOYMENT non définie — impossible de vérifier que la cible n'est pas la prod";
  }
  if (deployment.startsWith("prod:")) {
    return `déploiement de production (${deployment})`;
  }
  return null;
}

// ─── Exécution ────────────────────────────────────────────────────────────────

function describePlayer(
  index: number,
  target: PlayerTarget,
  actions: SimAction[],
): string {
  const submits = actions.filter((a) => a.type === "submit").length;
  const fails = actions.filter((a) => a.type === "fail").length;
  return [
    `Joueur ${index + 1}`,
    `  fin=${target.endReason}`,
    `  cases=${target.filledCells}`,
    `  vies=${target.livesLeft}`,
    `  actions=${submits} succès + ${fails} échecs`,
  ].join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let cli: SimulationCliArgs;
let explicitTarget: PlayerTarget | null;
try {
  cli = parseSimulationArgs(process.argv.slice(2));
  if (cli.help) {
    printHelp();
    process.exit(0);
  }
  explicitTarget = inferSimulationTarget(cli);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Arguments invalides : ${message}`);
  console.error("Utiliser `pnpm simulate:players --help` pour l'aide.");
  process.exit(1);
}
const convexUrl = process.env.VITE_CONVEX_URL?.trim().replace(/\/$/, "");
console.log(
  `Configuration : mode=${cli.dryRun ? "dry-run" : "EXECUTION"}, joueurs=${cli.count}, seed=${cli.seed ?? "aléatoire"}, profil=${explicitTarget?.endReason ?? "aléatoire"}`,
);
if (!convexUrl) {
  console.error("VITE_CONVEX_URL manquante — définir dans .env.local");
  process.exit(1);
}

const unsafeReason = unsafeConvexTargetReason();
if (!cli.dryRun && unsafeReason && !cli.force) {
  console.error(
    `Refus de simuler : ${unsafeReason}.`,
    "Utiliser `convex dev`, preview develop, ou passer --force en connaissance de cause.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
const writer: SimulationWriter = {
  submitGuess: async (args) => {
    await client.mutation(api.guesses.submitTodayGuess, args);
  },
  recordFailedGuess: async (args) => {
    await client.mutation(api.guesses.recordTodayFailedGuess, args);
  },
  recordGameEnd: async (args) => {
    await client.mutation(api.grids.recordTodayGameEnd, args);
  },
};
const grid = await client.query(api.grids.getTodayGrid);
if (!grid) {
  console.error("Pas de grille pour aujourd'hui — seed ou attendre le cron.");
  process.exit(1);
}

const ctx: SimulationContext = {
  validAnswers: grid.validAnswers,
  rows: grid.rows as ConstraintId[],
  cols: grid.cols as ConstraintId[],
};

const rng = cli.seed !== null ? mulberry32(cli.seed) : Math.random;

const randomBatch = explicitTarget
  ? null
  : buildRandomPlayerBatch(ctx, cli.count, rng);

if (randomBatch) {
  const { composition } = randomBatch;
  console.log(
    `Composition : ${composition.wins} victoire(s), ${composition.lives} défaite(s) vies${composition.blocked > 0 ? `, ${composition.blocked} blocage` : ""}`,
  );
}

if (!explicitTarget && !randomBatch) {
  console.error(
    "Impossible de construire un lot de joueurs pour cette grille.",
  );
  process.exit(1);
}

console.log(
  `Grille ${grid.date} — ${cli.count} joueur(s)${cli.dryRun ? " (dry-run)" : ""}`,
);

let ok = 0;
let skipped = 0;

for (let i = 0; i < cli.count; i++) {
  let target: PlayerTarget;
  let actions: SimAction[] | null;
  const playerRng =
    cli.seed !== null ? mulberry32(cli.seed + i * 997) : Math.random;

  if (explicitTarget) {
    if (
      explicitTarget.endReason === "blocked" &&
      explicitTarget.filledCells < 0
    ) {
      const blocked = buildBlockedPlan(ctx, playerRng);
      if (!blocked) {
        console.warn(
          `Joueur ${i + 1} : blocage impossible sur cette grille — skip`,
        );
        skipped++;
        continue;
      }
      target = blocked.outcome;
      actions = blocked.actions;
    } else {
      target = explicitTarget;
      actions = buildPlayerPlan(ctx, target, playerRng);
    }
  } else if (randomBatch) {
    const rolled = randomBatch.plans[i];
    if (!rolled) {
      console.warn(`Joueur ${i + 1} : plan manquant dans le lot — skip`);
      skipped++;
      continue;
    }
    target = rolled.target;
    actions = rolled.actions;
  } else {
    console.warn(`Joueur ${i + 1} : lot aléatoire impossible — skip`);
    skipped++;
    continue;
  }

  if (!actions) {
    console.warn(
      `Joueur ${i + 1} : profil ${target.endReason} ` +
        `(${target.filledCells} cases, ${target.livesLeft} vies) impossible — skip`,
    );
    skipped++;
    continue;
  }

  const local = simulatePlanLocally(ctx, actions);
  const localFilled = Object.values(local.cells).filter(
    (c) => c.status === "filled",
  ).length;

  console.log(describePlayer(i, target, actions));

  if (
    localFilled !== target.filledCells ||
    local.remainingLives !== target.livesLeft
  ) {
    console.warn("  ⚠ divergence plan/local (skip)");
    skipped++;
    continue;
  }

  const clientId = `sim-${crypto.randomUUID()}`;
  try {
    const written = await persistSimulationPlan({
      execute: !cli.dryRun,
      writer,
      clientId,
      actions,
      target,
    });
    if (written) {
      console.log(`  ✓ enregistré (clientId=${clientId.slice(0, 18)}…)`);
    }
    ok++;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`  ✗ échec Convex : ${msg}`);
    skipped++;
  }
}

console.log(`\nTerminé : ${ok} ok, ${skipped} skip(s)`);
if (skipped > 0 && ok === 0) process.exit(1);
