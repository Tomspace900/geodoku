import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";
import { createBrowserUuidV4, isBrowserUuidV4 } from "./browserUuid";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

type PendingOperation = {
  operationId: string;
  createdAt: number;
};

type PendingOperations = Record<string, PendingOperation>;

// `null` signifie que localStorage est autoritaire. Un objet, même vide,
// représente le dernier snapshot dont la persistance a échoué (tombstones inclus).
let volatilePendingOperations: PendingOperations | null = null;

function prunePendingOperations(
  operations: PendingOperations,
  now: number,
): PendingOperations {
  return Object.fromEntries(
    Object.entries(operations).filter(
      ([, operation]) =>
        isBrowserUuidV4(operation?.operationId) &&
        Number.isFinite(operation.createdAt) &&
        operation.createdAt <= now &&
        now - operation.createdAt < RETENTION_MS,
    ),
  );
}

function loadPendingOperations(now: number): PendingOperations {
  if (volatilePendingOperations !== null) {
    return prunePendingOperations(volatilePendingOperations, now);
  }
  const raw = safeGet(STORAGE_KEYS.pendingOperations);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PendingOperations;
    return prunePendingOperations(parsed, now);
  } catch {
    return {};
  }
}

function savePendingOperations(operations: PendingOperations): void {
  if (safeSet(STORAGE_KEYS.pendingOperations, JSON.stringify(operations))) {
    volatilePendingOperations = null;
  } else {
    volatilePendingOperations = operations;
  }
}

export function createOperationId(): string {
  return createBrowserUuidV4();
}

export function getOrCreatePendingOperationId(slot: string): string {
  const now = Date.now();
  const operations = loadPendingOperations(now);
  const existing = operations[slot];
  if (existing) {
    savePendingOperations(operations);
    return existing.operationId;
  }

  const operationId = createOperationId();
  operations[slot] = { operationId, createdAt: now };
  savePendingOperations(operations);
  return operationId;
}

export function clearPendingOperationId(
  slot: string,
  operationId: string,
): void {
  const operations = loadPendingOperations(Date.now());
  if (operations[slot]?.operationId !== operationId) return;
  delete operations[slot];
  savePendingOperations(operations);
}
