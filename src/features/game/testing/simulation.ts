import countriesJson from "@/features/countries/data/countries.json" with {
  type: "json",
};
import { getCountryByIso3 } from "@/features/countries/logic/search";
import {
  hasEmptyCell,
  markBlockedCells,
  resolveStatusAfterPlacement,
} from "../logic/blockedDetection";
import { STARTING_LIVES } from "../logic/constants";
import type { ConstraintId } from "../logic/constraints";
import { CELL_KEYS, solveGrid } from "../logic/gridSolver";
import { validateGuess } from "../logic/validation";
import type { Cell, CellKey } from "../types";

export { CELL_KEYS, solveGrid } from "../logic/gridSolver";

/** Probabilité qu'un tirage vise un pays valide pour la case (sinon erreur). */
export const GOOD_COUNTRY_PICK_RATE = 0.55;

const ALL_COUNTRY_CODES = (countriesJson as { iso3: string }[]).map(
  (c) => c.iso3,
);

function shuffleArray<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function codesInGrid(validAnswers: Record<string, string[]>): string[] {
  const codes = new Set<string>();
  for (const list of Object.values(validAnswers)) {
    for (const code of list) codes.add(code);
  }
  return [...codes];
}

export type SimEndReason = "win" | "lives" | "blocked";

export type PlayerTarget = {
  endReason: SimEndReason;
  filledCells: number;
  livesLeft: number;
};

export type SimAction =
  | { type: "submit"; cellKey: CellKey; countryCode: string }
  | { type: "fail"; cellKey: CellKey; countryCode: string };

export type SimulationContext = {
  validAnswers: Record<string, string[]>;
  rows: ConstraintId[];
  cols: ConstraintId[];
};

type LocalSimState = {
  usedCountries: Set<string>;
  remainingLives: number;
  cells: Record<CellKey, Cell>;
  status: "playing" | "won" | "lost";
};

function emptyCells(): Record<CellKey, Cell> {
  return Object.fromEntries(
    CELL_KEYS.map((k) => [k, { status: "empty" as const }]),
  ) as Record<CellKey, Cell>;
}

function cellPosition(key: CellKey): { row: 0 | 1 | 2; col: 0 | 1 | 2 } {
  const [row, col] = key.split(",").map(Number) as [0 | 1 | 2, 0 | 1 | 2];
  return { row, col };
}

/**
 * Matching parfait aléatoire : ordre des cases et choix parmi les pays valides
 * sont tirés au hasard à chaque joueur (diversifie la rareté simulée).
 */
export function randomPerfectMatching(
  validAnswers: Record<string, string[]>,
  rng: () => number,
): Record<string, { code: string }> | null {
  const assignment: Partial<Record<CellKey, string>> = {};
  const used = new Set<string>();

  function search(cellOrder: CellKey[], index: number): boolean {
    if (index === cellOrder.length) return true;
    const cellKey = cellOrder[index];
    const options = shuffleArray(
      (validAnswers[cellKey] ?? []).filter((c) => !used.has(c)),
      rng,
    );
    for (const code of options) {
      used.add(code);
      assignment[cellKey] = code;
      if (search(cellOrder, index + 1)) return true;
      used.delete(code);
      delete assignment[cellKey];
    }
    return false;
  }

  const cellOrder = shuffleArray([...CELL_KEYS], rng);
  if (!search(cellOrder, 0)) return solveGrid(validAnswers);

  const byCell: Record<string, { code: string }> = {};
  for (const key of CELL_KEYS) {
    const code = assignment[key];
    if (!code) return solveGrid(validAnswers);
    byCell[key] = { code };
  }
  return byCell;
}

