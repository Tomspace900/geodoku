import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PoolOverviewPanel } from "../PoolOverviewPanel";

const mocks = vi.hoisted(() => ({
  refreshPool: vi.fn(),
  retryPoolFinalization: vi.fn(),
  runEnsureTomorrow: vi.fn(),
  useAction: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("convex/react", () => ({
  useAction: mocks.useAction,
  useQuery: mocks.useQuery,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useQuery.mockReturnValue({ available: 10 });
  mocks.useAction.mockImplementation(
    (reference: Parameters<typeof getFunctionName>[0]) => {
      const name = getFunctionName(reference);
      if (name === "grids:refreshPool") return mocks.refreshPool;
      if (name === "grids:retryPoolFinalization")
        return mocks.retryPoolFinalization;
      return mocks.runEnsureTomorrow;
    },
  );
});

describe("PoolOverviewPanel", () => {
  it("retries only post-activation tasks when an activated pool has warnings", async () => {
    mocks.refreshPool.mockResolvedValue({
      totalGenerated: 100,
      durationMs: 250,
      deletedAvailable: 10,
      warnings: ["future_grid_reconciliation_failed"],
    });
    mocks.retryPoolFinalization.mockResolvedValue({ warnings: [] });

    render(
      <PoolOverviewPanel
        token="admin-token"
        clearToken={() => {}}
        hasTomorrowGrid={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regénérer le pool" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await screen.findByText(/Le nouveau pool est actif/);

    fireEvent.click(
      screen.getByRole("button", { name: "Réessayer la finalisation" }),
    );
    await waitFor(() => {
      expect(screen.queryByText(/Le nouveau pool est actif/)).toBeNull();
    });

    expect({
      refreshCalls: mocks.refreshPool.mock.calls.length,
      finalizationCalls: mocks.retryPoolFinalization.mock.calls.length,
    }).toEqual({ refreshCalls: 1, finalizationCalls: 1 });
  });

  it("treats an unconfirmed refresh as ambiguous and offers only a safe retry", async () => {
    mocks.refreshPool.mockRejectedValue(new Error("response lost"));
    mocks.retryPoolFinalization.mockResolvedValue({ warnings: [] });

    render(
      <PoolOverviewPanel
        token="admin-token"
        clearToken={() => {}}
        hasTomorrowGrid={true}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Regénérer le pool" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    await screen.findByText(/Impossible de confirmer la régénération/);

    fireEvent.click(
      screen.getByRole("button", { name: "Relancer les post-traitements" }),
    );
    await waitFor(() => {
      expect(mocks.retryPoolFinalization).toHaveBeenCalledTimes(1);
    });

    expect({
      dialogVisible: screen.queryByRole("dialog") !== null,
      claimedPreservation:
        screen.queryByText(/pool actif a été conservé/i) !== null,
      refreshCalls: mocks.refreshPool.mock.calls.length,
      finalizationCalls: mocks.retryPoolFinalization.mock.calls.length,
    }).toEqual({
      dialogVisible: false,
      claimedPreservation: false,
      refreshCalls: 1,
      finalizationCalls: 1,
    });
  });
});
