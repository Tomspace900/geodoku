import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export const OPERATION_RECEIPT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export type OperationType = Doc<"operationReceipts">["operationType"];
export type OperationResult = Doc<"operationReceipts">["result"];

type ReceiptIdentity = {
  operationId: string;
  operationType: OperationType;
  date: string;
  canonicalPayload: string;
};

/**
 * Retourne le résultat initial d'un retry honnête. Toute réutilisation de la
 * même clé pour une autre commande est rejetée avant le rate limiting.
 */
export async function readOperationReceipt(
  ctx: MutationCtx,
  identity: ReceiptIdentity,
): Promise<OperationResult | null> {
  const existing = await ctx.db
    .query("operationReceipts")
    .withIndex("by_operation_id", (q) =>
      q.eq("operationId", identity.operationId),
    )
    .unique();
  if (!existing) return null;

  if (
    existing.operationType !== identity.operationType ||
    existing.date !== identity.date ||
    existing.canonicalPayload !== identity.canonicalPayload
  ) {
    throw new ConvexError("operationId already used for another payload");
  }
  return existing.result;
}

export async function writeOperationReceipt(
  ctx: MutationCtx,
  identity: ReceiptIdentity,
  result: OperationResult,
): Promise<void> {
  await ctx.db.insert("operationReceipts", {
    ...identity,
    result,
    expiresAt: Date.now() + OPERATION_RECEIPT_RETENTION_MS,
  });
}