/** Tirage : GOOD_COUNTRY_PICK_RATE → pays valide aléatoire, sinon pays hors case. */
export function pickCountryAttempt(
  ctx: SimulationContext,
  cellKey: CellKey,
  usedCountries: Set<string>,
  rng: () => number,
):
  | { kind: "submit"; countryCode: string }
  | { kind: "fail"; countryCode: string } {
  const validPool = (ctx.validAnswers[cellKey] ?? []).filter(
    (c) => !usedCountries.has(c),
  );

  if (rng() < GOOD_COUNTRY_PICK_RATE && validPool.length > 0) {
    const countryCode =
      validPool[Math.floor(rng() * validPool.length)] ?? validPool[0];
    return { kind: "submit", countryCode };
  }

  const validSet = new Set(ctx.validAnswers[cellKey] ?? []);
  const wrongFromGrid = shuffleArray(
    codesInGrid(ctx.validAnswers).filter(
      (c) => !usedCountries.has(c) && !validSet.has(c),
    ),
    rng,
  );
  if (wrongFromGrid.length > 0) {
    return { kind: "fail", countryCode: wrongFromGrid[0] };
  }

  const wrongFromAll = shuffleArray(
    ALL_COUNTRY_CODES.filter((c) => !usedCountries.has(c) && !validSet.has(c)),
    rng,
  );
  if (wrongFromAll.length > 0) {
    return { kind: "fail", countryCode: wrongFromAll[0] };
  }

  const failingCountry = pickFailingCountry(ctx, cellKey, usedCountries);
  if (failingCountry) return { kind: "fail", countryCode: failingCountry };
  if (validPool.length > 0) {
    const countryCode =
      validPool[Math.floor(rng() * validPool.length)] ?? validPool[0];
    return { kind: "submit", countryCode };
  }
  throw new Error(`Aucun pays en échec disponible pour la case ${cellKey}`);
}

/** Pick the first unused valid country for a cell key (e.g. "0,1"). */
export function pickCountry(
  validAnswers: Record<string, string[]>,
  cellKey: string,
  usedCodes: Set<string>,
): string | null {
  return (validAnswers[cellKey] ?? []).find((c) => !usedCodes.has(c)) ?? null;
}

/**
 * Build a plan that makes one cell blocked: park each valid answer of the
 * target cell in a distinct other cell where that country is also valid.
 */
export function findBlockingPlan(validAnswers: Record<string, string[]>): {
  blockedCell: string;
  fills: Array<{ cell: string; code: string }>;
} | null {
  const cellsBySize = [...CELL_KEYS].sort(
    (a, b) => (validAnswers[a]?.length ?? 0) - (validAnswers[b]?.length ?? 0),
  );

  for (const target of cellsBySize) {
    const need = validAnswers[target] ?? [];
    if (need.length === 0 || need.length > CELL_KEYS.length - 1) continue;

    const cellByCountry: Record<string, string> = {};
    const assign = (country: string, seen: Set<string>): boolean => {
      for (const cell of CELL_KEYS) {
        if (cell === target || seen.has(cell)) continue;
        if (!(validAnswers[cell] ?? []).includes(country)) continue;
        seen.add(cell);
        const occupant = Object.keys(cellByCountry).find(
          (c) => cellByCountry[c] === cell,
        );
        if (occupant === undefined || assign(occupant, seen)) {
          cellByCountry[country] = cell;
          return true;
        }
      }
      return false;
    };

    if (need.every((c) => assign(c, new Set()))) {
      return {
        blockedCell: target,
        fills: Object.entries(cellByCountry).map(([code, cell]) => ({
          cell,
          code,
        })),
      };
    }
  }
  return null;
}

/** Pays qui échoue la validation locale (croisement), pas déjà utilisé. */
export function pickFailingCountry(
  ctx: SimulationContext,
  cellKey: CellKey,
  usedCountries: Set<string>,
): string | null {
  const { row, col } = cellPosition(cellKey);
  const candidates = new Set<string>();
  for (const codes of Object.values(ctx.validAnswers)) {
    for (const code of codes) candidates.add(code);
  }

  for (const code of candidates) {
    const country = getCountryByIso3(code);
    if (!country) continue;
    const result = validateGuess({
      rowConstraintId: ctx.rows[row],
      colConstraintId: ctx.cols[col],
      country,
      usedCountries,
    });
    if (!result.valid && result.reason !== "already_used") return code;
  }
  return null;
}

function applySubmit(
  state: LocalSimState,
  cellKey: CellKey,
  countryCode: string,
  validAnswers: Record<string, string[]>,
): LocalSimState {
  if (state.status !== "playing") return state;
  const used = new Set(state.usedCountries);
  used.add(countryCode);
  const cells = markBlockedCells(
    {
      ...state.cells,
      [cellKey]: { status: "filled", countryCode },
    },
    validAnswers,
    used,
  );
  const status = resolveStatusAfterPlacement(cells);
  return {
    usedCountries: used,
    remainingLives: state.remainingLives,
    cells,
    status,
  };
}

