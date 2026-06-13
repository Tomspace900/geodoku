import { describe, expect, it } from "vitest";
import {
  countryPopularity,
  gridEaseScore100,
  gridPopularity,
  popularityScore100,
  topKPopularity,
} from "../popularity";

describe("topKPopularity", () => {
  it("retourne le fallback médiane pour un pool vide ou des codes inconnus", () => {
    expect(topKPopularity([])).toBe(0.5);
    expect(topKPopularity(["XXX", "YYY", "ZZZ"])).toBe(0.5);
  });

  it("ne dépend que des K meilleures solutions : un pays obscur en plus ne change rien", () => {
    const famous = ["FRA", "USA", "GBR"];
    const obscure = ["TUV", "NRU", "PLW"]
      .map((code) => [code, countryPopularity(code)] as const)
      .sort((a, b) => a[1] - b[1])[0][0];
    expect(topKPopularity([...famous, obscure])).toBe(topKPopularity(famous));
  });

  it("classe un pool de pays célèbres au-dessus d'un pool de micro-États", () => {
    expect(topKPopularity(["FRA", "USA", "GBR"])).toBeGreaterThan(
      topKPopularity(["TUV", "NRU", "PLW"]),
    );
  });
});

describe("gridPopularity", () => {
  it("null sans cases, moyenne des topK sinon", () => {
    expect(gridPopularity({})).toBeNull();
    const single = { "0,0": ["FRA", "USA", "GBR"] };
    expect(gridPopularity(single)).toBe(topKPopularity(["FRA", "USA", "GBR"]));
  });
});

describe("gridEaseScore100", () => {
  it("null sans cases, score 0–100 sinon", () => {
    expect(gridEaseScore100({})).toBeNull();
    expect(gridEaseScore100({ "0,0": ["FRA", "USA", "GBR"] })).toBe(
      popularityScore100(topKPopularity(["FRA", "USA", "GBR"])),
    );
  });
});

describe("popularityScore100", () => {
  it("borne et arrondit sur 0–100", () => {
    expect(popularityScore100(0.876)).toBe(88);
    expect(popularityScore100(1.2)).toBe(100);
    expect(popularityScore100(-0.1)).toBe(0);
  });
});
