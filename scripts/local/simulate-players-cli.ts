import { STARTING_LIVES } from "../../src/features/game/logic/constants";
import type {
  PlayerTarget,
  SimEndReason,
} from "../../src/features/game/testing/simulation";

const MAX_PLAYERS = 100;
const GRID_CELL_COUNT = 9;

export type SimulationCliArgs = {
  count: number;
  lives: number | null;
  filled: number | null;
  end: SimEndReason | null;
  seed: number | null;
  dryRun: boolean;
  force: boolean;
  help: boolean;
};

type ValueOption = "count" | "lives" | "filled" | "end" | "seed";

const VALUE_OPTIONS = new Set<ValueOption>([
  "count",
  "lives",
  "filled",
  "end",
  "seed",
]);

function parseInteger(option: string, value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`--${option} doit être un entier`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`--${option} doit être un entier sûr`);
  }
  return parsed;
}

function assertRange(
  option: string,
  value: number | null,
  min: number,
  max: number,
): void {
  if (value !== null && (value < min || value > max)) {
    throw new Error(`--${option} doit être un entier entre ${min} et ${max}`);
  }
}

function parseEnd(value: string): SimEndReason {
  if (value !== "win" && value !== "lives" && value !== "blocked") {
    throw new Error(`--end invalide : ${value} (win | lives | blocked)`);
  }
  return value;
}

/** Parse strictement l'interface CLI documentée, avec `--option N` ou `--option=N`. */
export function parseSimulationArgs(argv: string[]): SimulationCliArgs {
  const args: SimulationCliArgs = {
    count: 1,
    lives: null,
    filled: null,
    end: null,
    seed: null,
    dryRun: true,
    force: false,
    help: false,
  };
  const seen = new Set<string>();

  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index];
    if (raw === "-h" || raw === "--help") {
      args.help = true;
      continue;
    }
    if (raw === "--dry-run" || raw === "--execute") {
      const mode = raw.slice(2);
      if (seen.has("dry-run") || seen.has("execute")) {
        throw new Error("Choisir soit --dry-run, soit --execute");
      }
      seen.add(mode);
      args.dryRun = raw !== "--execute";
      continue;
    }
    if (raw === "--force") {
      const flag = raw.slice(2);
      if (seen.has(flag)) throw new Error(`Option répétée : ${raw}`);
      seen.add(flag);
      args.force = true;
      continue;
    }
    if (!raw?.startsWith("--")) {
      throw new Error(`Argument inattendu : ${raw ?? "<vide>"}`);
    }

    const separator = raw.indexOf("=");
    const option = raw.slice(2, separator === -1 ? undefined : separator);
    if (!VALUE_OPTIONS.has(option as ValueOption)) {
      throw new Error(`Option inconnue : --${option}`);
    }
    if (seen.has(option)) throw new Error(`Option répétée : --${option}`);
    seen.add(option);

    const inlineValue = separator === -1 ? null : raw.slice(separator + 1);
    const nextValue = separator === -1 ? argv[index + 1] : null;
    const value = inlineValue ?? nextValue;
    if (value === null || value === undefined || value.startsWith("--")) {
      throw new Error(`Valeur manquante pour --${option}`);
    }
    if (separator === -1) index++;

    switch (option as ValueOption) {
      case "count":
        args.count = parseInteger(option, value);
        break;
      case "lives":
        args.lives = parseInteger(option, value);
        break;
      case "filled":
        args.filled = parseInteger(option, value);
        break;
      case "end":
        args.end = parseEnd(value);
        break;
      case "seed":
        args.seed = parseInteger(option, value);
        break;
    }
  }

  assertRange("count", args.count, 1, MAX_PLAYERS);
  assertRange("lives", args.lives, 0, STARTING_LIVES);
  assertRange("filled", args.filled, 0, GRID_CELL_COUNT);
  return args;
}

/** Traduit les options explicites en une fin de partie cohérente. */
export function inferSimulationTarget(
  args: SimulationCliArgs,
): PlayerTarget | null {
  if (args.end === "win") {
    if (args.filled !== null && args.filled !== GRID_CELL_COUNT) {
      throw new Error("Une victoire exige --filled=9");
    }
    if (args.lives === 0) {
      throw new Error("Une victoire exige au moins une vie restante");
    }
    return {
      endReason: "win",
      filledCells: GRID_CELL_COUNT,
      livesLeft: args.lives ?? STARTING_LIVES,
    };
  }

  if (args.end === "lives") {
    if (args.lives !== null && args.lives !== 0) {
      throw new Error("Une défaite par vies exige --lives=0");
    }
    if (args.filled === GRID_CELL_COUNT) {
      throw new Error("Une défaite par vies ne peut pas remplir les 9 cases");
    }
    return {
      endReason: "lives",
      filledCells: args.filled ?? 0,
      livesLeft: 0,
    };
  }

  if (args.end === "blocked") {
    if (args.filled === null && args.lives === null) {
      return { endReason: "blocked", filledCells: -1, livesLeft: -1 };
    }
    if (args.filled === null || args.lives === null) {
      throw new Error(
        "Un blocage explicite exige --filled et --lives ensemble",
      );
    }
    if (args.filled === GRID_CELL_COUNT || args.lives === 0) {
      throw new Error(
        "Un blocage exige moins de 9 cases et au moins une vie restante",
      );
    }
    return {
      endReason: "blocked",
      filledCells: args.filled,
      livesLeft: args.lives,
    };
  }

  if (args.filled === GRID_CELL_COUNT && (args.lives ?? 1) > 0) {
    return {
      endReason: "win",
      filledCells: GRID_CELL_COUNT,
      livesLeft: args.lives ?? STARTING_LIVES,
    };
  }
  if (args.lives === 0) {
    if (args.filled === GRID_CELL_COUNT) {
      throw new Error("Une défaite par vies ne peut pas remplir les 9 cases");
    }
    return {
      endReason: "lives",
      filledCells: args.filled ?? 0,
      livesLeft: 0,
    };
  }
  if (args.lives !== null || args.filled !== null) {
    throw new Error(
      "Profil ambigu — préciser --end=win|lives|blocked ou utiliser --filled=9 / --lives=0",
    );
  }
  return null;
}