function applyFail(state: LocalSimState): LocalSimState {
  if (state.status !== "playing") return state;
  const lives = state.remainingLives - 1;
  return {
    ...state,
    remainingLives: lives,
    status: lives <= 0 ? "lost" : "playing",
  };
}

export function simulatePlanLocally(
  ctx: SimulationContext,
  actions: SimAction[],
): LocalSimState {
  let state: LocalSimState = {
    usedCountries: new Set(),
    remainingLives: STARTING_LIVES,
    cells: emptyCells(),
    status: "playing",
  };
  for (const action of actions) {
    if (action.type === "submit") {
      state = applySubmit(
        state,
        action.cellKey,
        action.countryCode,
        ctx.validAnswers,
      );
    } else {
      state = applyFail(state);
    }
    if (state.status !== "playing") break;
  }
  return state;
}

function filledCount(cells: Record<CellKey, Cell>): number {
  return Object.values(cells).filter((c) => c.status === "filled").length;
}

function endReasonFromState(state: LocalSimState): SimEndReason | null {
  if (state.status === "won") return "win";
  if (state.status !== "lost") return null;
  if (state.remainingLives <= 0) return "lives";
  if (!hasEmptyCell(state.cells) && filledCount(state.cells) < 9) {
    return "blocked";
  }
  return null;
}

function stateMatchesTarget(
  state: LocalSimState,
  target: PlayerTarget,
): boolean {
  const reason = endReasonFromState(state);
  if (reason !== target.endReason) return false;
  if (filledCount(state.cells) !== target.filledCells) return false;
  if (state.remainingLives !== target.livesLeft) return false;
  if (target.endReason === "win" && state.status !== "won") return false;
  if (target.endReason !== "win" && state.status !== "lost") return false;
  return true;
}

function randomPartialMatching(
  validAnswers: Record<string, string[]>,
  cellKeys: CellKey[],
  rng: () => number,
): Record<CellKey, string> | null {
  const assignment: Partial<Record<CellKey, string>> = {};
  const used = new Set<string>();

  function search(keys: CellKey[], index: number): boolean {
    if (index === keys.length) return true;
    const cellKey = keys[index];
    const options = shuffleArray(
      (validAnswers[cellKey] ?? []).filter((c) => !used.has(c)),
      rng,
    );
    for (const code of options) {
      used.add(code);
      assignment[cellKey] = code;
      if (search(keys, index + 1)) return true;
      used.delete(code);
      delete assignment[cellKey];
    }
    return false;
  }

  const order = shuffleArray(cellKeys, rng);
  if (!search(order, 0)) return null;
  const out = {} as Record<CellKey, string>;
  for (const key of cellKeys) {
    const code = assignment[key];
    if (!code) return null;
    out[key] = code;
  }
  return out;
}

function randomFailActions(
  ctx: SimulationContext,
  count: number,
  rng: () => number,
): SimAction[] | null {
  const actions: SimAction[] = [];
  for (let index = 0; index < count; index++) {
    const candidates = shuffleArray([...CELL_KEYS], rng)
      .map((cellKey) => ({
        cellKey,
        countryCode: ALL_COUNTRY_CODES.find(
          (code) => !(ctx.validAnswers[cellKey] ?? []).includes(code),
        ),
      }))
      .filter(
        (candidate): candidate is { cellKey: CellKey; countryCode: string } =>
          candidate.countryCode !== undefined,
      );
    const candidate = candidates[0];
    if (!candidate) return null;
    actions.push({ type: "fail", ...candidate });
  }
  return actions;
}

