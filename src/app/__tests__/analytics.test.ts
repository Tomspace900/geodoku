// @vitest-environment happy-dom
import type { PostHog } from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

type FakeClient = {
  calls: string[];
  capture: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  captureException: ReturnType<typeof vi.fn>;
  onFeatureFlags: ReturnType<typeof vi.fn>;
  isFeatureEnabled: ReturnType<typeof vi.fn>;
};

function fakeClient(): FakeClient {
  const calls: string[] = [];
  return {
    calls,
    capture: vi.fn((event: string) => calls.push(`capture:${event}`)),
    register: vi.fn(() => calls.push("register")),
    captureException: vi.fn(() => calls.push("exception")),
    onFeatureFlags: vi.fn(),
    isFeatureEnabled: vi.fn(() => true),
  };
}

async function freshModule() {
  vi.resetModules();
  return import("@/app/analytics");
}

function attach(
  mod: Awaited<ReturnType<typeof freshModule>>,
  client: FakeClient,
) {
  mod.attachAnalyticsClient(client as unknown as PostHog);
}

describe("analytics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rejoue dans l'ordre les appels faits avant le chargement", async () => {
    const mod = await freshModule();
    mod.analytics.register({ locale: "fr" });
    mod.analytics.capture("game_started");
    const client = fakeClient();
    attach(mod, client);
    expect(client.calls).toEqual(["register", "capture:game_started"]);
  });

  it("garde l'heure de l'event mis en file", async () => {
    const mod = await freshModule();
    vi.useFakeTimers({ now: new Date("2026-11-23T10:00:00Z") });
    mod.analytics.capture("game_started");
    vi.setSystemTime(new Date("2026-11-23T10:00:05Z"));
    const client = fakeClient();
    attach(mod, client);
    vi.useRealTimers();
    expect(client.capture.mock.calls[0]?.[2]?.timestamp).toEqual(
      new Date("2026-11-23T10:00:00Z"),
    );
  });

  it("envoie directement une fois le client branché", async () => {
    const mod = await freshModule();
    const client = fakeClient();
    attach(mod, client);
    mod.analytics.capture("cell_opened");
    expect(client.calls).toEqual(["capture:cell_opened"]);
  });

  it("jette la file quand PostHog est désactivé", async () => {
    const mod = await freshModule();
    mod.analytics.capture("game_started");
    mod.disableAnalytics();
    mod.analytics.capture("cell_opened");
    const client = fakeClient();
    attach(mod, client);
    expect(client.calls).toEqual([]);
  });

  it("capte une exception levée avant le chargement", async () => {
    const mod = await freshModule();
    mod.watchEarlyErrors();
    window.dispatchEvent(
      new ErrorEvent("error", { error: new Error("boom"), message: "boom" }),
    );
    const client = fakeClient();
    attach(mod, client);
    expect(client.calls).toEqual(["exception"]);
  });
});
