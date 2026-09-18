import { beforeEach, describe, expect, it, vi } from "vitest";

const shouldFail = vi.hoisted(() => ({ current: true }));

vi.mock("../countrySheetData", () => {
  if (shouldFail.current) {
    throw new Error("network error");
  }
  return { getCountrySheetData: () => null };
});

describe("loadCountrySheetData", () => {
  beforeEach(() => {
    vi.resetModules();
    shouldFail.current = true;
  });

  it("retries after a rejected import instead of memoizing the failure forever", async () => {
    const { loadCountrySheetData } = await import("../loadCountrySheetData");

    await expect(loadCountrySheetData()).rejects.toBeTruthy();

    shouldFail.current = false;
    await expect(loadCountrySheetData()).resolves.toHaveProperty(
      "getCountrySheetData",
    );
  });
});