export function buildWinPlan(
  ctx: SimulationContext,
  livesLeft: number,
  rng: () => number = Math.random,
): SimAction[] | null {
  if (livesLeft < 1 || livesLeft > STARTING_LIVES) return null;
  const solution = randomPerfectMatching(ctx.validAnswers, rng);
  if (!solution) return null;

  const failures = STARTING_LIVES - livesLeft;
  const failPart = randomFailActions(ctx, failures, rng);
  if (!failPart) return null;

  const cellOrder = shuffleArray([...CELL_KEYS], rng);
  const submits: SimAction[] = cellOrder.map((key) => ({
    type: "submit",
    cellKey: key,
    countryCode: solution[key].code,
  }));

  const actions = [...failPart, ...submits];
  const state = simulatePlanLocally(ctx, actions);
  const target: PlayerTarget = {
    endReason: "win",
    filledCells: 9,
    livesLeft,
  };
  return stateMatchesTarget(state, target) ? actions : null;
}

export function buildLivesDefeatPlan(
  ctx: SimulationContext,
  filledCells: number,
  rng: () => number = Math.random,
): SimAction[] | null {
  if (filledCells < 0 || filledCells > 9) return null;

  const submits: SimAction[] = [];
  if (filledCells > 0) {
    const cells = shuffleArray([...CELL_KEYS], rng).slice(0, filledCells);
    const matching = randomPartialMatching(ctx.validAnswers, cells, rng);
    if (!matching) return null;
    for (const cellKey of cells) {
      const code = matching[cellKey];
      submits.push({ type: "submit", cellKey, countryCode: code });
    }
  }

  const failPart = randomFailActions(ctx, STARTING_LIVES, rng);
  if (!failPart) return null;

  const actions = [...submits, ...failPart];
  const state = simulatePlanLocally(ctx, actions);
  const target: PlayerTarget = {
    endReason: "lives",
    filledCells,
    livesLeft: 0,
  };
  return stateMatchesTarget(state, target) ? actions : null;
}

/**
 * Remplit au maximum après un plan de blocage jusqu'à épuisement des cases
 * remplissables, puis retourne l'état final (défaite par blocage si possible).
 */
export function buildBlockedPlan(
  ctx: SimulationContext,
  rng: () => number = Math.random,
): {
  actions: SimAction[];
  outcome: PlayerTarget;
} | null {
  const plan = findBlockingPlan(ctx.validAnswers);
  if (!plan) return null;

  const actions: SimAction[] = plan.fills.map((f) => ({
    type: "submit",
    cellKey: f.cell as CellKey,
    countryCode: f.code,
  }));

  let state = simulatePlanLocally(ctx, actions);
  if (state.status !== "playing") return null;

  while (state.status === "playing" && hasEmptyCell(state.cells)) {
    const emptyKeys = CELL_KEYS.filter(
      (k) => state.cells[k].status === "empty",
    );
    if (emptyKeys.length === 0) break;
    const emptyKey = shuffleArray(emptyKeys, rng)[0] ?? emptyKeys[0];
    const valid = shuffleArray(
      (ctx.validAnswers[emptyKey] ?? []).filter(
        (c) => !state.usedCountries.has(c),
      ),
      rng,
    );
    if (valid.length === 0) break;
    const code = valid[Math.floor(rng() * valid.length)] ?? valid[0];
    actions.push({ type: "submit", cellKey: emptyKey, countryCode: code });
    state = simulatePlanLocally(ctx, actions);
  }

  const reason = endReasonFromState(state);
  if (reason !== "blocked") return null;

  return {
    actions,
    outcome: {
      endReason: "blocked",
      filledCells: filledCount(state.cells),
      livesLeft: state.remainingLives,
    },
  };
}

export function buildPlayerPlan(
  ctx: SimulationContext,
  target: PlayerTarget,
  rng: () => number = Math.random,
): SimAction[] | null {
  if (target.endReason === "win") {
    return buildWinPlan(ctx, target.livesLeft, rng);
  }
  if (target.endReason === "lives") {
    if (target.livesLeft !== 0) return null;
    return buildLivesDefeatPlan(ctx, target.filledCells, rng);
  }
  const blocked = buildBlockedPlan(ctx, rng);
  if (!blocked) return null;
  if (
    blocked.outcome.filledCells === target.filledCells &&
    blocked.outcome.livesLeft === target.livesLeft
  ) {
    return blocked.actions;
  }
  return null;
}

export const BATCH_WIN_RATE = 0.55;
/** Au-delà de ce seuil, on injecte au plus 1 défaite par blocage si la grille le permet. */
export const BATCH_MIN_COUNT_FOR_BLOCKED = 5;

