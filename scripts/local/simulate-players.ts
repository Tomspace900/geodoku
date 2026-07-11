/**
 * Simule N joueurs sur la grille du jour via Convex HTTP (sans navigateur).
 * Soumet de vrais guesses + recordGameEnd — cas d'usage normal : cloud dev
 * perso (`convex dev`) ou preview develop. Refus uniquement si
 * `CONVEX_DEPLOYMENT` vaut `prod:*` (sauf `--force`).
 *
 * Usage:
 *   pnpm simulate:players --count 10
 *   pnpm simulate:players --count 1 --lives 5 --filled 9
 *   pnpm simulate:players --count 1 --lives 0 --filled 3
 *   pnpm simulate:players --count 5 --end blocked
 *   pnpm simulate:players --count 10 --seed 42
 *   pnpm simulate:players --dry-run --count 3
 *
 * `VITE_CONVEX_URL` lu depuis `.env.local` (`tsx --env-file=.env.local`).
 */
import { randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { STARTING_LIVES } from "../../src/features/game/logic/constants";
import type { ConstraintId } from "../../src/features/game/logic/constraints";
import {
  type PlayerTarget,
  type SimAction,
  type SimEndReason,
  type SimulationContext,
  buildBlockedPlan,
  buildPlayerPlan,
  buildRandomPlayerBatch,
  simulatePlanLocally,
} from "../../src/features/game/logic/simulation";

// ─── Args ─────────────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`simulate:players — simuler des joueurs sur la grille du jour (Convex HTTP)

Usage:
  pnpm simulate:players [options]

Options:
  --count=N       Nombre de joueurs (1–100, défaut 1)
  --lives=N       Vies restantes en fin de partie (profil explicite)
  --filled=N      Cases remplies en fin de partie (profil explicite)
  --end=REASON    Cause de fin : win | lives | blocked
  --seed=N        Graine aléatoire reproductible
  --dry-run       Affiche les plans sans appeler Convex
  --force         Autoriser même si CONVEX_DEPLOYMENT=prod:*
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
  CONVEX_DEPLOYMENT   Refus si prod:* (sauf --force)

Exemples:
  pnpm simulate:players --count 20
  pnpm simulate:players --count 10 --seed 42 --dry-run
`);
}

type CliArgs = {
  count: number;
  lives: number | null;
  filled: number | null;
  end: SimEndReason | null;
  seed: number | null;
  dryRun: boolean;
  force: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    process.exit(0);
  }

  const args: CliArgs = {
    count: 1,
    lives: null,
    filled: null,
    end: null,
    seed: null,
    dryRun: false,
    force: false,
  };

  for (const raw of argv) {
    if (raw === "--dry-run") args.dryRun = true;
    else if (raw === "--force") args.force = true;
    else if (raw.startsWith("--count=")) {
      args.count = Number.parseInt(raw.slice("--count=".length), 10);
    } else if (raw.startsWith("--lives=")) {
      args.lives = Number.parseInt(raw.slice("--lives=".length), 10);
    } else if (raw.startsWith("--filled=")) {
      args.filled = Number.parseInt(raw.slice("--filled=".length), 10);
    } else if (raw.startsWith("--end=")) {
      const value = raw.slice("--end=".length) as SimEndReason;
      if (value !== "win" && value !== "lives" && value !== "blocked") {
        throw new Error(`--end invalide : ${value} (win | lives | blocked)`);
      }
      args.end = value;
    } else if (raw.startsWith("--seed=")) {
      args.seed = Number.parseInt(raw.slice("--seed=".length), 10);
    }
  }

  if (!Number.isInteger(args.count) || args.count < 1 || args.count > 100) {
    throw new Error("--count doit être un entier entre 1 et 100");
  }

  return args;
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

function inferTarget(args: CliArgs): PlayerTarget | null {
  if (args.end === "win" || (args.filled === 9 && (args.lives ?? 1) >= 1)) {
    const livesLeft = args.lives ?? 5;
    return { endReason: "win", filledCells: 9, livesLeft };
  }
  if (args.end === "lives" || args.lives === 0) {
    return {
      endReason: "lives",
      filledCells: args.filled ?? 0,
      livesLeft: 0,
    };
  }
  if (args.end === "blocked") {
    if (args.filled !== null && args.lives !== null) {
      return {
        endReason: "blocked",
        filledCells: args.filled,
        livesLeft: args.lives,
      };
    }
    return { endReason: "blocked", filledCells: -1, livesLeft: -1 };
  }
  if (args.lives !== null || args.filled !== null) {
    throw new Error(
      "Profil ambigu — préciser --end=win|lives|blocked ou utiliser --filled=9 / --lives=0",
    );
  }
  return null;
}

/** Prod Convex uniquement — le cloud dev perso (`dev:*`) et les previews passent. */
function isProductionConvexDeployment(): boolean {
  const deployment = process.env.CONVEX_DEPLOYMENT?.trim();
  return deployment?.startsWith("prod:") ?? false;
}

// ─── Exécution ────────────────────────────────────────────────────────────────

async function executePlan(
  client: ConvexHttpClient,
  date: string,
  clientId: string,
  actions: SimAction[],
  target: PlayerTarget,
): Promise<void> {
  for (const action of actions) {
    if (action.type === "submit") {
      await client.mutation(api.guesses.submitGuess, {
        date,
        cellKey: action.cellKey,
        countryCode: action.countryCode,
        clientId,
      });
    } else {
      await client.mutation(api.guesses.recordFailedGuess, {
        date,
        cellKey: action.cellKey,
        clientId,
      });
    }
  }

  const failedGuesses = STARTING_LIVES - target.livesLeft;
  await client.mutation(api.grids.recordGameEnd, {
    date,
    endReason: target.endReason,
    livesLeft: target.livesLeft,
    filledCells: target.filledCells,
    guessesSubmitted: target.filledCells + failedGuesses,
    clientId,
  });
}

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

const cli = parseArgs(process.argv.slice(2));
const convexUrl = process.env.VITE_CONVEX_URL?.trim().replace(/\/$/, "");
if (!convexUrl) {
  console.error("VITE_CONVEX_URL manquante — définir dans .env.local");
  process.exit(1);
}

if (isProductionConvexDeployment() && !cli.force) {
  console.error(
    `Refus de simuler sur la prod Convex (${process.env.CONVEX_DEPLOYMENT}).`,
    "Utiliser `convex dev`, preview develop, ou passer --force en connaissance de cause.",
  );
  process.exit(1);
}

const client = new ConvexHttpClient(convexUrl);
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

const explicitTarget = inferTarget(cli);
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

  if (!cli.dryRun) {
    const clientId = `sim-${randomUUID()}`;
    try {
      await executePlan(client, grid.date, clientId, actions, target);
      console.log(`  ✓ enregistré (clientId=${clientId.slice(0, 18)}…)`);
      ok++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ échec Convex : ${msg}`);
      skipped++;
    }
  } else {
    ok++;
  }
}

console.log(`\nTerminé : ${ok} ok, ${skipped} skip(s)`);
if (skipped > 0 && ok === 0) process.exit(1);
