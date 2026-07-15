// @vitest-environment edge-runtime
/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./**/__tests__/**",
]);

describe("admin authentication", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an invalid token before reading the admin model", async () => {
    vi.stubEnv("ADMIN_TOKEN", "valid-admin-token");
    const backend = convexTest(schema, modules);

    await expect(
      backend.query(api.grids.getPoolStats, {
        adminToken: "invalid-admin-token",
      }),
    ).rejects.toThrow("Unauthorized");
  });

  it("allows the configured token", async () => {
    vi.stubEnv("ADMIN_TOKEN", "valid-admin-token");
    const backend = convexTest(schema, modules);

    const result = await backend.query(api.grids.getPoolStats, {
      adminToken: "valid-admin-token",
    });

    expect(result.available).toBe(0);
  });

  it("protects pool-finalization retries before running post-activation work", async () => {
    vi.stubEnv("ADMIN_TOKEN", "valid-admin-token");
    const backend = convexTest(schema, modules);

    await expect(
      backend.action(api.grids.retryPoolFinalization, {
        adminToken: "invalid-admin-token",
      }),
    ).rejects.toThrow("Unauthorized");
  });
});