type PlayerPlan = { target: PlayerTarget; actions: SimAction[] };

function shufflePlans<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomWinPlan(
  ctx: SimulationContext,
  rng: () => number,
): PlayerPlan | null {
  for (let attempt = 0; attempt < STARTING_LIVES * 4; attempt++) {
    const livesLeft = 1 + Math.floor(rng() * STARTING_LIVES);
    const actions = buildWinPlan(ctx, livesLeft, rng);
    if (actions) {
      return {
        target: { endReason: "win", filledCells: 9, livesLeft },
        actions,
      };
    }
  }
  const fallbackActions = buildWinPlan(ctx, 5, rng);
  return fallbackActions
    ? {
        target: { endReason: "win", filledCells: 9, livesLeft: 5 },
        actions: fallbackActions,
      }
    : null;
}

function randomLivesDefeatPlan(
  ctx: SimulationContext,
  rng: () => number,
): PlayerPlan | null {
  for (let attempt = 0; attempt < 30; attempt++) {
    const filledCells = Math.floor(rng() * 10);
    const actions = buildLivesDefeatPlan(ctx, filledCells, rng);
    if (actions) {
      return {
        target: { endReason: "lives", filledCells, livesLeft: 0 },
        actions,
      };
    }
  }
  for (let filledCells = 0; filledCells <= 9; filledCells++) {
    const actions = buildLivesDefeatPlan(ctx, filledCells, rng);
    if (actions) {
      return {
        target: { endReason: "lives", filledCells, livesLeft: 0 },
        actions,
      };
    }
  }
  return null;
}

export type BatchComposition = {
  wins: number;
  lives: number;
  blocked: number;
};

export function batchComposition(
  count: number,
  canBlock: boolean,
): BatchComposition {
  const blocked = canBlock && count >= BATCH_MIN_COUNT_FOR_BLOCKED ? 1 : 0;
  const wins = Math.min(
    count - blocked,
    Math.max(0, Math.round(count * BATCH_WIN_RATE)),
  );
  const lives = count - wins - blocked;
  return { wins, lives, blocked };
}

/**
 * Construit un lot de `count` joueurs : ~55 % victoires, le reste en défaites
 * par vies, et au plus 1 blocage si la grille le permet (à partir de 5 joueurs).
 */
export function buildRandomPlayerBatch(
  ctx: SimulationContext,
  count: number,
  rng: () => number,
): { plans: PlayerPlan[]; composition: BatchComposition } | null {
  if (!solveGrid(ctx.validAnswers)) return null;

  const canBlock = findBlockingPlan(ctx.validAnswers) !== null;
  const composition = batchComposition(count, canBlock);
  const plans: PlayerPlan[] = [];

  for (let i = 0; i < composition.wins; i++) {
    const plan = randomWinPlan(ctx, rng);
    if (!plan) return null;
    plans.push(plan);
  }

  if (composition.blocked > 0) {
    const blocked = buildBlockedPlan(ctx, rng);
    if (!blocked) return null;
    plans.push({ target: blocked.outcome, actions: blocked.actions });
  }

  for (let i = 0; i < composition.lives; i++) {
    const plan = randomLivesDefeatPlan(ctx, rng);
    if (!plan) return null;
    plans.push(plan);
  }

  return { plans: shufflePlans(plans, rng), composition };
}

export function randomPlayerTarget(
  ctx: SimulationContext,
  rng: () => number,
): PlayerPlan | null {
  const batch = buildRandomPlayerBatch(ctx, 1, rng);
  return batch?.plans[0] ?? null;
}

export function isTargetValid(target: PlayerTarget): boolean {
  if (
    !Number.isInteger(target.filledCells) ||
    target.filledCells < 0 ||
    target.filledCells > 9
  ) {
    return false;
  }
  if (
    !Number.isInteger(target.livesLeft) ||
    target.livesLeft < 0 ||
    target.livesLeft > STARTING_LIVES
  ) {
    return false;
  }
  if (target.endReason === "win") {
    return target.filledCells === 9 && target.livesLeft >= 1;
  }
  if (target.endReason === "lives") {
    return target.livesLeft === 0;
  }
  return (
    target.livesLeft >= 1 && target.filledCells >= 1 && target.filledCells < 9
  );
}
