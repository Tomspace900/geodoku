import { describe, expect, it } from "vitest";
import { playedBeforeToday } from "../returningPlayer";

describe("playedBeforeToday", () => {
  it("reconnaît un joueur qui a joué un jour passé", () => {
    expect(playedBeforeToday(["2026-11-02", "2026-11-19"], "2026-11-19")).toBe(
      true,
    );
  });

  it("tient pour nouveau un joueur qui n'a joué qu'aujourd'hui, ou jamais", () => {
    expect(playedBeforeToday(["2026-11-19"], "2026-11-19")).toBe(false);
    expect(playedBeforeToday([], "2026-11-19")).toBe(false);
  });
});
